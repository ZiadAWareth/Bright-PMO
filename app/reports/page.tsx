"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Download,
    Share2,
    Calendar,
    Filter,
    Search,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Users,
    DollarSign,
    AlertTriangle,
    Clock,
    Target,
    Award,
    Building,
    Briefcase,
    Code,
    Shield,
    Globe,
    Eye,
    Edit,
    Trash2,
    MoreHorizontal,
    CheckCircle,
    Plus,
    Settings,
    RefreshCw,
    Send,
    Archive,
    Star,
    Activity,
    Zap,
    X,
    FileDown,
} from "lucide-react";
import {
    ReportTemplate,
    GeneratedReport,
    ReportCategory,
} from "@/lib/reporting/types";
import TemplateLibraryModal from "@/components/reporting/TemplateLibraryModal";
import ReportGenerator from "@/components/reporting/ReportGenerator";
import SelectiveReportGenerator from "@/components/reporting/SelectiveReportGenerator";

// Types for Reports
/*
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'project' | 'resource' | 'risk' | 'schedule' | 'executive' | 'operational' | 'compliance';
  format: 'pdf' | 'excel' | 'powerpoint' | 'csv' | 'dashboard';
  dataSource: string[];
  version: string;
  createdBy: string;
  createdAt: Date;
  lastGenerated: Date;
  nextScheduled: Date;
  sharedWith: string[];
  downloadCount: number;
}

interface GeneratedReport {
  id: string;
  name:string;
  template: string;
  generatedAt: Date;
  generatedBy: string;
  format: 'pdf' | 'excel' | 'powerpoint' | 'csv';
  status: 'completed' | 'failed';
  fileSize: string;
  sharedWith?: string[];
}
*/

interface ReportMetrics {
    totalReports: number;
    scheduledReports: number;
    recentDownloads: number;
    popularTemplates: string[];
    dataFreshness: number;
    systemHealth: number;
}

type UserRole = "admin" | "project-manager" | "pmo" | "executive";

// Report Generator Component
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

const ReportGeneratorPageContent: React.FC = () => {
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
    <>
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
    </>
  );
};

const ReportsPage: React.FC = () => {
    const [currentRole, setCurrentRole] = useState<UserRole>("admin");
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>(
        []
    );
    const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedFormat, setSelectedFormat] = useState<string>("all");
    const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<
        "templates" | "generated" | "scheduled" | "analytics"
    >("templates");
    const [isLoading, setIsLoading] = useState(true);
    const [roleTransition, setRoleTransition] = useState(false);

    // Modal states
    const [showReportBuilder, setShowReportBuilder] = useState(false);
    const [showScheduler, setShowScheduler] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
    const [showReportGenerator, setShowReportGenerator] = useState(false);
    const [showDataSources, setShowDataSources] = useState(false);
    const [showDistribution, setShowDistribution] = useState(false);
    const [showCustomReport, setShowCustomReport] = useState(false);
    const [showExecutiveDashboard, setShowExecutiveDashboard] = useState(false);
    const [showUniversalReportBuilder, setShowUniversalReportBuilder] =
        useState(false);

    // Add state for real metrics
    const [realMetrics, setRealMetrics] = useState<ReportMetrics | null>(null);
    const [showReportsViewer, setShowReportsViewer] = useState(false);
    const [allReports, setAllReports] = useState<any[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    useEffect(() => {
        const fetchReportsData = async () => {
            try {
                // Fetch reports from API
                const response = await fetch("/api/reports");
                if (response.ok) {
                    const reports = await response.json();

                    // Calculate real metrics
                    const totalReports = reports.length;
                    const scheduledReports = reports.filter(
                        (report: any) =>
                            report.type === "executive_summary" ||
                            report.type === "scheduled"
                    ).length;

                    // For now, use sample data for other metrics that don't have APIs yet
                    const sampleMetrics = getSampleMetrics();

                    setRealMetrics({
                        totalReports,
                        scheduledReports,
                        recentDownloads: sampleMetrics.recentDownloads,
                        popularTemplates: sampleMetrics.popularTemplates,
                        dataFreshness: sampleMetrics.dataFreshness,
                        systemHealth: sampleMetrics.systemHealth,
                    });
                } else {
                    // Fallback to sample data if API fails
                    setRealMetrics(getSampleMetrics());
                }
            } catch (error) {
                console.error("Error fetching reports data:", error);
                // Fallback to sample data on error
                setRealMetrics(getSampleMetrics());
            }
        };

        setTimeout(() => {
            setTemplates(getSampleTemplates());
            setGeneratedReports(getSampleGeneratedReports());
            fetchReportsData(); // Use the new function instead of getSampleMetrics()
            setIsLoading(false);
        }, 1000);
    }, []);

    const handleRoleChange = (newRole: string) => {
        setRoleTransition(true);
        const roleMapping: { [key: string]: UserRole } = {
            admin: "admin",
            "project-manager": "project-manager",
            pmo: "pmo",
            executive: "executive",
        };

        const mappedRole = roleMapping[newRole] || (newRole as UserRole);
        setCurrentRole(mappedRole);

        setTimeout(() => {
            setRoleTransition(false);
        }, 300);
    };

    const getRoleMetadata = (role: UserRole) => {
        const metadata = {
            admin: {
                color: "from-red-500 to-pink-600",
                icon: Shield,
                bgAccent: "bg-red-50 dark:bg-red-900/20",
                textAccent: "text-red-600 dark:text-red-400",
                description:
                    "System-wide reporting control and data governance",
            },
            "project-manager": {
                color: "from-blue-500 to-indigo-600",
                icon: Briefcase,
                bgAccent: "bg-blue-50 dark:bg-blue-900/20",
                textAccent: "text-blue-600 dark:text-blue-400",
                description: "Project performance reports and team analytics",
            },
            pmo: {
                color: "from-purple-500 to-violet-600",
                icon: Target,
                bgAccent: "bg-purple-50 dark:bg-purple-900/20",
                textAccent: "text-purple-600 dark:text-purple-400",
                description: "Portfolio governance and compliance reporting",
            },
            executive: {
                color: "from-amber-500 to-orange-600",
                icon: Globe,
                bgAccent: "bg-amber-50 dark:bg-amber-900/20",
                textAccent: "text-amber-600 dark:text-amber-400",
                description: "Strategic insights and executive dashboards",
            },
        };
        return metadata[role];
    };

    const getSampleTemplates = (): ReportTemplate[] => [
        {
            id: "template-001",
            name: "Monthly Project Status Report",
            description:
                "Comprehensive summary of project progress, budget, and risks.",
            category: "project",
            format: "pdf",
            dataSource: ["projects", "budgets", "risks"],
            version: "1.2",
            createdBy: "Admin",
            createdAt: new Date("2023-01-15"),
        },
        {
            id: "template-002",
            name: "Resource breakdown Analysis",
            description:
                "Detailed breakdown of team workload and availability.",
            category: "resource",
            format: "excel",
            dataSource: ["resources"],
            version: "1.0",
            createdBy: "PMO",
            createdAt: new Date("2023-02-20"),
        },
        {
            id: "template-003",
            name: "Overall Portfolio Dashboard",
            description:
                "High-level overview of strategic objectives and active projects and portfolio health.",
            category: "executive",
            format: "powerpoint",
            dataSource: ["portfolios", "projects", "budgets"],
            version: "2.1",
            createdBy: "Admin",
            createdAt: new Date("2023-03-10"),
        },
        {
            id: "template-004",
            name: "Financial Performance Report",
            description:
                "Comprehensive financial analysis including total budget, actual spending, and remaining budget from budgets, transactions, and procurements.",
            category: "financial",
            format: "excel",
            dataSource: ["budgets", "transactions", "procurements"],
            version: "2.1",
            createdBy: "Finance Dept",
            createdAt: new Date("2023-04-05"),
        },
        {
            id: "template-005",
            name: "Equipment Maintenance Report",
            description:
                "Equipment status, maintenance schedules, and site utilization.",
            category: "operational",
            format: "excel",
            dataSource: ["equipment-site-logs"],
            version: "1.1",
            createdBy: "Site Manager",
            createdAt: new Date("2023-06-01"),
        },
        {
            id: "template-006",
            name: "Task Progress Report",
            description:
                "Detailed task progress, dependencies, and resource assignments.",
            category: "task",
            format: "pdf",
            dataSource: ["tasks"],
            version: "1.3",
            createdBy: "Project Manager",
            createdAt: new Date("2023-08-10"),
        },
        {
            id: "template-007",
            name: "Budget Variance Analysis",
            description:
                "Budget vs actual cost analysis with variance explanations.",
            category: "financial",
            format: "excel",
            dataSource: ["budgets", "transactions", "projects"],
            version: "2.0",
            createdBy: "Finance Dept",
            createdAt: new Date("2023-09-20"),
        },
        {
            id: "template-008",
            name: "Document Management Report",
            description: "Document status, versions, and compliance tracking.",
            category: "compliance",
            format: "csv",
            //      dataSource: ['documents', 'projects'],
            dataSource: ["documents"],
            version: "1.2",
            createdBy: "Admin",
            createdAt: new Date("2023-11-12"),
        },
    ];

    const getSampleGeneratedReports = (): GeneratedReport[] => [
        {
            id: "gen-001",
            templateId: "template-001",
            name: "Monthly Project Status - Oct 2023",
            generatedAt: new Date("2023-10-28"),
            generatedBy: "Admin",
            format: "pdf",
        },
        {
            id: "gen-002",
            templateId: "template-002",
            name: "Resource Utilization - Q3 2023",
            generatedAt: new Date("2023-10-15"),
            generatedBy: "PMO",
            format: "excel",
        },
        {
            id: "gen-003",
            templateId: "template-003",
            name: "Executive KPI Briefing - Oct 2023",
            generatedAt: new Date("2023-10-25"),
            generatedBy: "Admin",
            format: "powerpoint",
        },
    ];

    const getSampleMetrics = (): ReportMetrics => {
        return {
            totalReports: 156,
            scheduledReports: 12,
            recentDownloads: 89,
            popularTemplates: [
                "Executive Summary",
                "Project Status",
                "Financial Analysis",
            ],
            dataFreshness: 95,
            systemHealth: 98,
        };
    };

    const renderRoleSpecificControls = (): React.ReactNode => {
        const roleMetadata = getRoleMetadata(currentRole);
        const IconComponent = roleMetadata.icon;

        return (
            <div className="flex items-center space-x-2">
                {/* Generate Report Button - Available to all roles */}
                <button
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-orange-600 text-white hover:bg-orange-700"
                    onClick={() => setShowReportGenerator(true)}
                >
                    <Plus className="w-4 h-4" />
                    <span>Generate Report</span>
                </button>

               {/*  {currentRole === "admin" && (
                    <>
                        <button
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            onClick={handleViewReports}
                        >
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">View Reports</span>
                        </button>
                    </>
                )} */}

                {currentRole === "project-manager" && (
                    <>
                        <button
                            className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-blue-600 hover:to-indigo-600 active:scale-95"
                            onClick={() => setShowScheduler(true)}
                        >
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            <div className="relative flex items-center">
                                <Calendar className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                                Schedule Reports
                            </div>
                        </button>
                        <button
                            className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-green-600 hover:to-emerald-600 active:scale-95"
                            onClick={() => setShowAnalytics(true)}
                        >
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            <div className="relative flex items-center">
                                <BarChart3 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                                Analytics
                            </div>
                        </button>
                    </>
                )}

                {/* {(currentRole === "admin" ||
                    currentRole === "pmo" ||
                    currentRole === "executive") && (
                    <>
                        <button
                            className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-blue-600 hover:to-indigo-600 active:scale-95"
                            onClick={() => setShowAnalytics(true)}
                        >
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            <div className="relative flex items-center">
                                <Activity className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                                Performance Metrics
                            </div>
                        </button>
                    </>
                )} */}

                {currentRole === "pmo" && (
                    <>
                        <button
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                            onClick={() => setShowAnalytics(true)}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-sm">Portfolio Reports</span>
                        </button>
                        <button
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                            onClick={() => setShowScheduler(true)}
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="text-sm">Automated Reports</span>
                        </button>
                    </>
                )}

                {currentRole === "executive" && (
                    <>
                        <button
                            className="group relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-amber-600 hover:to-orange-600 active:scale-95"
                            onClick={() => setShowExecutiveDashboard(true)}
                        >
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            <div className="relative flex items-center">
                                <Star className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                                Executive Dashboard
                            </div>
                        </button>
                        <button
                            className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-blue-600 hover:to-indigo-600 active:scale-95"
                            onClick={() => setShowDistribution(true)}
                        >
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            <div className="relative flex items-center">
                                <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                                Share Reports
                            </div>
                        </button>
                    </>
                )}
            </div>
        );
    };

    const renderStatsCards = (): React.ReactNode => {
        // Use real metrics if available, otherwise fall back to sample metrics
        const displayMetrics = realMetrics || metrics;
        if (!displayMetrics) return null;

        const roleMetadata = getRoleMetadata(currentRole);

        // Role-specific stats layouts
        if (currentRole === "executive") {
            return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 col-span-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                    Executive Insights
                                </p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Strategic Overview
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    Real-time dashboard ready
                                </p>
                            </div>
                            <Globe className="w-10 h-10 text-amber-500" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    KPI Reports
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    24
                                </p>
                            </div>
                            <Star className="w-8 h-8 text-emerald-500" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Shared Reports
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    18
                                </p>
                            </div>
                            <Send className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                </div>
            );
        }

        if (currentRole === "pmo") {
            return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Portfolio Reports
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    32
                                </p>
                            </div>
                            <Target className="w-8 h-8 text-purple-500" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Automated Reports
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    15
                                </p>
                            </div>
                            <RefreshCw className="w-8 h-8 text-cyan-500" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Compliance Rate
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    98%
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Data Sources
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    8
                                </p>
                            </div>
                            <Settings className="w-8 h-8 text-rose-500" />
                        </div>
                    </div>
                </div>
            );
        }

        if (currentRole === "project-manager") {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Project Reports
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    28
                                </p>
                            </div>
                            <Briefcase className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Team Analytics
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    6
                                </p>
                            </div>
                            <BarChart3 className="w-8 h-8 text-orange-500" />
                        </div>
                    </div>
                </div>
            );
        }

        // Default Admin view
        return (
            <div
                className={`grid grid-cols-1 md:grid-cols-4 gap-6 transition-all duration-500 ${
                    roleTransition
                        ? "opacity-50 scale-95"
                        : "opacity-100 scale-100"
                }`}
            >
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                Total Reports
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {displayMetrics.totalReports}
                            </p>
                        </div>
                        <FileText className="w-8 h-8 text-red-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                Recent Downloads
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {displayMetrics.recentDownloads}
                            </p>
                        </div>
                        <Download className="w-8 h-8 text-emerald-500" />
                    </div>
                </div>
            </div>
        );
    };

    // Handler for custom report generation
    const handleUniversalReportGenerate = (report: any) => {
        // For now, just log or toast
        console.log("Custom Universal Report:", report);
        // You can integrate export logic here
    };

    // Handler for viewing all reports
    const handleViewReports = async () => {
        setIsLoadingReports(true);
        try {
            const response = await fetch("/api/reports");
            if (response.ok) {
                const reports = await response.json();
                setAllReports(reports);
                setShowReportsViewer(true);
            } else {
                console.error("Failed to fetch reports");
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setIsLoadingReports(false);
        }
    };

    const renderMainContent = (): React.ReactNode => {
        const roleMetadata = getRoleMetadata(currentRole);

        // If custom report generator is open, show it instead of the normal content
        if (showCustomReport) {
            return (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
                    {/* Header with back button */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowCustomReport(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Custom Report Generator
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Build custom reports from any data source
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Report Generator Content */}
                    <div className="p-0">
                        <div className="flex flex-row gap-8 p-8">
                            {/* Import the report generator page content here */}
                            {/* We'll embed the report generator component content inline */}
                            <ReportGeneratorPageContent />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div
                className={`transition-all duration-500 ${
                    roleTransition
                        ? "opacity-50 scale-95"
                        : "opacity-100 scale-100"
                }`}
            >
                {/* Role-specific content areas */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-xl">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                        <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                            {currentRole === "admin"
                                ? "System-Wide"
                                : currentRole === "executive"
                                ? "Executive"
                                : currentRole === "pmo"
                                ? "Portfolio"
                                : currentRole === "project-manager"
                                ? "Project"
                                : "Technical"}{" "}
                            Reporting Dashboard
                        </h3>

                        {/* Role-specific preview content */}
                        {currentRole === "admin" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                                <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border-l-4 border-red-500 shadow-lg relative">
                                    <Shield className="w-8 h-8 text-red-600 mb-3" />
                                    <h4 className="font-bold text-red-900 dark:text-red-200 text-lg">
                                        Universal Report Builder
                                    </h4>
                                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                                        Create custom reports from any data
                                        source with advanced analytics
                                    </p>
                                    <div className="mt-4 flex space-x-2">
                                        <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs">
                                            All Data
                                        </span>
                                        <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs">
                                            Custom
                                        </span>
                                    </div>
                                    <button
                                        className="absolute top-4 right-4 px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs font-semibold"
                                        onClick={() =>
                                            setShowCustomReport(true)
                                        }
                                    >
                                        Open
                                    </button>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border-l-4 border-green-500 shadow-lg">
                                    <Settings className="w-8 h-8 text-green-600 mb-3" />
                                    <h4 className="font-bold text-green-900 dark:text-green-200 text-lg">
                                        Data Integration
                                    </h4>
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                                        Connect and sync data from Projects,
                                        Budget, Resources, Schedule, and Risk
                                        systems
                                    </p>
                                    <div className="mt-4 flex space-x-2">
                                        <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">
                                            Integration
                                        </span>
                                        <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">
                                            Real-time
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentRole === "executive" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                <div className="p-8 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-800/20 rounded-xl border-l-4 border-amber-500 shadow-lg">
                                    <Globe className="w-10 h-10 text-amber-600 mb-4" />
                                    <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xl">
                                        Strategic Dashboard
                                    </h4>
                                    <p className="text-amber-700 dark:text-amber-300 mt-3">
                                        Executive KPIs, portfolio performance,
                                        and strategic insights for
                                        decision-making
                                    </p>
                                    <div className="mt-6 grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-amber-800">
                                                OMR 156M
                                            </p>
                                            <p className="text-xs text-amber-600">
                                                Portfolio Value
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-amber-800">
                                                87%
                                            </p>
                                            <p className="text-xs text-amber-600">
                                                Success Rate
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-800/20 rounded-xl border-l-4 border-emerald-500 shadow-lg">
                                    <Star className="w-10 h-10 text-emerald-600 mb-4" />
                                    <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xl">
                                        Stakeholder Reports
                                    </h4>
                                    <p className="text-emerald-700 dark:text-emerald-300 mt-3">
                                        Curated reports for board meetings,
                                        investor updates, and stakeholder
                                        communications
                                    </p>
                                    <div className="mt-6 space-y-2">
                                        <div className="flex justify-between items-center p-2 bg-emerald-100 dark:bg-emerald-800/30 rounded">
                                            <span className="text-sm">
                                                Board Report Q4
                                            </span>
                                            <span className="px-2 py-1 bg-emerald-200 text-emerald-800 rounded text-xs">
                                                Ready
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-emerald-100 dark:bg-emerald-800/30 rounded">
                                            <span className="text-sm">
                                                Investor Update
                                            </span>
                                            <span className="px-2 py-1 bg-emerald-200 text-emerald-800 rounded text-xs">
                                                Scheduled
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentRole === "pmo" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                                <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-800/20 rounded-xl border-l-4 border-purple-500 shadow-lg">
                                    <Target className="w-8 h-8 text-purple-600 mb-3" />
                                    <h4 className="font-bold text-purple-900 dark:text-purple-200 text-lg">
                                        Portfolio Intelligence
                                    </h4>
                                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                                        Comprehensive portfolio analytics and
                                        governance reporting
                                    </p>
                                    <div className="mt-4 text-center">
                                        <p className="text-3xl font-bold text-purple-800">
                                            94%
                                        </p>
                                        <p className="text-xs text-purple-600">
                                            Portfolio Health
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-800/20 rounded-xl border-l-4 border-cyan-500 shadow-lg">
                                    <RefreshCw className="w-8 h-8 text-cyan-600 mb-3" />
                                    <h4 className="font-bold text-cyan-900 dark:text-cyan-200 text-lg">
                                        Automated Reporting
                                    </h4>
                                    <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-2">
                                        Scheduled reports with automated data
                                        collection and distribution
                                    </p>
                                    <div className="mt-4 text-center">
                                        <p className="text-3xl font-bold text-cyan-800">
                                            15
                                        </p>
                                        <p className="text-xs text-cyan-600">
                                            Active Schedules
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-800/20 rounded-xl border-l-4 border-emerald-500 shadow-lg">
                                    <CheckCircle className="w-8 h-8 text-emerald-600 mb-3" />
                                    <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-lg">
                                        Compliance Tracking
                                    </h4>
                                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-2">
                                        Regulatory compliance monitoring and
                                        audit trail reporting
                                    </p>
                                    <div className="mt-4 text-center">
                                        <p className="text-3xl font-bold text-emerald-800">
                                            98%
                                        </p>
                                        <p className="text-xs text-emerald-600">
                                            Compliance Rate
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentRole === "project-manager" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 rounded-xl border-l-4 border-blue-500 shadow-lg">
                                    <Briefcase className="w-10 h-10 text-blue-600 mb-4" />
                                    <h4 className="font-bold text-blue-900 dark:text-blue-200 text-xl">
                                        Project Performance
                                    </h4>
                                    <p className="text-blue-700 dark:text-blue-300 mt-3">
                                        Detailed project analytics, milestone
                                        tracking, and team performance insights
                                    </p>
                                    <div className="mt-6 space-y-3">
                                        <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded">
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">
                                                    Al Wajba Towers
                                                </span>
                                                <span className="text-xs font-bold text-green-600">
                                                    85% Complete
                                                </span>
                                            </div>
                                            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                                                <div className="bg-green-500 h-2 rounded-full w-5/6"></div>
                                            </div>
                                        </div>
                                        <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded">
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">
                                                    Digital Transform
                                                </span>
                                                <span className="text-xs font-bold text-blue-600">
                                                    45% Complete
                                                </span>
                                            </div>
                                            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                                                <div className="bg-blue-500 h-2 rounded-full w-1/2"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-xl border-l-4 border-green-500 shadow-lg">
                                    <BarChart3 className="w-10 h-10 text-green-600 mb-4" />
                                    <h4 className="font-bold text-green-900 dark:text-green-200 text-xl">
                                        Team Analytics
                                    </h4>
                                    <p className="text-green-700 dark:text-green-300 mt-3">
                                        Resource utilization, team productivity,
                                        and performance metrics
                                    </p>
                                    <div className="mt-6 grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-800">
                                                89%
                                            </p>
                                            <p className="text-xs text-green-600">
                                                Team Utilization
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-800">
                                                12
                                            </p>
                                            <p className="text-xs text-green-600">
                                                Active Reports
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <DashboardLayout
                activeView={currentRole}
                onViewChange={handleRoleChange}
            >
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="Reports"
            activeView={currentRole}
            onViewChange={handleRoleChange}
        >
            <div className="space-y-6" key={`reports-${currentRole}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-600 dark:text-gray-400">
                            {currentRole === "admin" &&
                                "Comprehensive reporting system with advanced analytics and data governance"}
                            {currentRole === "project-manager" &&
                                "Generate detailed project reports and team performance analytics"}
                            {currentRole === "pmo" &&
                                "Portfolio-wide reporting with governance and compliance focus"}
                            {currentRole === "executive" &&
                                "Strategic insights and executive-level reporting for stakeholders"}
                        </p>
                    </div>
                    {renderRoleSpecificControls()}
                </div>

                {/* Stats Cards */}
                {renderStatsCards()}

                {/* Main Content */}
                {renderMainContent()}
            </div>
            <TemplateLibraryModal
                isOpen={showTemplateLibrary}
                onClose={() => setShowTemplateLibrary(false)}
                templates={templates}
            />
            <ReportGenerator
                isOpen={showReportGenerator}
                onClose={() => setShowReportGenerator(false)}
                templates={templates}
            />
            <SelectiveReportGenerator
                isOpen={showUniversalReportBuilder}
                onClose={() => setShowUniversalReportBuilder(false)}
                onGenerate={handleUniversalReportGenerate}
            />

            {/* Reports Viewer Modal */}
            {showReportsViewer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/10 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                                All Reports ({allReports.length})
                            </h2>
                            <button
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => setShowReportsViewer(false)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isLoadingReports ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : allReports.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400">
                                        No reports found
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-slate-700">
                                                <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                                                    Name
                                                </th>
                                                <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                                                    Type
                                                </th>
                                                <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                                                    Created By
                                                </th>
                                                <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                                                    Created At
                                                </th>
                                                {/* <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Actions</th> */}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allReports.map((report: any) => (
                                                <tr
                                                    key={report.report_id}
                                                    className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                                >
                                                    <td className="p-3">
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                {report.name}
                                                            </p>
                                                            {report.description && (
                                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                                    {
                                                                        report.description
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span
                                                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                                report.type ===
                                                                "executive_summary"
                                                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                                                                    : report.type ===
                                                                      "project_status"
                                                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                                                                    : report.type ===
                                                                      "budget_analysis"
                                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                                                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
                                                            }`}
                                                        >
                                                            {report.type
                                                                .split("_")
                                                                .map(
                                                                    (
                                                                        word: string
                                                                    ) =>
                                                                        word
                                                                            .charAt(
                                                                                0
                                                                            )
                                                                            .toUpperCase() +
                                                                        word.slice(
                                                                            1
                                                                        )
                                                                )
                                                                .join(" ")}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {report.creator
                                                            ?.first_name &&
                                                        report.creator
                                                            ?.last_name
                                                            ? `${report.creator.first_name} ${report.creator.last_name}`
                                                            : report.creator
                                                                  ?.email ||
                                                              "Unknown"}
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                                        {new Date(
                                                            report.created_at
                                                        ).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-3">
                                                        {/* <button
                              className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              onClick={async () => {
                                try {
                                  // Create a simple PDF report based on the report data
                                  const { generatePdf } = await import('@/lib/reporting/pdfGenerator');
                                  
                                  // Create a template object for the PDF generation
                                  const template: ReportTemplate = {
                                    id: report.report_id,
                                    name: report.name,
                                    description: report.description || 'Generated report',
                                    category: 'executive' as ReportCategory,
                                    format: 'pdf',
                                    dataSource: [],
                                    version: '1.0',
                                    createdBy: report.creator?.first_name || 'Unknown',
                                    createdAt: new Date(report.created_at)
                                  };
                                  
                                  // Generate PDF with the report data
                                  generatePdf(template, report.data || {});
                                } catch (error) {
                                  console.error('Error generating PDF:', error);
                                  // Fallback: show a simple alert
                                  alert('PDF generation failed. Please try again.');
                                }
                              }}
                              title="Download as PDF"
                            >
                              <Download className="w-5 h-5" />
                            </button> */}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-800/50">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Showing {allReports.length} report
                                    {allReports.length !== 1 ? "s" : ""}
                                </p>
                                <button
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                                    onClick={() => setShowReportsViewer(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default ReportsPage;
