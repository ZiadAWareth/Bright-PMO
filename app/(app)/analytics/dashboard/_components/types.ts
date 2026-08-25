/** Response shapes for the four `/api/analytics/dashboard/*` endpoints. */

export interface Metric {
  value: string;
  trend: string;
}

export type StatKey =
  | "portfolioValue"
  | "actualCost"
  | "scheduleIndex"
  | "costIndex"
  | "openRisks"
  | "overdueTasks"
  | "pendingApprovals"
  | "resourceUtilisation"
  | "taskCompletion";

export interface StatsResponse {
  generatedAt: string;
  stats: Record<StatKey, Metric>;
  earnedValue: {
    bac: number;
    pv: number;
    ev: number;
    ac: number;
    spi: number | null;
    cpi: number | null;
    /** Where the earned-value figures came from. */
    basis: "evm" | "derived" | "mixed";
    measuredProjects: number;
    derivedProjects: number;
  };
  counts: {
    projects: number;
    active: number;
    closed: number;
    onHold: number;
    tasks: number;
    overdueTasks: number;
    openRisks: number;
  };
}

export interface ChartsResponse {
  generatedAt: string;
  deliveryTrend: {
    label: string;
    monthKey: string;
    completed: number;
    due: number;
  }[];
  portfolioMix: {
    status: string;
    label: string;
    count: number;
    budget: number;
  }[];
  budgetByCostType: {
    costType: string;
    planned: number;
    actual: number;
    variance: number;
  }[];
  riskExposure: {
    category: string;
    count: number;
    totalScore: number;
    high: number;
  }[];
  resourceLoad: {
    type: string;
    assigned: number;
    total: number;
    allocationPct: number;
  }[];
  scheduleVariance: {
    projectId: number;
    code: string;
    name: string;
    status: string;
    plannedPct: number;
    actualPct: number;
    variancePct: number;
    budget: number;
  }[];
  totals: {
    tasks: number;
    overdueTasks: number;
    projects: number;
    openRisks: number;
  };
}

export interface PulseResponse {
  generatedAt: string;
  progress: {
    actualPct: number | null;
    plannedPct: number | null;
    variancePct: number | null;
    basis: string;
  };
  activeProjects: number;
  projectsBehind: number;
  nextDeadline: {
    name: string;
    date: string;
    daysRemaining: number;
  } | null;
  blockers: {
    overdueTasks: number;
    criticalOverdue: number;
    milestonesDueSoon: number;
    dueSoonTasks: number;
    pendingApprovals: number;
    approvalGates: number;
    highRisks: number;
    escalatedRisks: number;
    risksOverdueReview: number;
  };
  dueSoonWindowDays: number;
}

export interface ActivityEntry {
  id: string;
  kind: "activity" | "project" | "task" | "risk" | "approval";
  title: string;
  detail: string;
  href: string | null;
  at: string;
}

export interface ActivityResponse {
  generatedAt: string;
  loggedActivityCount: number;
  entries: ActivityEntry[];
}
