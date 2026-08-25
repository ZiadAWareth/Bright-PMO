/** Shapes exchanged with the `/api/reporting/*` proxy routes. */

export interface ReportColumn {
  name: string;
  type: string;
}

export interface TableRelationship {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  relationshipName?: string;
}

export type StepKey = "select-table" | "configure-columns" | "generate";

export const STEPS: { key: StepKey; label: string; description: string }[] = [
  {
    key: "select-table",
    label: "Select table",
    description: "Choose the primary data source",
  },
  {
    key: "configure-columns",
    label: "Configure columns",
    description: "Columns, joins & filters",
  },
  {
    key: "generate",
    label: "Generate",
    description: "Export to PDF or Excel",
  },
];

/** Connection state reported by the engine's `test-connection` probe. */
export type ConnectionState =
  | { status: "checking" }
  | { status: "ok" }
  | { status: "failed"; message: string };

/**
 * The engine returns columns in several shapes depending on version — bare
 * strings, `{columnName,dataType}`, or `{name,type}`. Normalise once here so no
 * component has to care.
 */
export function normaliseColumns(raw: unknown): ReportColumn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): ReportColumn | null => {
      if (typeof entry === "string") return { name: entry, type: "" };
      if (entry && typeof entry === "object") {
        const c = entry as Record<string, unknown>;
        const name = c.columnName ?? c.name ?? c.column_name;
        if (typeof name !== "string" || name.length === 0) return null;
        const type = c.dataType ?? c.type ?? c.data_type;
        return { name, type: typeof type === "string" ? type : "" };
      }
      return null;
    })
    .filter((c): c is ReportColumn => c !== null);
}
