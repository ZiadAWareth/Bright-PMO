"use client";

import { AlertCircle, CheckCircle2, Database, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StepIndicator } from "./_components/StepIndicator";
import { TablePicker } from "./_components/TablePicker";
import { ColumnConfigurator } from "./_components/ColumnConfigurator";
import { GeneratePanel } from "./_components/GeneratePanel";
import { useReportBuilder } from "./_hooks/useReportBuilder";

/**
 * Reporting Engine — a schema-driven report builder.
 *
 * Reads the live database schema through the external reporting engine
 * (`REPORTING_ENGINE_URL`, proxied by `/api/reporting/*` so the credentials
 * never reach the browser), then walks the user through picking a table,
 * columns and joins before exporting to PDF or Excel.
 */
export default function ReportingEnginePage() {
  const builder = useReportBuilder();
  const {
    connection,
    tables,
    columns,
    joinableTables,
    relatedColumns,
    selectedTable,
    selectedColumns,
    selectedRelatedTables,
    selectedRelatedColumns,
    whereClause,
    setWhereClause,
    currentStep,
    goToStep,
    loading,
    loadingRelated,
    generating,
    error,
    success,
  } = builder;

  const relatedColumnCount = Object.values(selectedRelatedColumns).flat().length;

  return (
    <DashboardLayout hideHeader>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
              Reporting Engine
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Build a report over any table in the PMO database — pick columns,
              follow relationships, filter, and export to PDF or Excel.
            </p>
          </div>
          <ConnectionBadge connection={connection} />
        </div>

        {connection.status === "failed" ? (
          <ConnectionError message={connection.message} />
        ) : (
          <>
            <StepIndicator
              currentStep={currentStep}
              canConfigure={Boolean(selectedTable)}
              canGenerate={Boolean(selectedTable) && selectedColumns.length > 0}
              onGoToStep={goToStep}
            />

            {error && <Banner tone="error" message={error} />}
            {success && <Banner tone="success" message={success} />}

            {currentStep === "select-table" && (
              <TablePicker
                tables={tables}
                loading={loading}
                onSelect={builder.selectTable}
              />
            )}

            {currentStep === "configure-columns" && selectedTable && (
              <ColumnConfigurator
                table={selectedTable}
                columns={columns}
                loading={loading}
                selectedColumns={selectedColumns}
                onToggleColumn={builder.toggleColumn}
                onSelectAll={builder.selectAllColumns}
                onClear={builder.clearColumns}
                joinableTables={joinableTables}
                selectedRelatedTables={selectedRelatedTables}
                relatedColumns={relatedColumns}
                selectedRelatedColumns={selectedRelatedColumns}
                loadingRelated={loadingRelated}
                onToggleRelatedTable={builder.toggleRelatedTable}
                onToggleRelatedColumn={builder.toggleRelatedColumn}
                whereClause={whereClause}
                onWhereClauseChange={setWhereClause}
                onBack={() => goToStep("select-table")}
                onNext={() => goToStep("generate")}
              />
            )}

            {currentStep === "generate" && selectedTable && (
              <GeneratePanel
                table={selectedTable}
                selectedColumns={selectedColumns}
                relatedTables={selectedRelatedTables.filter(
                  (t) => (selectedRelatedColumns[t]?.length ?? 0) > 0,
                )}
                relatedColumnCount={relatedColumnCount}
                whereClause={whereClause}
                generating={generating}
                onBack={() => goToStep("configure-columns")}
                onGenerate={builder.generate}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ConnectionBadge({
  connection,
}: {
  connection: ReturnType<typeof useReportBuilder>["connection"];
}) {
  if (connection.status === "checking") {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-surface px-3 py-2 text-xs font-medium text-text-secondary">
        <Database className="h-4 w-4 animate-pulse" aria-hidden="true" />
        Checking engine…
      </span>
    );
  }
  if (connection.status === "ok") {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-xs font-medium text-success">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Engine connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      Engine unavailable
    </span>
  );
}

/**
 * The engine connects to the database from its own host, so the usual cause of
 * a failure is a `DATABASE_URL` that is only resolvable from this machine. Say
 * that plainly rather than leaving an empty table list to be puzzled over.
 */
function ConnectionError({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-bright-danger/30 bg-bright-danger/5 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-0.5 h-5 w-5 shrink-0 text-bright-danger"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">
            The reporting engine cannot reach the database
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            The engine responded, but its attempt to open the PMO database
            failed: <span className="font-medium text-text-primary">{message}</span>
          </p>
          <p className="mt-3 text-sm text-text-secondary">
            The engine runs as a separate service and dials the database from its
            own network, so the host in <code className="font-mono">DATABASE_URL</code>{" "}
            has to be reachable from there. A{" "}
            <code className="font-mono">localhost</code> host resolves to the
            engine&apos;s own container, not this machine — point it at a database
            the engine can reach, or run the engine alongside the database.
          </p>
        </div>
      </div>
    </section>
  );
}

function Banner({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string;
}) {
  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isError
          ? "border-bright-danger/30 bg-bright-danger/10 text-bright-danger"
          : "border-success/30 bg-success/10 text-success "
      }`}
    >
      {isError ? (
        <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0 break-words">{message}</span>
    </div>
  );
}
