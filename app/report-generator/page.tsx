"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FileDown, FileText } from "lucide-react";

interface TableInfo {
  tableName: string;
  columns: { name: string; type?: string }[] | string[];
  primaryKeys: string[];
}

interface TableRelationship {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  relationshipName: string;
}

export default function ReportGeneratorPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [whereClause, setWhereClause] = useState<string>("");
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const [relationships, setRelationships] = useState<TableRelationship[]>([]);
  
  // Related table state
  const [selectedRelatedTables, setSelectedRelatedTables] = useState<string[]>([]);
  const [relatedTableInfo, setRelatedTableInfo] = useState<Record<string, TableInfo>>({});
  const [relatedTableColumns, setRelatedTableColumns] = useState<Record<string, string[]>>({});
  const [loadingRelatedTables, setLoadingRelatedTables] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/reporting/tables", { method: "POST" })
      .then((r) => r.json())
      .then(setTables);
  }, []);

  useEffect(() => {
    // Reset all selections when table changes
    setSelectedColumns([]);
    setSelectedRelatedTables([]);
    setRelatedTableInfo({});
    setLoadingRelatedTables({});

    if (selectedTable) {
      fetch("/api/reporting/table-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: selectedTable }),
      })
        .then((r) => r.json())
        .then((info) => {
          // If columns are string[], convert to {name, type: ''}
          if (Array.isArray(info.columns)) {
            if (typeof info.columns[0] === "string") {
              info.columns = info.columns.map((name: string) => ({ name, type: '' }));
            } else if (typeof info.columns[0] === "object" && info.columns[0] !== null) {
              info.columns = info.columns.map((col: { columnName?: string; name?: string; column_name?: string; dataType?: string; type?: string; data_type?: string; })  => ({
                name: col.columnName || col.name || col.columnName || '',
                type: col.dataType || col.type || col.dataType || ''
              }));
            }
          } else {
            info.columns = [];
          }
          setTableInfo(info);
        });
      fetch("/api/reporting/table-relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: selectedTable }),
      })
        .then((r) => r.json())
        .then(setRelationships);
    } else {
      setTableInfo(null);
      setSelectedColumns([]);
      setRelationships([]);
    }
  }, [selectedTable]);

  const handleColumnToggle = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  // Handle related table selection
  const handleRelatedTableToggle = (tableName: string) => {
    setSelectedRelatedTables(prev => {
      const newSelection = prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName];
      
      // Load table info if selecting
      if (!prev.includes(tableName)) {
        loadRelatedTableInfo(tableName);
      }
      
      return newSelection;
    });
  };

  // Load related table info
  const loadRelatedTableInfo = async (tableName: string) => {
    if (relatedTableInfo[tableName]) return;
    
    setLoadingRelatedTables(prev => ({ ...prev, [tableName]: true }));
    
    try {
      const response = await fetch("/api/reporting/table-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName }),
      });
      const info = await response.json();
      
      // Process columns similar to main table
      let processedColumns = [];
      if (Array.isArray(info.columns)) {
        if (typeof info.columns[0] === "string") {
          processedColumns = info.columns.map((name: string) => ({ name, type: "" }));
        } else if (typeof info.columns[0] === "object" && info.columns[0] !== null) {
          processedColumns = info.columns.map((col: { columnName?: string; name?: string; column_name?: string; dataType?: string; type?: string; data_type?: string; })  => ({ 
            name: col.columnName || col.name || col.column_name || col, 
            type: col.dataType || col.type || col.data_type || "" 
          }));
        }
      }
      
      setRelatedTableInfo(prev => ({
        ...prev,
        [tableName]: {
          tableName: info.tableName || tableName,
          columns: processedColumns,
          primaryKeys: info.primaryKeys || []
        }
      }));
    } catch (error) {
      console.error(`Failed to load table info for ${tableName}:`, error);
    } finally {
      setLoadingRelatedTables(prev => ({ ...prev, [tableName]: false }));
    }
  };

  // Handle related table column selection
  const handleRelatedColumnToggle = (tableName: string, columnName: string) => {
    setRelatedTableColumns(prev => {
      const currentColumns = prev[tableName] || [];
      const newColumns = currentColumns.includes(columnName)
        ? currentColumns.filter(c => c !== columnName)
        : [...currentColumns, columnName];
      
      return {
        ...prev,
        [tableName]: newColumns
      };
    });
  };

  const downloadReport = async (format: "pdf" | "excel") => {
    if (!selectedTable || selectedColumns.length === 0) return;
    setDownloading(format);
    const res = await fetch("/api/reporting/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableName: selectedTable,
        selectedColumns,
        whereClause,
        format,
        relatedTables: selectedRelatedTables,
        relatedTableColumns
      }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
    setDownloading(null);
  };

  // Filtered tables for search
  const filteredTables = tables.filter((t) => t.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-row gap-8 p-8">
      {/* Sidebar: Table List */}
      <Card className="w-80 min-w-[18rem] max-h-[calc(100vh-6rem)] flex-shrink-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" /> Tables
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            placeholder="Search tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="overflow-y-auto max-h-80 pr-1">
            {filteredTables.map((t) => (
              <div
                key={t}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                  t === selectedTable ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                }`}
                onClick={() => setSelectedTable(t)}
              >
                <FileText className="w-4 h-4 opacity-60" />
                {t}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main: Table Info, Columns, Related Tables, Filter, Download */}
      <div className="flex-1 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {selectedTable ? `Table: ${selectedTable}` : "Select a table to build your report"}
            </CardTitle>
            <CardDescription>
              Select columns and related tables to build your report
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Columns Grid */}
            {tableInfo && (
              <div className="mb-6">
                <div className="font-semibold mb-2">Columns from {selectedTable}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {(Array.isArray(tableInfo.columns)
                    ? (typeof tableInfo.columns[0] === "string"
                        ? (tableInfo.columns as string[]).map((name) => ({ name, type: "" }))
                        : (tableInfo.columns as { name: string; type?: string }[])
                      )
                    : [])
                    .map((col, idx) => (
                      <label
                        key={col.name ? `${col.name}-${idx}` : idx}
                        className="flex items-center gap-2 border rounded px-2 py-1 bg-muted/30"
                      >
                        <Checkbox
                          checked={selectedColumns.includes(col.name)}
                          onCheckedChange={() => handleColumnToggle(col.name)}
                        />
                        <div className="flex flex-col font-medium min-w-0 flex-1">
                          <span 
                            className="text-xs truncate cursor-default" 
                            title={col.name}
                          >
                            {col.name}
                          </span>
                          {col.type && col.type !== '' && (
                            <span 
                              className="text-xs text-gray-500 truncate cursor-default" 
                              title={col.type}
                            >
                              {col.type}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                </div>
                {selectedColumns.length === 0 && (
                  <div className="mt-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-sm">
                    No columns selected. All columns will be included in the report.
                  </div>
                )}
              </div>
            )}

            {/* Related Tables */}
            {relationships.length > 0 && (
              <div className="mb-6">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-green-600">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17v-2a4 4 0 0 0-4-4H7m10 6v2a4 4 0 0 1-4 4H7m10-6a4 4 0 0 0-4-4H7m10 6a4 4 0 0 1-4 4H7m0-6v2a4 4 0 0 0 4 4h6m-6-6V7a4 4 0 0 1 4-4h6m-6 6V7a4 4 0 0 0-4-4H7"/></svg>
                  </span>
                  Related Tables
                </div>
                <div className="space-y-2">
                  {relationships.map((rel, idx) => {
                    const relatedTableName = rel.fromTable === selectedTable ? rel.toTable : rel.fromTable;
                    const isSelected = selectedRelatedTables.includes(relatedTableName);
                    const isLoading = loadingRelatedTables[relatedTableName];
                    const tableInfo = relatedTableInfo[relatedTableName];
                    
                    return (
                      <div key={`${relatedTableName}-${idx}`} className="border rounded p-3 bg-muted/10">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            id={`related-${relatedTableName}-${idx}`}
                            checked={isSelected}
                            onChange={() => handleRelatedTableToggle(relatedTableName)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor={`related-${relatedTableName}-${idx}`} className="font-medium cursor-pointer">
                            {relatedTableName}
                          </label>
                          <span className="text-xs text-gray-500 ml-auto">({rel.fromColumn} → {rel.toColumn})</span>
                        </div>
                        
                        {isSelected && (
                          <div className="ml-6 mt-2 border-t pt-2">
                            <div className="font-semibold mb-2">Columns from {relatedTableName}</div>
                            {isLoading ? (
                              <div className="text-sm text-gray-500">Loading columns...</div>
                            ) : tableInfo && tableInfo.columns ? (
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {tableInfo.columns.map((col: { columnName?: string; name?: string; column_name?: string; dataType?: string; type?: string; data_type?: string; }, colIdx: number) => (
                                  <label key={`${relatedTableName}-${col.columnName || col.name}-${colIdx}`} className="flex items-center gap-2 border rounded px-2 py-1 bg-muted/30">
                                    <input
                                      type="checkbox"
                                      checked={relatedTableColumns[relatedTableName]?.includes(col.columnName || col.name || "") || false}
                                      onChange={() => handleRelatedColumnToggle(relatedTableName, col.columnName || col.name || "")}
                                      className="w-3 h-3 text-blue-600"
                                    />
                                    <span className="font-medium text-sm">{col.columnName || col.name || ""}</span>
                                    {col.dataType || col.type && col.dataType || col.type !== '' && (
                                      <span className="text-xs text-gray-500 ml-auto">{col.dataType || col.type}</span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">No columns found</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter (WHERE clause) */}
            <div className="mb-6">
              <div className="font-semibold mb-2">Filter (WHERE clause)</div>
              <Input
                placeholder="e.g. status = 'Open' AND total > 100"
                value={whereClause}
                onChange={(e) => setWhereClause(e.target.value)}
              />
            </div>

            {/* Download Buttons */}
            <div className="flex justify-center items-center border rounded-lg p-8">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-medium rounded-xl px-10 py-5 flex items-center gap-2 mr-6"
                onClick={() => downloadReport("pdf")}
                disabled={downloading === "pdf" || !selectedTable || selectedColumns.length === 0}
              >
                <FileDown className="w-6 h-6" /> Download PDF
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white text-xl font-medium rounded-xl px-10 py-5 flex items-center gap-2"
                onClick={() => downloadReport("excel")}
                disabled={downloading === "excel" || !selectedTable || selectedColumns.length === 0}
              >
                <FileText className="w-6 h-6" /> Download Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
