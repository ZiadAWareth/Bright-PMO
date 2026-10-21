import { AgentTool, AgentToolContext, AgentToolResult, fail, ok } from '../tool.contract';
import { PulseRepository } from '../../workflow/pulses/core';
import { RedactionPolicy, redactRecords } from '../grounding';

/** Rows per call. A model asked for "the tickets" will happily try to read the whole table, and
 *  the cost of that lands on the customer's token bill, not ours. */
const DEFAULT_TAKE = 20;
const MAX_TAKE = 100;

/** Declared once so the schema the model is shown and the check it is held to cannot drift apart. */
const OPERATIONS = ['find', 'count', 'groupBy', 'aggregate'];

export interface QueryToolDeps {
  /** Same port the workflow engine uses, so this tool runs on either host. */
  repo: (entity: string) => PulseRepository;
  redaction: RedactionPolicy;
}

export const QUERY_TOOL_PARAMETERS = {
  type: 'object',
  properties: {
    entity: { type: 'string', description: 'Entity to read, exactly as named by describe_app.' },
    operation: {
      type: 'string',
      enum: OPERATIONS,
      description:
        'find returns rows; count returns a number; groupBy buckets rows by one or more fields ' +
        'and folds each bucket; aggregate folds the whole filtered set into one result. ' +
        'For a total or an average use aggregate with sum/avg — never fetch rows with find and ' +
        'do the arithmetic yourself.',
    },
    where: {
      type: 'object',
      description:
        'Prisma-style filter, e.g. { "status": "OPEN" } or ' +
        '{ "createdAt": { "gte": "2026-01-01" } }. Operators: equals, not, gt, gte, lt, lte, ' +
        'contains, startsWith, endsWith, in.',
      additionalProperties: true,
    },
    select: { type: 'array', items: { type: 'string' }, description: 'Fields to return. Defaults to all readable fields.' },
    orderBy: { type: 'object', description: 'e.g. { "createdAt": "desc" }.', additionalProperties: true },
    take: { type: 'integer', description: `Max rows (default ${DEFAULT_TAKE}, max ${MAX_TAKE}).` },
    skip: { type: 'integer', description: 'Rows to skip, for paging.' },
    by: { type: 'array', items: { type: 'string' }, description: 'groupBy only: fields to bucket by.' },
    count: { type: 'boolean', description: 'Include a row count. Defaults to true for groupBy and aggregate.' },
    sum: { type: 'array', items: { type: 'string' }, description: 'Numeric fields to total.' },
    avg: { type: 'array', items: { type: 'string' }, description: 'Numeric fields to average.' },
    min: { type: 'array', items: { type: 'string' }, description: 'Fields to take the minimum of.' },
    max: { type: 'array', items: { type: 'string' }, description: 'Fields to take the maximum of.' },
  },
  required: ['entity'],
  additionalProperties: false,
};

type Args = Record<string, unknown>;

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

/** Prisma wants `{ amount: true }`; models are far more reliable at producing `["amount"]`. */
function toFieldMap(fields: string[]): Record<string, boolean> | undefined {
  if (!fields.length) return undefined;
  const out: Record<string, boolean> = {};
  for (const field of fields) out[field] = true;
  return out;
}

/**
 * `2026-09-01` is what a model writes for a date, and it is the form this tool's own `where`
 * examples show — but Prisma rejects it outright ("premature end of input. Expected ISO-8601
 * DateTime"). Widening a bare date to the start of that UTC day makes the documented form work
 * instead of failing on a technicality the model cannot diagnose from the error.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function widenDates(value: unknown): unknown {
  if (typeof value === 'string' && DATE_ONLY.test(value)) return `${value}T00:00:00.000Z`;
  if (Array.isArray(value)) return value.map(widenDates);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = widenDates(inner);
    }
    return out;
  }
  return value;
}

/** Rewrites only the branches that sit under a DateTime field, so a string that happens to look
 *  like a date in a text column is left exactly as the model wrote it. */
function coerceDateFilters(
  where: unknown,
  isDateField: (name: string) => boolean,
  depth = 0,
): unknown {
  if (!where || typeof where !== 'object' || depth > 5) return where;
  if (Array.isArray(where)) return where.map((branch) => coerceDateFilters(branch, isDateField, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      out[key] = coerceDateFilters(value, isDateField, depth + 1);
    } else {
      out[key] = isDateField(key) ? widenDates(value) : value;
    }
  }
  return out;
}

/**
 * Puts empty values at the BOTTOM of a sort instead of the top.
 *
 * Postgres orders NULLs first on a descending sort, so `orderBy: { estimatedHours: 'desc' }` answers
 * "which ticket will take longest?" with a ticket that has no estimate at all. Found at the 2.12
 * feedback gate, and it is not a one-off: it breaks every "highest", "longest" or "top N" question
 * asked about an optional field, which is most of them.
 *
 * Only NULLABLE columns accept the `{ sort, nulls }` form — Prisma rejects it on a required field
 * with "Expected SortOrder, provided Object" — so the rewrite is decided per field from what the
 * grounding pack already records about each one. Applied to ascending sorts too: Postgres already
 * puts NULLs last there, and saying so explicitly keeps the behaviour the same if the underlying
 * database ever changes.
 */
function orderNullsLast(
  orderBy: Record<string, unknown> | undefined,
  isNullable: (name: string) => boolean,
): Record<string, unknown> | undefined {
  if (!orderBy) return undefined;
  const out: Record<string, unknown> = {};
  for (const [field, direction] of Object.entries(orderBy)) {
    // Only the bare 'asc' / 'desc' shorthand is touched. Anything else is a relation sort or an
    // object the caller already spelled out in full, and rewriting that would break it.
    out[field] =
      (direction === 'asc' || direction === 'desc') && isNullable(field)
        ? { sort: direction, nulls: 'last' }
        : direction;
  }
  return out;
}

/**
 * Prisma prefixes validation errors with a code frame quoting OUR source file, then puts the one
 * actionable sentence last. Handed back whole it is worse than useless: the model reads the frame,
 * cannot act on it, retries the identical call, and the internal file path is now in the answer.
 */
function explainDbError(message: string): string {
  const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);
  const reasons = lines.filter(
    (line) =>
      line.startsWith('Input error') ||
      line.startsWith('Invalid value') ||
      line.startsWith('Unknown arg') ||
      line.startsWith('Argument'),
  );
  return reasons.length ? reasons.join(' ') : lines[lines.length - 1] || message;
}

/**
 * Collects every field name the arguments mention, so they can all be validated in one pass
 * before anything is executed. A partially-validated query that fails halfway is worse than one
 * that is refused: the model cannot tell which half ran.
 */
function referencedFields(where: unknown, depth = 0): string[] {
  if (!where || typeof where !== 'object' || depth > 5) return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      const branches = Array.isArray(value) ? value : [value];
      for (const branch of branches) out.push(...referencedFields(branch, depth + 1));
      continue;
    }
    out.push(key);
  }
  return out;
}

/** Filter operators keep whatever field they sit under; anything else names a new field. */
const FILTER_OPERATORS = new Set([
  'equals', 'not', 'in', 'notIn', 'lt', 'lte', 'gt', 'gte',
  'contains', 'startsWith', 'endsWith', 'mode',
]);

/**
 * Gathers every literal string compared against each field in a `where`.
 *
 * Exists so an enum value that does not exist can be refused with a message that actually helps.
 * See the call site for why that matters far more than it sounds.
 */
function collectComparisons(
  where: unknown,
  out: Map<string, Set<string>>,
  field?: string,
  depth = 0,
): void {
  if (where === null || where === undefined || depth > 5) return;

  if (typeof where === 'string') {
    if (field) {
      if (!out.has(field)) out.set(field, new Set());
      out.get(field)!.add(where);
    }
    return;
  }
  if (Array.isArray(where)) {
    for (const branch of where) collectComparisons(branch, out, field, depth + 1);
    return;
  }
  if (typeof where !== 'object') return;

  for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      // A new branch, so the field context resets rather than leaking in from outside.
      collectComparisons(value, out, undefined, depth + 1);
      continue;
    }
    collectComparisons(value, out, FILTER_OPERATORS.has(key) ? field : key, depth + 1);
  }
}

export function createQueryTool(deps: QueryToolDeps): AgentTool {
  return {
    name: 'query_data',
    description:
      'Read this app\'s data. Use describe_app first to learn the exact entity and field names — ' +
      'this tool refuses names it has not been shown. Prefer count, groupBy or aggregate over ' +
      'fetching rows when the question is about totals: they are faster and far cheaper than ' +
      'reading records and adding them up yourself. ' +
      // Without this the model filters a foreign key by a person's name, which cannot match and
      // costs several paid round-trips to recover from. Stated here rather than in the system
      // prompt because it is advice about building a "where", and this is where that is read.
      'To filter by a related record you only know by name, do it in two steps: query the target ' +
      'entity to find its id, then filter on the foreign-key field that describe_app marks with ' +
      '"references". Foreign keys hold ids, never names.',
    parameters: QUERY_TOOL_PARAMETERS,
    trust: 'read',
    contentTrust: 'internal',

    async execute(args: Args, ctx: AgentToolContext): Promise<AgentToolResult> {
      const entityName = typeof args.entity === 'string' ? args.entity.trim() : '';
      if (!entityName) return fail('An entity name is required.');

      // The pack is already permission-filtered, so absence here means either "no such entity"
      // or "not yours" — and the model must not be able to tell those apart.
      const entity = ctx.grounding.schema.entities.find(
        (candidate) => candidate.name.toLowerCase() === entityName.toLowerCase(),
      );
      if (!entity) {
        return fail(
          // The readable names, so a guess ("Role") corrects itself in one step. The pack is already
          // permission-filtered: this lists nothing describe_app would not.
          `There is no readable entity called "${entityName}". Readable: ${ctx.grounding.schema.entities.map((e) => e.name).join(', ') || 'none'}.`,
        );
      }

      const byName = new Map(entity.fields.map((field) => [field.name.toLowerCase(), field]));

      // Checked, not trusted. The `enum` in the JSON schema is a hint to the model, not a
      // guarantee, and the previous default-to-'find' turned every typo into a silent row dump:
      // the 2.12 gate saw `operation: "average"` fall through to findMany, return 15 whole
      // tickets, and get averaged in the model's head — 5.30, 5.50, 5.68 and 6.25 on four runs of
      // the same question, each one reported with total confidence and a Sources line that said
      // "Ticket (15 rows)". An unknown operation has to be an error; guessing at one is how you
      // get arithmetic done by a language model without anybody asking for it.
      const operation = typeof args.operation === 'string' ? args.operation : 'find';
      if (!OPERATIONS.includes(operation)) {
        return fail(
          `"${operation}" is not an operation. Use one of: ${OPERATIONS.join(', ')}. ` +
            `To average or total a field, use operation "aggregate" with ` +
            `{ "avg": ["fieldName"] } or { "sum": ["fieldName"] } — do not fetch the rows and ` +
            `work it out yourself.`,
        );
      }
      const select = asStringArray(args.select);
      const by = asStringArray(args.by);
      const sum = asStringArray(args.sum);
      const avg = asStringArray(args.avg);
      const min = asStringArray(args.min);
      const max = asStringArray(args.max);
      const orderBy = (args.orderBy ?? undefined) as Record<string, unknown> | undefined;

      const mentioned = [
        ...select,
        ...by,
        ...sum,
        ...avg,
        ...min,
        ...max,
        ...Object.keys(orderBy ?? {}),
        ...referencedFields(args.where),
      ];

      for (const name of mentioned) {
        const field = byName.get(name.toLowerCase());
        if (!field) {
          // Listing the real names is what makes this recoverable in one step. Told only that
          // the field was wrong, a model guesses again — observed in testing as three more calls
          // and a slide into nonsense (`select: ["id","id"]`) before giving up. The names are
          // already permission-filtered by the pack, so this leaks nothing describe_app would not.
          const readable = entity.fields
            .filter((candidate) => !candidate.sensitive && !deps.redaction.isSensitive(entity.name, candidate.name))
            .map((candidate) => candidate.name);
          return fail(
            `"${entity.name}" has no field called "${name}". Its fields are: ${readable.join(', ')}.`,
          );
        }
        // A withheld field cannot be filtered on either. Returning nothing but allowing
        // `where: { password: { startsWith: 'a' } }` would let the value be read one character
        // at a time — redaction that only covers the output is not redaction.
        if (field.sensitive || deps.redaction.isSensitive(entity.name, field.name)) {
          return fail(`"${entity.name}.${field.name}" is withheld and cannot be read or filtered on.`);
        }
      }

      /**
       * Refuse enum values this app does not have, and say what it does have.
       *
       * This is the fix for the worst finding of the 2.12 gate, and it lives here rather than in
       * the system prompt because this is the exact instant the mistake is made. Asked about
       * "refunds", the model filtered on status REFUNDED; Prisma answered "Invalid value for
       * argument `status`. Expected Status." — true, unhelpful, and silent about what IS allowed.
       * The model then looked up the enum, saw CLOSED, decided that was near enough, and reported
       * "0 refunds processed". A confident number about data this app does not hold.
       *
       * Prompt text alone did not stop it: an instruction competing with a plausible-looking
       * substitution loses. An error at the point of the substitution does not, because there is
       * no answer to return until the model deals with it.
       *
       * The same message closes the other half of the gate. "Unresolved" is not an enum value
       * either, and the model had been picking the single nearest one (OPEN) and quietly dropping
       * IN_PROGRESS — answering 1 where the truth was 3. So the message says both things: the
       * concept may be absent entirely, or it may span several values.
       */
      const enumValues = new Map(
        (ctx.grounding.schema.enums ?? []).map((definition) => [definition.name, definition.values]),
      );
      const comparisons = new Map<string, Set<string>>();
      collectComparisons(args.where, comparisons);

      for (const [fieldName, used] of comparisons) {
        const field = byName.get(fieldName.toLowerCase());
        if (!field || field.kind !== 'enum') continue;
        const allowed = enumValues.get(field.type);
        if (!allowed?.length) continue;

        const unknown = [...used].filter((value) => !allowed.includes(value));
        if (!unknown.length) continue;

        // Two very different mistakes arrive here and the message has to separate them, because
        // the first draft did not and the model picked whichever reading let it keep answering.
        //
        //   "UNRESOLVED" — a plain-English word for a state these values already express. The
        //   right move is to widen to { in: [OPEN, IN_PROGRESS] }.
        //   "REFUNDED"   — a concept the app has no notion of. The right move is to stop.
        //
        // Given only the `in` hint, the gate saw it take that hint for refunds too: it declined
        // and THEN counted CLOSED + RESOLVED and called them "2 processed". So the hint is now
        // stated as a test the model applies, not as an escape hatch it may always reach for.
        return fail(
          `"${entity.name}.${field.name}" has no value ${unknown.map((value) => `"${value}"`).join(', ')}. ` +
            `The only values it can have are: ${allowed.join(', ')}. ` +
            `Decide which of these two you are in, and do not do both:\n` +
            `1. Your word is ordinary English for a state these values already cover — "unresolved" ` +
            `means OPEN or IN_PROGRESS, "done" means RESOLVED or CLOSED. Retry with ` +
            `{ "in": [...] } listing them, and name the values you chose in your answer.\n` +
            `2. Your word names something this app has no notion of at all — a refund, an invoice, ` +
            `a subscription. Then the answer is that this app does not record it. Say exactly that ` +
            `and stop. Do not retry with other values, do not report a count of anything else, and ` +
            `do not offer a near-miss total as though it were what was asked for.`,
        );
      }

      const isDateField = (name: string): boolean =>
        byName.get(name.toLowerCase())?.type === 'DateTime';
      // `=== false` rather than `!required`: an unknown field yields undefined, and treating that
      // as nullable would send Prisma the object form it rejects on a required column.
      const isNullableField = (name: string): boolean =>
        byName.get(name.toLowerCase())?.required === false;
      const where = (
        args.where ? coerceDateFilters(args.where, isDateField) : undefined
      ) as Record<string, unknown> | undefined;
      const requestedTake = typeof args.take === 'number' ? args.take : DEFAULT_TAKE;
      const take = Math.max(1, Math.min(MAX_TAKE, requestedTake));
      const skip = typeof args.skip === 'number' && args.skip > 0 ? args.skip : undefined;
      const wantCount = args.count !== false;

      const repo = deps.repo(entity.name);

      try {
        if (operation === 'count') {
          const total = await repo.count({ where });
          return ok({ entity: entity.name, count: total }, `${total} ${entity.name} records.`, [
            { entity: entity.name, rows: total },
          ]);
        }

        if (operation === 'groupBy') {
          if (!by.length) return fail('groupBy needs at least one field in "by".');
          // `take` on a groupBy makes Prisma page by an implicit cursor, and it then demands an
          // orderBy containing `id` — which is never in `by` for a real grouping question. The
          // effect was that EVERY groupBy failed. Ordering by the first grouped field satisfies
          // the rule (orderBy may only name by-fields) and keeps the row cap meaningful.
          const groups = await repo.groupBy({
            by,
            where,
            ...(wantCount ? { _count: true } : {}),
            ...(toFieldMap(sum) ? { _sum: toFieldMap(sum) } : {}),
            ...(toFieldMap(avg) ? { _avg: toFieldMap(avg) } : {}),
            ...(toFieldMap(min) ? { _min: toFieldMap(min) } : {}),
            ...(toFieldMap(max) ? { _max: toFieldMap(max) } : {}),
            orderBy: orderBy ?? { [by[0]]: 'asc' },
            take,
          });
          return ok(
            { entity: entity.name, by, groups },
            `${groups.length} groups of ${entity.name} by ${by.join(', ')}.`,
            // Groups, not underlying rows. Reporting the row count would mean a second COUNT
            // query purely to decorate a label, and the number the answer is built from is the
            // number of groups. `unit` is what makes the Sources line say "4 groups" rather than
            // "4 rows", which read as though only 4 records had been looked at.
            [{ entity: entity.name, rows: groups.length, unit: 'group' }],
          );
        }

        if (operation === 'aggregate') {
          // Asking for `_count: { field: true }` alongside `_all` makes Prisma return the
          // NON-NULL count per measured field as well as the row count.
          //
          // The 2.12 gate caught the alternative doing real damage: `_count: true` reported 15,
          // `_sum.estimatedHours` reported 79.5 over the 14 rows that have a value, and the model
          // divided one by the other and answered 5.30 instead of 5.68. It was not wrong to do
          // arithmetic it was handed; it was handed a numerator and a denominator that do not
          // describe the same set of rows. Telling it in the prompt to prefer `avg` does not fix
          // that — supplying the denominator that matches does.
          const measured = [...new Set([...sum, ...avg])];
          const countSelector = measured.length
            ? { _all: true, ...Object.fromEntries(measured.map((field) => [field, true])) }
            : true;

          const result: any = await repo.aggregate({
            where,
            ...(wantCount || measured.length ? { _count: countSelector } : {}),
            ...(toFieldMap(sum) ? { _sum: toFieldMap(sum) } : {}),
            ...(toFieldMap(avg) ? { _avg: toFieldMap(avg) } : {}),
            ...(toFieldMap(min) ? { _min: toFieldMap(min) } : {}),
            ...(toFieldMap(max) ? { _max: toFieldMap(max) } : {}),
          });

          // Said out loud rather than left to be inferred from two numbers in the payload. A gap
          // between "rows matched" and "rows that have this field" is the whole trap, and it is
          // invisible unless someone compares them on purpose.
          const total = typeof result?._count?._all === 'number' ? result._count._all : undefined;
          const notes = measured.flatMap((field) => {
            const present = result?._count?.[field];
            if (typeof present !== 'number' || total === undefined || present === total) return [];
            return [
              `${entity.name}.${field} is empty on ${total - present} of the ${total} matching records. ` +
                `Its sum and average cover only the ${present} that have a value — divide by ${present}, never by ${total}.`,
            ];
          });

          // No row count in `sources`: an aggregate returns one summary row over an unknown number
          // of records. Reporting "1 row" would be true and useless. The entity alone is honest.
          return ok(
            { entity: entity.name, result, ...(notes.length ? { notes } : {}) },
            `Aggregated ${entity.name}.`,
            [{ entity: entity.name }],
          );
        }

        const rows = await repo.findMany({
          where,
          // Not applied to the groupBy above: its ordering may only name grouped fields, it
          // defaults to ascending where Postgres already puts nulls last, and the observed defect
          // was here. Leaving a working path alone beats making two paths consistent.
          ...(orderBy ? { orderBy: orderNullsLast(orderBy, isNullableField) } : {}),
          take,
          ...(skip !== undefined ? { skip } : {}),
          ...(select.length ? { select: toFieldMap(select) } : {}),
        });

        // Belt and braces. The field check above already refuses to SELECT a withheld column,
        // but a bare findMany returns whatever the table has — including a column added after
        // this process booted, which the pack does not know about.
        const safe = redactRecords(entity.name, rows, deps.redaction);

        return ok(
          {
            entity: entity.name,
            displayField: entity.displayField,
            rows: safe,
            // Said explicitly so the model reports "showing the first 20" instead of implying
            // that 20 is the total.
            truncated: safe.length === take,
          },
          `${safe.length} ${entity.name} records${safe.length === take ? ' (truncated)' : ''}.`,
          // The rows the answer was actually built from, after redaction — not the rows the
          // table holds. If the result was truncated this is the smaller, true number.
          [{ entity: entity.name, rows: safe.length }],
        );
      } catch (err) {
        // A rejected query is usually the model's filter being wrong — an operator the host does
        // not support, a value of the wrong type. Handing the message back lets it try again;
        // throwing would end the run over a fixable mistake.
        return fail(`The query could not be run: ${explainDbError((err as Error).message)}`);
      }
    },
  };
}
