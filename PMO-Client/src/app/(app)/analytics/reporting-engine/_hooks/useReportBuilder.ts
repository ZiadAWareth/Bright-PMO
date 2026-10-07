"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normaliseColumns,
  type ConnectionState,
  type ReportColumn,
  type StepKey,
  type TableRelationship,
} from "../_components/types";

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    throw new Error((await res.text()) || `Request to ${path} failed`);
  }
  return (await res.json()) as T;
}

/**
 * Drives the report builder: talks to the reporting engine through the
 * `/api/reporting/*` proxy routes and holds the wizard's selection state.
 *
 * The engine runs as a separate service and connects to the PMO database
 * itself, so a reachable engine is not the same as a working one — the
 * connection is probed up front and surfaced, because every other call returns
 * an unhelpful empty list when the database handshake fails.
 */
export function useReportBuilder() {
  const [connection, setConnection] = useState<ConnectionState>({
    status: "checking",
  });

  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<ReportColumn[]>([]);
  const [relationships, setRelationships] = useState<TableRelationship[]>([]);
  const [relatedColumns, setRelatedColumns] = useState<
    Record<string, ReportColumn[]>
  >({});

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedRelatedTables, setSelectedRelatedTables] = useState<string[]>([]);
  const [selectedRelatedColumns, setSelectedRelatedColumns] = useState<
    Record<string, string[]>
  >({});
  const [whereClause, setWhereClause] = useState("");

  const [currentStep, setCurrentStep] = useState<StepKey>("select-table");
  const [loading, setLoading] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Probe the engine, then load the table list.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const probe = await postJson<{ success?: boolean; message?: string }>(
          "/api/reporting/test-connection",
        );
        if (cancelled) return;

        if (probe?.success === false) {
          setConnection({
            status: "failed",
            message: probe.message || "Connection failed",
          });
          return;
        }
        setConnection({ status: "ok" });

        const list = await postJson<string[]>("/api/reporting/tables");
        if (!cancelled) setTables(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) {
          setConnection({
            status: "failed",
            message: e instanceof Error ? e.message : "Unknown error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedTable(null);
    setSelectedColumns([]);
    setSelectedRelatedTables([]);
    setSelectedRelatedColumns({});
    setColumns([]);
    setRelationships([]);
    setRelatedColumns({});
    setWhereClause("");
    setCurrentStep("select-table");
  }, []);

  const selectTable = useCallback(async (tableName: string) => {
    setSelectedTable(tableName);
    setCurrentStep("configure-columns");
    setSelectedColumns([]);
    setSelectedRelatedTables([]);
    setSelectedRelatedColumns({});
    setColumns([]);
    setRelationships([]);
    setRelatedColumns({});
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const [info, rels] = await Promise.all([
        postJson<{ columns?: unknown }>("/api/reporting/table-info", { tableName }),
        postJson<TableRelationship[]>("/api/reporting/table-relationships", {
          tableName,
        }),
      ]);
      setColumns(normaliseColumns(info?.columns));
      setRelationships(Array.isArray(rels) ? rels : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load table details");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleColumn = useCallback((name: string) => {
    setSelectedColumns((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  }, []);

  const selectAllColumns = useCallback(() => {
    setSelectedColumns(columns.map((c) => c.name));
  }, [columns]);

  const clearColumns = useCallback(() => setSelectedColumns([]), []);

  const toggleRelatedTable = useCallback(
    async (tableName: string) => {
      const alreadySelected = selectedRelatedTables.includes(tableName);

      if (alreadySelected) {
        setSelectedRelatedTables((prev) => prev.filter((t) => t !== tableName));
        setSelectedRelatedColumns((prev) => {
          const next = { ...prev };
          delete next[tableName];
          return next;
        });
        return;
      }

      setSelectedRelatedTables((prev) => [...prev, tableName]);
      if (relatedColumns[tableName]) return;

      setLoadingRelated((prev) => ({ ...prev, [tableName]: true }));
      try {
        const info = await postJson<{ columns?: unknown }>(
          "/api/reporting/table-info",
          { tableName },
        );
        setRelatedColumns((prev) => ({
          ...prev,
          [tableName]: normaliseColumns(info?.columns),
        }));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : `Failed to load columns for ${tableName}`,
        );
      } finally {
        setLoadingRelated((prev) => ({ ...prev, [tableName]: false }));
      }
    },
    [relatedColumns, selectedRelatedTables],
  );

  const toggleRelatedColumn = useCallback((tableName: string, column: string) => {
    setSelectedRelatedColumns((prev) => {
      const current = prev[tableName] ?? [];
      return {
        ...prev,
        [tableName]: current.includes(column)
          ? current.filter((c) => c !== column)
          : [...current, column],
      };
    });
  }, []);

  const generate = useCallback(
    async (format: "pdf" | "excel") => {
      if (!selectedTable || selectedColumns.length === 0) return;

      setGenerating(format);
      setError(null);
      setSuccess(null);

      // Only send joins that actually have columns picked — the engine treats an
      // empty column list as "join but select nothing" and returns a broken file.
      const relatedTables = selectedRelatedTables.filter(
        (t) => (selectedRelatedColumns[t]?.length ?? 0) > 0,
      );
      const relatedTableColumns = Object.fromEntries(
        relatedTables.map((t) => [t, selectedRelatedColumns[t] ?? []]),
      );

      try {
        const res = await fetch("/api/reporting/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableName: selectedTable,
            selectedColumns,
            whereClause: whereClause.trim() || null,
            format,
            relatedTables,
            relatedTableColumns,
          }),
        });

        if (!res.ok) {
          throw new Error((await res.text()) || "Report generation failed");
        }

        const blob = await res.blob();
        const filename = `${selectedTable}_report.${format === "excel" ? "xlsx" : "pdf"}`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        setSuccess(`"${filename}" downloaded.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Report generation failed");
      } finally {
        setGenerating(null);
      }
    },
    [
      selectedTable,
      selectedColumns,
      selectedRelatedTables,
      selectedRelatedColumns,
      whereClause,
    ],
  );

  const goToStep = useCallback(
    (step: StepKey) => {
      if (step === "select-table") {
        resetSelection();
        return;
      }
      if (step === "configure-columns" && selectedTable) {
        setCurrentStep("configure-columns");
        return;
      }
      if (step === "generate" && selectedTable && selectedColumns.length > 0) {
        setCurrentStep("generate");
      }
    },
    [resetSelection, selectedColumns.length, selectedTable],
  );

  /** Tables reachable from the primary table via a foreign key, either way. */
  const joinableTables = Array.from(
    new Set(
      relationships
        .map((r) => (r.fromTable === selectedTable ? r.toTable : r.fromTable))
        .filter((t) => t && t !== selectedTable),
    ),
  );

  return {
    connection,
    tables,
    columns,
    relationships,
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
    selectTable,
    toggleColumn,
    selectAllColumns,
    clearColumns,
    toggleRelatedTable,
    toggleRelatedColumn,
    generate,
  };
}
