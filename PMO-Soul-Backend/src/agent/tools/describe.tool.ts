import { AgentTool, AgentToolContext, AgentToolResult, fail, ok } from '../tool.contract';

/**
 * Deliberately ONE optional argument. Every extra parameter is another thing the model can get
 * wrong, and a type discriminator ('entity' | 'enum' | 'workflow') buys nothing here: names do
 * not collide in practice, and when they do, returning both is more useful than making the
 * model guess which kind it wanted.
 */
export const DESCRIBE_TOOL_PARAMETERS = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description:
        'Name of an entity, enum or workflow to describe. Omit to list everything available.',
    },
  },
  required: [] as string[],
  additionalProperties: false,
};

/** `{ userId: 'User' }` — only the scalars that are foreign keys, and what they point at. */
function referenceMap(entity: any): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const relation of entity.relations ?? []) {
    for (const key of relation.foreignKeys ?? []) out[key] = relation.target;
  }
  return Object.keys(out).length ? out : undefined;
}

function overview(ctx: AgentToolContext) {
  const { grounding } = ctx;
  return {
    app: grounding.appName,
    entities: grounding.schema.entities.map((entity) => ({
      name: entity.name,
      describedAs: entity.description,
      /**
       * Names only — no types, no descriptions, no enum values. Those still need a per-entity
       * call, which is what keeps this index small.
       *
       * This used to be a bare `fieldCount`, on the theory that an index should be enough to
       * CHOOSE an entity and no more. Measured, that was the wrong trade: models do not drill
       * down, they guess. One run invented `assignedTo`, then `assignedToId`, before finding
       * `userId`. The economics are lopsided — field names cost a few hundred tokens ONCE,
       * while every wrong guess costs a full replay of the whole conversation, which by the
       * sixth round-trip was over a thousand tokens each time.
       */
      fields: entity.fields.map((field: any) => field.name),
      // Without this a model reads `userId` as some number and filters it by a person's name.
      references: referenceMap(entity),
    })),
    enums: grounding.schema.enums.map((definition) => definition.name),
    workflows: grounding.workflows.workflows.map((workflow) => ({
      name: workflow.name,
      entity: workflow.entity,
      status: workflow.status,
    })),
    // Stated rather than hidden, so the model can say "you may not have access to everything"
    // instead of asserting that the app has nothing else in it.
    hiddenByPermissionCount: grounding.hiddenByPermissionCount,
    redactedFieldCount: grounding.redactedFields.length,
  };
}

function describeEntity(entity: any) {
  return {
    kind: 'entity',
    name: entity.name,
    describedAs: entity.description,
    idField: entity.idField,
    /** What to show a human instead of an id. */
    displayField: entity.displayField,
    fields: entity.fields.map((field: any) => ({
      name: field.name,
      type: field.type,
      kind: field.kind,
      required: field.required,
      list: field.list,
      unique: field.unique,
      // Generated fields are called out because the common model failure is inventing an id or
      // a createdAt on write.
      generated: field.generated,
      // The name is shown, the values never are. Telling the model the field exists but is
      // withheld is better than hiding it: otherwise it reports the field as missing.
      valuesWithheld: field.sensitive || undefined,
      describedAs: field.description,
    })),
    // Same shape and same meaning as in the index, so nothing has to be re-learned here.
    references: referenceMap(entity),
    relations: entity.relations.map((relation: any) => ({
      field: relation.field,
      target: relation.target,
      cardinality: relation.cardinality,
      foreignKeys: relation.foreignKeys,
    })),
  };
}

/** Levenshtein-free near match: good enough to catch a plural, a case slip or a typo. */
function suggest(name: string, candidates: string[]): string[] {
  const needle = name.toLowerCase();
  return candidates
    .filter((candidate) => {
      const other = candidate.toLowerCase();
      return other.includes(needle) || needle.includes(other);
    })
    .slice(0, 5);
}

export const describeTool: AgentTool = {
  name: 'describe_app',
  description:
    'Look up what this app contains. Call with no arguments to get every entity with its field ' +
    'names, plus the enums and active workflows — that alone is enough to build most queries. ' +
    'Call with a name for the details of one entity: field types, which are required or ' +
    'generated, and the allowed values of an enum. Always use this before querying data you ' +
    'have not been shown, rather than guessing entity or field names. A "references" map means ' +
    'those fields hold the id of a record in another entity, never its name.',
  parameters: DESCRIBE_TOOL_PARAMETERS,
  trust: 'read',
  contentTrust: 'internal',

  async execute(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
    const raw = args?.name;
    const name = typeof raw === 'string' ? raw.trim() : '';

    if (!name) {
      const view = overview(ctx);
      return ok(
        view,
        `${view.entities.length} entities, ${view.enums.length} enums, ${view.workflows.length} active workflows.`,
      );
    }

    const needle = name.toLowerCase();
    const { schema, workflows } = ctx.grounding;

    const entity = schema.entities.find((candidate) => candidate.name.toLowerCase() === needle);
    if (entity) {
      return ok(describeEntity(entity), `${entity.name}: ${entity.fields.length} fields.`);
    }

    const enumDef = schema.enums.find((candidate) => candidate.name.toLowerCase() === needle);
    if (enumDef) {
      return ok(
        { kind: 'enum', name: enumDef.name, values: enumDef.values, describedAs: enumDef.description },
        `${enumDef.name}: ${enumDef.values.join(', ')}`,
      );
    }

    const workflow = workflows.workflows.find(
      (candidate) => candidate.name.toLowerCase() === needle,
    );
    if (workflow) {
      return ok(
        {
          kind: 'workflow',
          name: workflow.name,
          describedAs: workflow.description,
          entity: workflow.entity,
          status: workflow.status,
          triggers: workflow.triggers,
          steps: workflow.steps,
          transitions: workflow.transitions,
        },
        `Workflow "${workflow.name}" on ${workflow.entity || 'no entity'} (${workflow.status}).`,
      );
    }

    const near = suggest(name, [
      ...schema.entities.map((candidate) => candidate.name),
      ...schema.enums.map((candidate) => candidate.name),
      ...workflows.workflows.map((candidate) => candidate.name),
    ]);

    return fail(
      near.length
        ? `Nothing here is called "${name}". Did you mean: ${near.join(', ')}?`
        : `Nothing here is called "${name}". Call describe_app with no arguments to see what exists.`,
    );
  },
};
