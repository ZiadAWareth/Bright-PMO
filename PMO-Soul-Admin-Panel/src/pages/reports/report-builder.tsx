import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  FileText,
  FileSpreadsheet,
  Table2,
  Database,
  ListChecks,
  Filter,
  Link2,
  ChevronRight,
  Search,
  Check,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowLeft,
  Loader2,
  Save,
} from 'lucide-react';

interface Column {
  columnName: string;
  dataType: string;
}

interface Relationship {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
}

interface ReportRequest {
  primaryTable: string;
  reportType: 'pdf' | 'excel';
  whereClause?: string;
  relatedTables?: string[];
  primaryTableColumns?: string[];
  relatedTableColumns?: Record<string, string[]>;
}

type StepKey = 'select-table' | 'configure-columns' | 'generate';

const STEPS: { key: StepKey; label: string; description: string }[] = [
  { key: 'select-table', label: 'Select Table', description: 'Choose primary data source' },
  { key: 'configure-columns', label: 'Configure Columns', description: 'Columns, joins & filters' },
  { key: 'generate', label: 'Generate', description: 'Export to PDF or Excel' },
];

function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} />;
}

export default function Reports() {
  // Database metadata
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relatedTableColumns, setRelatedTableColumns] = useState<Record<string, Column[]>>({});

  // User selections
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedRelatedTables, setSelectedRelatedTables] = useState<string[]>([]);
  const [selectedRelatedColumns, setSelectedRelatedColumns] = useState<Record<string, string[]>>({});
  const [whereClause, setWhereClause] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [generatingType, setGeneratingType] = useState<'pdf' | 'excel' | null>(null);
  const isGenerating = generatingType !== null;
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<StepKey>('select-table');

  // Save-as-report (persist definition + assign to roles)
  const [roles, setRoles] = useState<{ id: number; role: string }[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveRoleIds, setSaveRoleIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/api/rolesandpermissions', { params: { page: 0, limit: 200 } })
      .then((res) => setRoles(((res.data?.data ?? res.data ?? []) as any[]).map((r) => ({ id: r.id, role: r.role }))))
      .catch(() => setRoles([]));
  }, []);

  const saveReport = async () => {
    if (!saveName.trim()) { setSaveMsg('Enter a report name.'); return; }
    if (!selectedTable || selectedColumns.length === 0) { setSaveMsg('Build a report (table + columns) first.'); return; }
    const hasRelated =
      selectedRelatedTables.length > 0 && Object.values(selectedRelatedColumns).some((c) => c.length > 0);
    const definition: any = { primaryTable: selectedTable, primaryTableColumns: selectedColumns };
    if (whereClause) definition.whereClause = whereClause;
    if (hasRelated) { definition.relatedTables = selectedRelatedTables; definition.relatedTableColumns = selectedRelatedColumns; }
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.post('/api/savedreport', {
        name: saveName.trim(),
        description: saveDesc.trim() || undefined,
        definition,
        allowedRoleIds: saveRoleIds,
        isActive: true,
      });
      setSaveMsg(`Saved "${saveName.trim()}" and assigned to ${saveRoleIds.length} role(s).`);
      setSaveName(''); setSaveDesc(''); setSaveRoleIds([]);
    } catch (e: any) {
      setSaveMsg(e?.message ?? 'Failed to save report.');
    } finally {
      setSaving(false);
    }
  };

  const filteredTables = tables.filter((table) =>
    table.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Fetch all tables on mount
  useEffect(() => {
    async function fetchTables() {
      setIsLoading(true);
      try {
        const res = await api.post('/api/reports/tables');
        setTables(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTables();
  }, []);

  const handleTableSelect = async (tableName: string) => {
    setSelectedTable(tableName);
    setCurrentStep('configure-columns');
    setSelectedColumns([]);
    setSelectedRelatedTables([]);
    setSelectedRelatedColumns({});
    setColumns([]);
    setRelationships([]);
    setRelatedTableColumns({});
    setError(null);
    setSuccessMessage(null);

    setIsLoading(true);
    try {
      const colsRes = await api.post('/api/reports/columns', { tableName });
      const colsData = colsRes.data;
      setColumns(colsData.columns || colsData);

      const relsRes = await api.post('/api/reports/relationships', { tableName });
      setRelationships(relsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleColumnToggle = (columnName: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((c) => c !== columnName)
        : [...prev, columnName],
    );
  };

  const handleRelatedTableToggle = async (relatedTableName: string) => {
    const isSelected = selectedRelatedTables.includes(relatedTableName);

    if (isSelected) {
      setSelectedRelatedTables((prev) => prev.filter((t) => t !== relatedTableName));
      setSelectedRelatedColumns((prev) => {
        const newState = { ...prev };
        delete newState[relatedTableName];
        return newState;
      });
    } else {
      setSelectedRelatedTables((prev) => [...prev, relatedTableName]);
      setIsLoading(true);
      try {
        const res = await api.post('/api/reports/columns', { tableName: relatedTableName });
        const data = res.data;
        setRelatedTableColumns((prev) => ({ ...prev, [relatedTableName]: data.columns || data }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRelatedColumnToggle = (tableName: string, columnName: string) => {
    setSelectedRelatedColumns((prev) => {
      const tableCols = prev[tableName] || [];
      const newTableCols = tableCols.includes(columnName)
        ? tableCols.filter((c) => c !== columnName)
        : [...tableCols, columnName];
      return { ...prev, [tableName]: newTableCols };
    });
  };

  const generateReport = async (reportType: 'pdf' | 'excel') => {
    if (!selectedTable) {
      alert('Please select a primary table.');
      return;
    }
    if (selectedColumns.length === 0) {
      alert('Please select at least one column.');
      return;
    }

    const hasRelatedSelections =
      selectedRelatedTables.length > 0 &&
      Object.values(selectedRelatedColumns).some((cols) => cols.length > 0);

    setGeneratingType(reportType);
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const requestBody: ReportRequest = {
        primaryTable: selectedTable,
        reportType,
        ...(whereClause && { whereClause }),
      };

      if (hasRelatedSelections) {
        requestBody.relatedTables = selectedRelatedTables;
        requestBody.primaryTableColumns = selectedColumns;
        requestBody.relatedTableColumns = selectedRelatedColumns;
      } else {
        requestBody.primaryTableColumns = selectedColumns;
      }

      const res = await api.post('/api/reports/preview', requestBody, { responseType: 'blob' });

      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}_report.${reportType === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSuccessMessage(
        `Report "${selectedTable}_report.${reportType === 'excel' ? 'xlsx' : 'pdf'}" downloaded successfully!`,
      );

      setTimeout(() => {
        setSelectedTable(null);
        setSelectedColumns([]);
        setSelectedRelatedTables([]);
        setSelectedRelatedColumns({});
        setColumns([]);
        setRelationships([]);
        setRelatedTableColumns({});
        setWhereClause('');
        setCurrentStep('select-table');
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      setGeneratingType(null);
    }
  };

  const uniqueRelatedTables = Array.from(
    new Set(
      relationships
        .map((r: Relationship) => (r.fromTable === selectedTable ? r.toTable : r.fromTable))
        .filter((t: string) => t !== selectedTable),
    ),
  );

  const totalRelatedColumnsCount = Object.values(selectedRelatedColumns).flat().length;

  const goToStep = (step: StepKey) => {
    if (step === 'select-table') {
      setSelectedTable(null);
      setSelectedColumns([]);
      setSelectedRelatedTables([]);
      setSelectedRelatedColumns({});
      setColumns([]);
      setRelationships([]);
      setRelatedTableColumns({});
      setCurrentStep('select-table');
      return;
    }
    if (step === 'configure-columns' && selectedTable) {
      setCurrentStep('configure-columns');
      return;
    }
    if (step === 'generate' && selectedTable && selectedColumns.length > 0) {
      setCurrentStep('generate');
      return;
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const handleSelectAllColumns = () => setSelectedColumns(columns.map((c) => c.columnName));
  const handleClearColumns = () => setSelectedColumns([]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Report Builder</h1>
          <p className="text-sm text-muted-foreground">
            Build custom reports across your data — pick a table, choose columns, and export to
            PDF or Excel
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
            {STEPS.map((step, idx) => {
              const isActive = step.key === currentStep;
              const isCompleted = idx < currentStepIndex;
              const isClickable =
                step.key === 'select-table' ||
                (step.key === 'configure-columns' && !!selectedTable) ||
                (step.key === 'generate' && !!selectedTable && selectedColumns.length > 0);

              return (
                <div key={step.key} className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => isClickable && goToStep(step.key)}
                    disabled={!isClickable}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-300'
                          : isClickable
                            ? 'bg-accent text-muted-foreground hover:text-primary hover:bg-primary/5'
                            : 'bg-accent text-muted-foreground/50 cursor-not-allowed',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-card border border-border text-muted-foreground',
                      )}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                    </span>
                    {/* Phones: only the current step is named; the others are their number. */}
                    <div className={cn('flex-col items-start leading-tight', isActive ? 'flex' : 'hidden sm:flex')}>
                      <span>{step.label}</span>
                      <span
                        className={cn(
                          'hidden text-[11px] font-normal sm:inline',
                          isActive ? 'text-primary-foreground/80' : 'text-muted-foreground',
                        )}
                      >
                        {step.description}
                      </span>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
      {successMessage && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {successMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select Table */}
      {currentStep === 'select-table' && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Choose a primary table</h2>
                  <p className="text-sm text-muted-foreground">
                    {tables.length > 0
                      ? `${tables.length} ${tables.length === 1 ? 'table' : 'tables'} available`
                      : 'Loading data sources…'}
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search tables…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-8"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {isLoading && tables.length === 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[74px] rounded-xl" />
                ))}
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                <Database className="mb-3 h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">
                  {searchTerm ? 'No tables match your search' : 'No tables available'}
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {searchTerm
                    ? `We couldn't find any tables matching "${searchTerm}". Try a different keyword.`
                    : 'Database tables will appear here once the metadata is loaded.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTables.map((tableName) => (
                  <button
                    key={tableName}
                    type="button"
                    onClick={() => handleTableSelect(tableName)}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Table2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {tableName}
                        </p>
                        <p className="text-xs text-muted-foreground">Click to configure</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure Columns */}
      {currentStep === 'configure-columns' && selectedTable && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Table2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Primary table
                    </p>
                    <h2 className="truncate text-lg font-semibold text-foreground">
                      {selectedTable}
                    </h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <ListChecks className="h-3.5 w-3.5" />
                    {selectedColumns.length} columns
                  </span>
                  {totalRelatedColumnsCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                      <Link2 className="h-3.5 w-3.5" />
                      {totalRelatedColumnsCount} related
                    </span>
                  )}
                  <Button variant="outline" size="sm" onClick={() => goToStep('select-table')}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Change table
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Primary columns */}
            <Card className="lg:col-span-3">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Select columns</h3>
                      <p className="text-xs text-muted-foreground">
                        From <span className="font-medium text-foreground">{selectedTable}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllColumns}
                      disabled={isLoading || columns.length === 0}
                    >
                      Select all
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearColumns}
                      disabled={isLoading || selectedColumns.length === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {isLoading && columns.length === 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-[58px] rounded-lg" />
                    ))}
                  </div>
                ) : columns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
                    <ListChecks className="mb-2 h-6 w-6 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No columns found</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This table doesn't expose any columns. Try selecting another table.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {columns.map((col) => {
                      const checked = selectedColumns.includes(col.columnName);
                      return (
                        <label
                          key={col.columnName}
                          className={cn(
                            'group relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
                            checked
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card hover:border-primary/30 hover:bg-accent/50',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                              checked
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card group-hover:border-primary/40',
                            )}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <input
                            type="checkbox"
                            className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
                            checked={checked}
                            onChange={() => handleColumnToggle(col.columnName)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {col.columnName}
                            </p>
                            {col.dataType && (
                              <p className="truncate text-xs text-muted-foreground">
                                {col.dataType}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related tables */}
            <Card className="lg:col-span-2">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Related tables</h3>
                    <p className="text-xs text-muted-foreground">
                      {uniqueRelatedTables.length > 0
                        ? `${uniqueRelatedTables.length} available join${uniqueRelatedTables.length === 1 ? '' : 's'}`
                        : 'No related tables detected'}
                    </p>
                  </div>
                </div>

                {uniqueRelatedTables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
                    <Link2 className="mb-2 h-6 w-6 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No relationships</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This table has no related tables defined.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {uniqueRelatedTables.map((relTable) => {
                      const checked = selectedRelatedTables.includes(relTable);
                      const relCols = relatedTableColumns[relTable];
                      const pickedCount = (selectedRelatedColumns[relTable] || []).length;
                      return (
                        <div
                          key={relTable}
                          className={cn(
                            'rounded-lg border transition-colors',
                            checked
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : 'border-border bg-card',
                          )}
                        >
                          <label className="relative flex cursor-pointer items-center gap-3 p-3">
                            <span
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                checked
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-border bg-card',
                              )}
                            >
                              {checked && <Check className="h-3 w-3" />}
                            </span>
                            <input
                              type="checkbox"
                              className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
                              checked={checked}
                              onChange={() => handleRelatedTableToggle(relTable)}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {relTable}
                              </p>
                              {checked && pickedCount > 0 && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-300">
                                  {pickedCount} column{pickedCount === 1 ? '' : 's'} picked
                                </p>
                              )}
                            </div>
                            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </label>

                          {checked && (
                            <div className="border-t border-border/70 p-3">
                              {!relCols ? (
                                <div className="flex items-center justify-center py-4">
                                  <Spinner className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ) : relCols.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No columns available.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 gap-1.5">
                                  {relCols.map((col) => {
                                    const colChecked = (
                                      selectedRelatedColumns[relTable] || []
                                    ).includes(col.columnName);
                                    return (
                                      <label
                                        key={col.columnName}
                                        className={cn(
                                          'relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                                          colChecked
                                            ? 'bg-emerald-500/10'
                                            : 'hover:bg-accent/60',
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors',
                                            colChecked
                                              ? 'border-emerald-600 bg-emerald-600 text-white'
                                              : 'border-border bg-card',
                                          )}
                                        >
                                          {colChecked && <Check className="h-2.5 w-2.5" />}
                                        </span>
                                        <input
                                          type="checkbox"
                                          className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
                                          checked={colChecked}
                                          onChange={() =>
                                            handleRelatedColumnToggle(relTable, col.columnName)
                                          }
                                        />
                                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                                          {col.columnName}
                                        </span>
                                        {col.dataType && (
                                          <span className="shrink-0 text-[10px] text-muted-foreground">
                                            {col.dataType}
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Where clause */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <Filter className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Filter (WHERE clause)</h3>
                  <p className="text-xs text-muted-foreground">
                    Optional SQL fragment applied to your report
                  </p>
                </div>
              </div>
              <Textarea
                value={whereClause}
                onChange={(e) => setWhereClause(e.target.value)}
                placeholder="e.g., status = 'Active' AND amount > 1000"
                rows={3}
                className="font-mono"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Tip: Use plain SQL. Leave empty to include all rows.
              </p>
            </CardContent>
          </Card>

          {/* Step 2 actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={() => goToStep('select-table')}>
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={() => goToStep('generate')} disabled={selectedColumns.length === 0}>
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Generate */}
      {currentStep === 'generate' && selectedTable && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Review & generate</h2>
                  <p className="text-sm text-muted-foreground">
                    Confirm your selections and export the report
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border bg-accent/40 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Table2 className="h-3.5 w-3.5" />
                    Primary table
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-foreground">
                    {selectedTable}
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-accent/40 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" />
                    Columns
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {selectedColumns.length}
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-accent/40 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Link2 className="h-3.5 w-3.5" />
                    Related tables
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {selectedRelatedTables.length}
                    {totalRelatedColumnsCount > 0 && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({totalRelatedColumnsCount} cols)
                      </span>
                    )}
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-accent/40 p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    WHERE clause
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-foreground">
                    {whereClause ? 'Applied' : '—'}
                  </dd>
                </div>
              </dl>

              {whereClause && (
                <div className="mt-4 rounded-lg border border-border bg-accent/40 p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Filter preview
                  </p>
                  <code className="block whitespace-pre-wrap break-words text-xs text-foreground">
                    {whereClause}
                  </code>
                </div>
              )}

              {selectedColumns.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Selected columns
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedColumns.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Export your report</h3>
                  <p className="text-xs text-muted-foreground">Choose a format to download</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => goToStep('configure-columns')}
                    disabled={isGenerating}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={() => generateReport('pdf')}
                    disabled={isGenerating || selectedColumns.length === 0}
                  >
                    {generatingType === 'pdf' ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Generate PDF
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => generateReport('excel')}
                    disabled={isGenerating || selectedColumns.length === 0}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {generatingType === 'excel' ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        Generate Excel
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isGenerating && (
                <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-border bg-accent/40 py-6">
                  <div className="flex items-center gap-3">
                    <Spinner className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Building your report…
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-foreground">Save &amp; assign to roles</h3>
                <p className="text-xs text-muted-foreground">
                  Persist this report and choose which user roles can download it anytime from the app.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Report name" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
                <Input placeholder="Description (optional)" value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} />
              </div>
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Allowed roles</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => {
                    const on = saveRoleIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSaveRoleIds((prev) => (on ? prev.filter((x) => x !== r.id) : [...prev, r.id]))}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
                          on
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground hover:bg-accent',
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                        {r.role}
                      </button>
                    );
                  })}
                  {roles.length === 0 && <span className="text-xs text-muted-foreground">No roles found</span>}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={saveReport} disabled={saving || !saveName.trim() || selectedColumns.length === 0}>
                  {saving ? <><Spinner className="h-4 w-4" />Saving…</> : <><Save className="h-4 w-4" />Save report</>}
                </Button>
                {saveMsg && <span className="text-xs text-muted-foreground">{saveMsg}</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
