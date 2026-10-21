import { AgentTool, AgentToolContext, AgentToolResult, fail, ok } from '../tool.contract';
import { PulseRepository } from '../../workflow/pulses/core';
import { RedactionPolicy } from '../grounding';

/** One database round-trip per bucket, so this is also the cap on queries per call. */
const MAX_PERIODS = 36;
const DEFAULT_PERIODS = 12;
/** Below this there is no distribution to speak of, and a "z-score" is just noise with a name. */
const MIN_SAMPLES_FOR_ANOMALY = 4;
const ANOMALY_Z = 2;
/** Declared once so the schema the model is shown and the checks below cannot drift apart. */
const METRICS = ['count', 'sum', 'avg', 'min', 'max'];
const BUCKETS = ['day', 'week', 'month'];

export interface MetricsToolDeps {
  repo: (entity: string) => PulseRepository;
  redaction: RedactionPolicy;
}

export const METRICS_TOOL_PARAMETERS = {
  type: 'object',
  properties: {
    entity: { type: 'string', description: 'Entity to measure, exactly as named by describe_app.' },
    dateField: {
      type: 'string',
      description: 'DateTime field to bucket by, e.g. createdAt.',
    },
    metric: {
      type: 'string',
      enum: METRICS,
      description: 'What to measure in each bucket. Defaults to count.',
    },
    field: {
      type: 'string',
      description: 'Numeric field to sum/average/etc. Required unless metric is count.',
    },
    bucket: {
      type: 'string',
      enum: BUCKETS,
      description: 'Size of each period. Defaults to month.',
    },
    periods: {
      type: 'integer',
      description: `How many periods back, including the current one (default ${DEFAULT_PERIODS}, max ${MAX_PERIODS}).`,
    },
    where: {
      type: 'object',
      description: 'Optional filter applied to every period, e.g. { "status": "OPEN" }.',
      additionalProperties: true,
    },
    movingAverageWindow: {
      type: 'integer',
      description: 'Periods in the trailing average. Defaults to 3.',
    },
  },
  required: ['entity', 'dateField'],
  additionalProperties: false,
};

/**
 * Bucket boundaries are calendar-aligned in UTC, not "the last 30 days" rolling.
 *
 * People ask about months and weeks, not about 720-hour windows, and an unaligned bucket makes
 * every comparison slightly wrong in a way nobody can see. UTC rather than local time because the
 * server's timezone is an accident of deployment and must not change the numbers.
 */
function startOfBucket(at: Date, bucket: string): Date {
  const day = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  if (bucket === 'month') return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
  if (bucket === 'week') {
    // ISO weeks start Monday; getUTCDay() calls Sunday 0.
    const offset = (day.getUTCDay() + 6) % 7;
    return new Date(day.getTime() - offset * 86400000);
  }
  return day;
}

/** Safe as millisecond arithmetic for day/week because UTC has no daylight saving. */
function shiftBuckets(from: Date, bucket: string, count: number): Date {
  if (bucket === 'month') {
    return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + count, 1));
  }
  return new Date(from.getTime() + count * (bucket === 'week' ? 7 : 1) * 86400000);
}

/** Floating-point sums produce 0.30000000000000004, which a model will faithfully repeat. */
function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[], mean: number): number {
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

export function createMetricsTool(deps: MetricsToolDeps): AgentTool {
  return {
    name: 'analyze_metric',
    description:
      'Measure how something changes over time, with the arithmetic done in code rather than ' +
      'estimated. Give an entity and a date field; it buckets by day, week or month and returns ' +
      'the whole series at once, plus the change from the previous period, a trailing moving ' +
      'average, and any periods that are statistical outliers. Use this for any question about ' +
      'trends, growth, "compared to last month", or unusual activity — never add up rows from ' +
      'query_data yourself. The newest period is usually incomplete and is marked "partial": say ' +
      'so when you report it.',
    parameters: METRICS_TOOL_PARAMETERS,
    trust: 'read',
    contentTrust: 'internal',

    async execute(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const entityName = typeof args.entity === 'string' ? args.entity.trim() : '';
      // Absence from the pack means "no such entity" or "not yours", and those must be
      // indistinguishable — the same rule, and the same wording, as query_data.
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
      // Same choke point as query_data: a withheld column cannot be measured either. Counting
      // rows grouped by a secret still leaks the secret's distribution.
      const resolve = (name: string) => {
        const field = byName.get(name.toLowerCase());
        if (!field) return { error: `"${entity.name}" has no field called "${name}".` };
        if (field.sensitive || deps.redaction.isSensitive(entity.name, field.name)) {
          return { error: `"${entity.name}.${field.name}" is withheld and cannot be measured.` };
        }
        return { field };
      };

      const dateName = typeof args.dateField === 'string' ? args.dateField.trim() : '';
      const dateResolved = resolve(dateName);
      if (dateResolved.error) return fail(dateResolved.error);
      if (dateResolved.field!.type !== 'DateTime') {
        const dates = entity.fields.filter((f) => f.type === 'DateTime').map((f) => f.name);
        return fail(
          `"${entity.name}.${dateName}" is not a date. Date fields here: ${dates.join(', ') || 'none'}.`,
        );
      }
      const dateField = dateResolved.field!.name;

      // Both of these are checked rather than defaulted, because the JSON-schema `enum` is a hint
      // the model is free to ignore and the failure modes here are invisible. An unknown `bucket`
      // — "quarter", "year" — used to fall through startOfBucket to the daily branch, so the tool
      // returned DAILY buckets and the answer called them quarters: no error, no warning, and a
      // chart nobody could tell was wrong. The sibling defect in query_data (`operation:
      // "average"` silently becoming a row dump) is what prompted the audit.
      const metric = typeof args.metric === 'string' ? args.metric : 'count';
      if (!METRICS.includes(metric)) {
        return fail(`"${metric}" is not a metric. Use one of: ${METRICS.join(', ')}.`);
      }
      let valueField = '';
      if (metric !== 'count') {
        const name = typeof args.field === 'string' ? args.field.trim() : '';
        if (!name) return fail(`"${metric}" needs a "field" to measure.`);
        const resolved = resolve(name);
        if (resolved.error) return fail(resolved.error);
        valueField = resolved.field!.name;
      }

      const bucket = typeof args.bucket === 'string' ? args.bucket : 'month';
      if (!BUCKETS.includes(bucket)) {
        return fail(
          `"${bucket}" is not a period size. Use one of: ${BUCKETS.join(', ')}. ` +
            `For anything larger, ask for months and add them up in the answer.`,
        );
      }
      const periods = Math.max(
        2,
        Math.min(MAX_PERIODS, typeof args.periods === 'number' ? args.periods : DEFAULT_PERIODS),
      );
      const window = Math.max(
        2,
        Math.min(periods, typeof args.movingAverageWindow === 'number' ? args.movingAverageWindow : 3),
      );
      const filter = (args.where ?? undefined) as Record<string, unknown> | undefined;

      const now = new Date();
      const currentStart = startOfBucket(now, bucket);
      const edges: Array<{ start: Date; end: Date }> = [];
      for (let index = periods - 1; index >= 0; index -= 1) {
        const start = shiftBuckets(currentStart, bucket, -index);
        edges.push({ start, end: shiftBuckets(start, bucket, 1) });
      }

      const repo = deps.repo(entity.name);

      try {
        // One query per bucket rather than reading rows and grouping them here. Prisma cannot
        // date_trunc through PulseRepository, and pulling a year of rows in order to count them
        // is precisely the cost this tool exists to remove. Capped at MAX_PERIODS queries.
        const values = await Promise.all(
          edges.map(async ({ start, end }) => {
            const where = {
              ...(filter ?? {}),
              [dateField]: { gte: start.toISOString(), lt: end.toISOString() },
            };
            if (metric === 'count') return repo.count({ where });
            const result: any = await repo.aggregate({
              where,
              [`_${metric}`]: { [valueField]: true },
            });
            // No rows in the bucket makes Prisma return null, which is not the same as zero for
            // an average — but for a chart it has to be a number, so it is reported as 0 and the
            // count alongside it is what tells the reader the bucket was empty.
            return Number(result?.[`_${metric}`]?.[valueField] ?? 0);
          }),
        );

        const series = edges.map(({ start }, index) => ({
          period: start.toISOString().slice(0, 10),
          value: round(values[index]),
          // The newest bucket is nearly always mid-flight. Left unmarked, eight days of this
          // month get compared against thirty of last month and the app reports a collapse.
          partial: index === edges.length - 1 || undefined,
        }));

        const complete = series.slice(0, -1);
        const current = series[series.length - 1];
        const previous = complete[complete.length - 1];

        const change = previous
          ? {
              current: current.value,
              previous: previous.value,
              absolute: round(current.value - previous.value),
              // Percentage change from zero is undefined, not infinite. Saying so is better
              // than emitting a number the model will read out as a real growth rate.
              percent:
                previous.value === 0
                  ? null
                  : round(((current.value - previous.value) / Math.abs(previous.value)) * 100),
              direction:
                current.value === previous.value ? 'flat' : current.value > previous.value ? 'up' : 'down',
              currentIsPartial: true,
            }
          : null;

        const movingAverage = series.map((point, index) =>
          index + 1 < window
            ? { period: point.period, value: null }
            : {
                period: point.period,
                value: round(average(series.slice(index + 1 - window, index + 1).map((p) => p.value))),
              },
        );

        // Computed over COMPLETE buckets only. Including the partial one drags the mean down and
        // then flags that same bucket as a low outlier — a false alarm, every single time.
        const sample = complete.map((point) => point.value);
        const mean = sample.length ? average(sample) : 0;
        const deviation = sample.length ? standardDeviation(sample, mean) : 0;
        const enoughData = sample.length >= MIN_SAMPLES_FOR_ANOMALY && deviation > 0;
        const anomalies = enoughData
          ? complete
              .map((point) => ({ ...point, z: round((point.value - mean) / deviation) }))
              .filter((point) => Math.abs(point.z) >= ANOMALY_Z)
          : [];

        const summary =
          change === null
            ? `${entity.name} ${metric} by ${bucket}: ${series.length} periods.`
            : `${entity.name} ${metric} by ${bucket}: ${current.value} this ${bucket} vs ${previous.value} last (partial).`;

        return ok(
          {
            entity: entity.name,
            metric,
            field: valueField || undefined,
            dateField,
            bucket,
            series,
            change,
            movingAverage: { window, points: movingAverage },
            distribution: { mean: round(mean), standardDeviation: round(deviation), completePeriods: sample.length },
            anomalies,
            // Said out loud rather than left for the model to infer from an empty array, which it
            // would otherwise report as "no anomalies found" — a claim the data cannot support.
            notes: [
              `The last period (${current.period}) is still in progress; its value is not comparable to a full one.`,
              ...(enoughData
                ? []
                : [
                    `Not enough complete periods to judge outliers — ${MIN_SAMPLES_FOR_ANOMALY} are needed and there are ${sample.length}. No anomaly claim can be made.`,
                  ]),
            ],
          },
          summary,
          // Periods, not rows: a trend is built from the buckets, and the number of underlying
          // records is not something this tool ever counts. Naming the entity is what makes the
          // Sources line say where the trend came from, and `unit` stops "6 periods" being
          // reported as "6 rows" — six months of tickets is not six tickets.
          [{ entity: entity.name, rows: series.length, unit: 'period' }],
        );
      } catch (err) {
        return fail(`The metric could not be computed: ${(err as Error).message}`);
      }
    },
  };
}
