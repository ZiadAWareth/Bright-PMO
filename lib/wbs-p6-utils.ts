import * as XLSX from 'xlsx';

/**
 * P6 / MS Project style WBS upload: level is a hierarchy string (1, 1.1, 1.1.1),
 * parent is inferred from the level string. Output matches the internal shape
 * used by the existing WBS upload (parent_row_reference, level number, etc.)
 */

export interface P6WBSRow {
  name: string;
  description: string;
  level: number;
  /** Excel/P6 level string (e.g. "1", "1.1", "1.2.1") — used as wbs_code for consistency with upload. */
  level_string: string;
  /** 0-based index of parent in the sorted data array; null for top-level "1" */
  parent_row_index: number | null;
  start_date: string | null;
  end_date: string | null;
  /** Optional weight % from Excel (e.g. 100, 27.48). Parsed from "100.00%" or 100. */
  progress_weight?: number | null;
  /** Optional assigned/planned budget amount for this WBS. */
  assigned_budget?: number | null;
  originalRowIndex: number;
  rowNumber: number; // Excel row (1-based, with header)
}

const P6_SHEET_NAMES = ['P6 WBS', 'WBS', 'WBS Items', 'Sheet1'];

const LEVEL_HEADERS = ['WBS Level', 'Level', 'WBS Code', 'Code'];
const NAME_HEADERS = ['WBS Name', 'Name', 'Title', 'Task Name'];
const DESC_HEADERS = ['Description', 'Desc'];
const START_HEADERS = ['Start Date', 'Start', 'Planned Start'];
const END_HEADERS = ['End Date', 'End', 'Finish', 'Planned End'];
const WEIGHT_HEADERS = ['Weight', 'Weight %', 'Progress Weight', '%', 'WBS Weight'];
const BUDGET_HEADERS = ['Assigned Budget', 'Budget', 'Planned Budget', 'Budget Amount'];

function findHeaderColumn(row: string[], candidates: string[]): number {
  for (let i = 0; i < row.length; i++) {
    const cell = (row[i] ?? '').toString().trim();
    if (candidates.some((h) => cell.toLowerCase().includes(h.toLowerCase()))) return i;
  }
  return -1;
}

/** Parse level string (e.g. "1", "1.1", "1.1.1") to depth. "1" -> 1, "1.1" -> 2. */
function levelStringToDepth(levelStr: string): number {
  const s = levelStr.toString().trim();
  if (!s) return 0;
  const parts = s.split('.');
  return parts.length;
}

/** Parent level string: "1.1.2" -> "1.1", "1.1" -> "1", "1" -> "". */
function parentLevelString(levelStr: string): string {
  const s = levelStr.toString().trim();
  const lastDot = s.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return s.slice(0, lastDot);
}

/** Compare level strings so 1 < 1.1 < 1.1.1 < 1.1.2 < 1.2. */
function compareLevelStrings(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

function toDateString(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Parse weight from Excel. Excel stores % cells as decimals (100% = 1, 27.48% = 0.2748). Strings "100.00%" -> 100. */
function parseWeightPercent(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    if (isNaN(v)) return null;
    if (v >= 0 && v <= 1) return v * 100;
    return v;
  }
  const s = String(v).trim().replace(/%/g, '');
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseOptionalNumber(v: unknown): { value: number | null; valid: boolean } {
  if (v == null || v === '') return { value: null, valid: true };
  if (typeof v === 'number') {
    if (isNaN(v)) return { value: null, valid: false };
    return { value: v, valid: true };
  }
  const s = String(v).trim().replace(/,/g, '');
  if (!s) return { value: null, valid: true };
  const n = parseFloat(s);
  if (isNaN(n)) return { value: null, valid: false };
  return { value: n, valid: true };
}

/**
 * Process an Excel buffer from P6 / MS Project export.
 * Expects at least columns for level string and WBS name. Dates and description optional.
 */
export function processP6WBSFile(buffer: ArrayBuffer): {
  data: P6WBSRow[];
  errors: { row: number; field: string; error: string }[];
} {
  const errors: { row: number; field: string; error: string }[] = [];
  const workbook = XLSX.read(buffer, { type: 'array' });

  let sheet = workbook.Sheets[P6_SHEET_NAMES[0]];
  for (const name of P6_SHEET_NAMES) {
    if (workbook.SheetNames.includes(name)) {
      sheet = workbook.Sheets[name];
      break;
    }
  }
  if (!sheet) {
    return {
      data: [],
      errors: [{ row: 0, field: 'Sheet', error: `No WBS sheet found. Expected one of: ${P6_SHEET_NAMES.join(', ')}` }],
    };
  }

  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  if (!jsonData.length) {
    return { data: [], errors: [{ row: 0, field: 'Sheet', error: 'Sheet is empty.' }] };
  }

  const headers = (jsonData[0] ?? []).map((h) => String(h ?? '').trim());
  const levelCol = findHeaderColumn(headers, LEVEL_HEADERS);
  const nameCol = findHeaderColumn(headers, NAME_HEADERS);
  const descCol = findHeaderColumn(headers, DESC_HEADERS);
  const startCol = findHeaderColumn(headers, START_HEADERS);
  const endCol = findHeaderColumn(headers, END_HEADERS);
  const weightCol = findHeaderColumn(headers, WEIGHT_HEADERS);
  const budgetCol = findHeaderColumn(headers, BUDGET_HEADERS);

  if (levelCol < 0 || nameCol < 0) {
    return {
      data: [],
      errors: [
        {
          row: 1,
          field: 'Headers',
          error: `Missing required columns. Need level (e.g. "WBS Level", "Level") and name (e.g. "WBS Name", "Name"). Found: ${headers.join(', ') || 'none'}`,
        },
      ],
    };
  }

  const rawRows: {
    levelStr: string;
    name: string;
    description: string;
    start_date: string | null;
    end_date: string | null;
    progress_weight: number | null;
    assigned_budget: number | null;
    rowIndex: number;
  }[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as unknown[] ?? [];
    const levelStr = String(row[levelCol] ?? '').trim();
    const name = String(row[nameCol] ?? '').trim();

    if (!levelStr || !name) continue;

    const description = descCol >= 0 ? String(row[descCol] ?? '').trim() : '';
    const parsedBudget = budgetCol >= 0 ? parseOptionalNumber(row[budgetCol]) : { value: null, valid: true };
    if (!parsedBudget.valid) {
      errors.push({
        row: i + 2,
        field: 'Assigned Budget',
        error: `Invalid budget value "${String(row[budgetCol] ?? '').trim()}". Use a numeric value.`,
      });
      continue;
    }
    if (parsedBudget.value != null && parsedBudget.value < 0) {
      errors.push({
        row: i + 2,
        field: 'Assigned Budget',
        error: 'Assigned Budget must be greater than or equal to 0.',
      });
      continue;
    }
    rawRows.push({
      levelStr,
      name,
      description: description || name,
      start_date: startCol >= 0 ? toDateString(row[startCol]) : null,
      end_date: endCol >= 0 ? toDateString(row[endCol]) : null,
      progress_weight: weightCol >= 0 ? parseWeightPercent(row[weightCol]) : null,
      assigned_budget: parsedBudget.value,
      rowIndex: i,
    });
  }

  if (rawRows.length === 0) {
    return { data: [], errors: [{ row: 2, field: 'Data', error: 'No data rows found with both level and name.' }] };
  }

  // Sort by level string so parent always before children
  rawRows.sort((a, b) => compareLevelStrings(a.levelStr, b.levelStr));

  const levelStrToRowIndex = new Map<string, number>();
  const result: P6WBSRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const depth = levelStringToDepth(r.levelStr);
    if (depth < 1) {
      errors.push({ row: r.rowIndex + 2, field: 'WBS Level', error: `Invalid level "${r.levelStr}". Use format like 1, 1.1, 1.1.1` });
      continue;
    }

    levelStrToRowIndex.set(r.levelStr, i);

    const parentLevel = parentLevelString(r.levelStr);
    let parent_row_index: number | null = null;
    if (parentLevel) {
      const parentIdx = rawRows.findIndex((x) => x.levelStr === parentLevel);
      if (parentIdx >= 0) parent_row_index = parentIdx;
    }

    result.push({
      name: r.name,
      description: r.description || r.name,
      level: depth,
      level_string: r.levelStr,
      parent_row_index,
      start_date: r.start_date,
      end_date: r.end_date,
      progress_weight: r.progress_weight ?? null,
      assigned_budget: r.assigned_budget ?? null,
      originalRowIndex: i,
      rowNumber: r.rowIndex + 2,
    });
  }

  return { data: result, errors };
}
