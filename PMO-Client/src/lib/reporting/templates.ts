import type { ReportTemplate } from "./types";

/**
 * The report catalogue.
 *
 * Each entry is a recipe, not a stored file: `dataSource` names the PMO tables
 * to pull live, `category` selects the summary shape, and `format` decides the
 * generator. Downloading one runs `generateReport`, which queries current data
 * — so a template never goes stale.
 */
export const REPORT_TEMPLATES: ReportTemplate[] = [
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
    name: "Resource Breakdown Analysis",
    description: "Detailed breakdown of team workload and availability.",
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
      "High-level overview of strategic objectives, active projects and portfolio health.",
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
      "Total budget, actual spending and remaining budget across budgets, transactions and procurements.",
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
      "Equipment status, maintenance schedules and site utilisation.",
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
      "Detailed task progress, dependencies and resource assignments.",
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
      "Budget against actual cost with variance explanations.",
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
    description: "Document status, versions and compliance tracking.",
    category: "compliance",
    format: "csv",
    dataSource: ["documents"],
    version: "1.2",
    createdBy: "Admin",
    createdAt: new Date("2023-11-12"),
  },
];
