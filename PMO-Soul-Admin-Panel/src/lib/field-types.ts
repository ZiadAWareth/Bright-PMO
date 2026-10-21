import type { ZodTypeAny } from 'zod';

export type FieldKind =
  | 'text'
  | 'email'
  | 'url'
  | 'password'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'datetime'
  // A calendar day / a time of day: DateTime columns whose editor token was DATE / TIME.
  | 'date'
  | 'time'
  // Exact numbers travel as numeric strings (see the backend's main.ts); never coerced to float.
  | 'decimal'
  | 'bigint'
  // Raw bytes as base64: a small file picker in, a size + download out.
  | 'bytes'
  | 'enum'
  | 'json'
  | 'color'
  | 'file'
  // A running number the app assigns on create (INV-0007), per organization: shown, never edited.
  | 'autonumber'
  | 'relation';

/** Foreign-key dropdown metadata: which resource to fetch options from,
 *  which field to show as the label, and which field is the option value. */
export interface RelationConfig {
  resource: string;
  displayField: string;
  refField: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  kind: FieldKind;
  optional: boolean;
  /** A list column (`String[]`, `Int[]`…): `kind` is the element's kind; edited one per line. */
  list?: boolean;
  options?: string[];
  relation?: RelationConfig;
  /** Shown on the record's page, never an input: the app sets it (an auto number). */
  readOnly?: boolean;
}

export interface ColumnConfig {
  name: string;
  label: string;
  kind: FieldKind;
  list?: boolean;
  relation?: RelationConfig;
}

/** A model's view configuration consumed by the generic resource engine. */
export interface ResourceConfig {
  resource: string;
  /** Frontend route base (e.g. "/usermanagement/organization" for a module, or
   *  "/organization"). Falls back to "/<resource>" when absent. The API path is
   *  always /api/<resource> regardless. */
  routeBase?: string;
  label: string;
  labelPlural: string;
  /**
   * A table the customer designed: its records belong to organizations, so the platform
   * administrator can browse them but not add them (the API refuses it too).
   */
  organizationOwned?: boolean;
  // Strongly typed per model in its config.ts; treated dynamically by the
  // generic engine components.
  hooks: any;
  fields: FieldConfig[];
  columns: ColumnConfig[];
  schema: ZodTypeAny;
  defaultValues: Record<string, unknown>;
  /**
   * This resource holds LOGINS, so people are invited rather than given a password.
   *
   * Set only on the app's user model. It turns three things on: the password field is gone from the
   * form (an administrator must not be typing somebody else's password), creating a record sends an
   * invitation, and the list shows who still cannot sign in with a button to invite them again.
   */
  invites?: boolean;
}
