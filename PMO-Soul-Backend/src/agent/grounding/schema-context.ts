import { classifyField, RedactionReason } from './redaction';

/**
 * What the app knows about its own data — the first and largest part of the grounding pack.
 *
 * This is the moat (plan §1). A general chat model can write SQL; it cannot know that in THIS app
 * a Ticket belongs to a BusinessUnit, that `status` is an enum with exactly five values, or that
 * humans identify a Contact by `email`. That knowledge is free here and expensive everywhere else.
 */

/** The subset of Prisma's DMMF this needs. Declared structurally so the browser host can supply
 *  an equivalent shape without depending on @prisma/client. */
export interface DatamodelField {
  name: string;
  kind: string;
  type: string;
  isList: boolean;
  isRequired: boolean;
  isId?: boolean;
  isUnique?: boolean;
  isReadOnly?: boolean;
  isUpdatedAt?: boolean;
  hasDefaultValue?: boolean;
  default?: unknown;
  relationName?: string;
  relationFromFields?: readonly string[];
  relationToFields?: readonly string[];
  documentation?: string;
}

export interface DatamodelModel {
  name: string;
  dbName?: string | null;
  documentation?: string;
  fields: readonly DatamodelField[];
}

export interface DatamodelEnum {
  name: string;
  documentation?: string;
  values: readonly { name: string }[];
}

export interface Datamodel {
  models: readonly DatamodelModel[];
  enums: readonly DatamodelEnum[];
}

export interface FieldContext {
  name: string;
  /** Prisma type name: `String`, `Int`, `DateTime`, an enum name, or a model name. */
  type: string;
  kind: 'scalar' | 'enum' | 'relation' | 'unsupported';
  required: boolean;
  list: boolean;
  unique: boolean;
  isId: boolean;
  /** True when the database sets it (`@default`, `@updatedAt`) — the agent must not invent one. */
  generated: boolean;
  /** Values are withheld at the boundary. The NAME stays visible on purpose (see redaction.ts). */
  sensitive: boolean;
  redactionReason?: RedactionReason;
  description?: string;
}

export interface RelationContext {
  /** Field on this entity that expresses the relation. */
  field: string;
  target: string;
  /** `one` = this entity points at a single target; `many` = a collection. */
  cardinality: 'one' | 'many';
  /** Local scalar columns holding the foreign key, when this is the owning side. */
  foreignKeys: string[];
}

export interface EntityContext {
  name: string;
  /** Field a human would use to recognise a row — what the agent should show instead of an id. */
  displayField: string;
  idField: string;
  description?: string;
  fields: FieldContext[];
  relations: RelationContext[];
}

export interface EnumContext {
  name: string;
  values: string[];
  description?: string;
}

export interface SchemaContext {
  entities: EntityContext[];
  enums: EnumContext[];
  /** Changes iff the shape changed. Drives cache invalidation (plan §7 Phase 1.5). */
  fingerprint: string;
}

/** Ordered by how likely a human is to use it as the label for a record. */
const DISPLAY_FIELD_PREFERENCE = [
  'name',
  'title',
  'label',
  'subject',
  'displayName',
  'fullName',
  'email',
  'username',
  'slug',
  'code',
  'reference',
];

/** Internal plumbing the agent should not describe as business data. */
const HIDDEN_FIELDS = new Set(['organizationid']);

export interface BuildSchemaContextOptions {
  /** Entities to omit entirely — used to hide framework tables from the model. */
  excludeEntities?: string[];
  /** Keep the tenant discriminator visible. Off by default: it is infrastructure, the tenant
   *  filter is enforced below the agent anyway, and exposing it invites the model to try to
   *  set it. */
  includeInternalFields?: boolean;
}

export function buildSchemaContext(
  datamodel: Datamodel,
  options: BuildSchemaContextOptions = {},
): SchemaContext {
  const excluded = new Set((options.excludeEntities || []).map((name) => name.toLowerCase()));

  const entities = datamodel.models
    .filter((model) => !excluded.has(model.name.toLowerCase()))
    .map((model) => buildEntity(model, options))
    .map((entity) => ({
      ...entity,
      // A relation pointing at an excluded entity would name a table that is nowhere else in the
      // pack — the model would try to traverse it and get a runtime error it cannot diagnose.
      relations: entity.relations.filter((relation) => !excluded.has(relation.target.toLowerCase())),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const referenced = new Set<string>();
  for (const entity of entities) {
    for (const field of entity.fields) {
      if (field.kind === 'enum') referenced.add(field.type);
    }
  }

  // Only enums actually reachable from a visible entity. An unreferenced enum is noise, and
  // noise in the pack is paid for on every single request as tokens.
  const enums = datamodel.enums
    .filter((definition) => referenced.has(definition.name))
    .map((definition) => ({
      name: definition.name,
      values: definition.values.map((value) => value.name),
      description: cleanDoc(definition.documentation),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { entities, enums, fingerprint: fingerprintOf(entities, enums) };
}

function buildEntity(model: DatamodelModel, options: BuildSchemaContextOptions): EntityContext {
  const visible = model.fields.filter((field) => {
    if (options.includeInternalFields) return true;
    return !HIDDEN_FIELDS.has(field.name.toLowerCase());
  });

  const fields: FieldContext[] = visible
    .filter((field) => field.kind !== 'object')
    .map((field) => {
      const classification = classifyField(field.name, field.documentation);
      return {
        name: field.name,
        type: field.type,
        kind: field.kind === 'enum' ? 'enum' : field.kind === 'scalar' ? 'scalar' : 'unsupported',
        required: Boolean(field.isRequired) && !field.isList,
        list: Boolean(field.isList),
        unique: Boolean(field.isUnique),
        isId: Boolean(field.isId),
        generated: Boolean(field.hasDefaultValue) || Boolean(field.isUpdatedAt),
        sensitive: classification.sensitive,
        redactionReason: classification.reason,
        description: cleanDoc(field.documentation),
      } as FieldContext;
    });

  // Foreign keys are reported only when the column itself is in the pack. Listing
  // `organizationId` as a key while hiding the field would have the model reference a column it
  // was never shown.
  const fieldNames = new Set(fields.map((field) => field.name));

  const relations: RelationContext[] = visible
    .filter((field) => field.kind === 'object')
    .map((field) => ({
      field: field.name,
      target: field.type,
      cardinality: field.isList ? ('many' as const) : ('one' as const),
      foreignKeys: (field.relationFromFields || []).filter((key) => fieldNames.has(key)),
    }));

  const idField = fields.find((field) => field.isId)?.name || 'id';

  return {
    name: model.name,
    displayField: pickDisplayField(fields, idField),
    idField,
    description: cleanDoc(model.documentation),
    fields,
    relations,
  };
}

/**
 * Picks the field a human uses to recognise a row. Never a sensitive one — `password` is
 * technically a unique-ish string and must not become a record label.
 */
function pickDisplayField(fields: FieldContext[], idField: string): string {
  const candidates = fields.filter(
    (field) => field.kind === 'scalar' && field.type === 'String' && !field.sensitive && !field.list,
  );

  for (const preferred of DISPLAY_FIELD_PREFERENCE) {
    const match = candidates.find((field) => field.name.toLowerCase() === preferred.toLowerCase());
    if (match) return match.name;
  }

  const unique = candidates.find((field) => field.unique && !field.isId);
  if (unique) return unique.name;

  const firstRequired = candidates.find((field) => field.required && !field.isId);
  if (firstRequired) return firstRequired.name;

  return idField;
}

/** Strips Prisma annotations (`@color`, `@sensitive`) so only prose reaches the model. */
function cleanDoc(documentation?: string): string | undefined {
  if (!documentation) return undefined;
  const text = documentation
    .split('\n')
    .map((line) => line.replace(/@[a-z][\w-]*/gi, '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  return text || undefined;
}

/**
 * Cheap FNV-1a over the canonical shape. Not cryptographic and does not need to be — it answers
 * one question: "is this the same schema I built the pack from?" Hand-rolled rather than
 * `node:crypto` so the browser host can run the identical file.
 */
export function fingerprintOf(entities: EntityContext[], enums: EnumContext[]): string {
  const canonical = [
    ...entities.map(
      (entity) =>
        `${entity.name}(${entity.fields
          .map((field) => `${field.name}:${field.type}${field.required ? '!' : ''}${field.list ? '[]' : ''}`)
          .join(',')})->${entity.relations.map((relation) => `${relation.field}:${relation.target}`).join(',')}`,
    ),
    ...enums.map((definition) => `${definition.name}{${definition.values.join(',')}}`),
  ].join('|');

  return hash32(canonical);
}

export function hash32(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
