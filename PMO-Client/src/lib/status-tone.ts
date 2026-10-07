import type { BadgeTone } from "@/components/ui/form-shell";

/**
 * Domain status → badge tone.
 *
 * Every list screen used to carry its own `Record<string, string>` of Tailwind
 * classes per status, and those maps drifted: `on_hold` was grey on one screen
 * and amber on another, `completed` was purple in one place and green in the
 * next. Mapping to a tone here means the colours live in `StatusBadge` alone
 * and the same word always reads the same way across the app.
 *
 * Unknown values fall back to `neutral` rather than throwing, because these
 * columns are fed by API data that has historically included statuses the
 * frontend had not been told about yet.
 */

const PROJECT_STATUS: Record<string, BadgeTone> = {
  planning: "info",
  approved: "info",
  execution: "brand",
  pending_approval: "warning",
  on_hold: "warning",
  at_risk: "warning",
  delayed: "danger",
  rejected: "danger",
  completed: "success",
  closed: "neutral",
};

const PORTFOLIO_STATUS: Record<string, BadgeTone> = {
  active: "brand",
  completed: "success",
  on_hold: "warning",
  archived: "neutral",
};

/** High reads as danger because it is the one that needs attention, not the one that is "good". */
const PRIORITY: Record<string, BadgeTone> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

const COMPLIANCE: Record<string, BadgeTone> = {
  compliant: "success",
  non_compliant: "danger",
  pending: "warning",
};

export function projectStatusTone(status?: string | null): BadgeTone {
  return PROJECT_STATUS[status ?? ""] ?? "neutral";
}

export function portfolioStatusTone(status?: string | null): BadgeTone {
  return PORTFOLIO_STATUS[status ?? ""] ?? "neutral";
}

export function priorityTone(priority?: string | null): BadgeTone {
  return PRIORITY[priority ?? ""] ?? "neutral";
}

export function complianceTone(compliance?: string | null): BadgeTone {
  return COMPLIANCE[compliance ?? ""] ?? "neutral";
}

/** `pending_approval` → `Pending approval`. Used for every enum rendered as a label. */
export function humanize(value?: string | null): string {
  if (!value) return "";
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Budget burn tone: fine until it nears the ceiling, then amber, then red.
 * Kept here so projects and portfolios shade their budget bars identically.
 */
export function burnTone(percent: number): "success" | "warning" | "danger" {
  if (percent > 90) return "danger";
  if (percent > 75) return "warning";
  return "success";
}

const RISK_STATUS: Record<string, BadgeTone> = {
  identified: "info",
  open: "info",
  assessed: "info",
  monitoring: "warning",
  "mitigation in progress": "warning",
  escalated: "danger",
  mitigated: "success",
  closed: "neutral",
};

/**
 * Risk level is inverted relative to most scales: `high` is the alarming end,
 * so it takes danger. Matches `priorityTone` so a "High" chip reads the same
 * whether it sits on a risk or on a project.
 */
const RISK_LEVEL: Record<string, BadgeTone> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  moderate: "warning",
  low: "success",
};

/**
 * Capacity is a two-sided scale — both ends are problems. `overloaded` is the
 * urgent one (danger) and `available` is spare headroom rather than a fault, so
 * it reads informational rather than green; `optimal` is the good state.
 */
const CAPACITY: Record<string, BadgeTone> = {
  available: "info",
  under_utilized: "warning",
  optimal: "success",
  overloaded: "danger",
};

const RESOURCE_STATUS: Record<string, BadgeTone> = {
  active: "success",
  contractor: "info",
  "on-leave": "warning",
  on_leave: "warning",
  inactive: "neutral",
};

export function riskStatusTone(status?: string | null): BadgeTone {
  return RISK_STATUS[(status ?? "").toLowerCase()] ?? "neutral";
}

export function riskLevelTone(level?: string | null): BadgeTone {
  return RISK_LEVEL[(level ?? "").toLowerCase()] ?? "neutral";
}

export function capacityTone(status?: string | null): BadgeTone {
  return CAPACITY[(status ?? "").toLowerCase()] ?? "neutral";
}

export function resourceStatusTone(status?: string | null): BadgeTone {
  return RESOURCE_STATUS[(status ?? "").toLowerCase()] ?? "neutral";
}

/**
 * Utilisation tone: over capacity is the failure, comfortably loaded is good,
 * and a low figure is idle capacity rather than an error.
 */
export function utilizationTone(percent: number): "brand" | "success" | "warning" | "danger" {
  if (percent > 100) return "danger";
  if (percent >= 80) return "success";
  if (percent >= 50) return "warning";
  return "brand";
}

/**
 * Schedule simulation statuses. These describe a feasibility run rather than
 * project health, so `converted` (the run became a real project) is the
 * success end and `draft` is simply not started yet.
 */
const SCHEDULE_STATUS: Record<string, BadgeTone> = {
  draft: "neutral",
  analyzing: "warning",
  feasible: "success",
  infeasible: "danger",
  pending_approval: "warning",
  approved: "info",
  rejected: "danger",
  converted: "brand",
};

export function scheduleStatusTone(status?: string | null): BadgeTone {
  return SCHEDULE_STATUS[(status ?? "").toLowerCase()] ?? "neutral";
}

/** Feasibility is a 0-100 confidence score: high is good, unlike a risk score. */
export function feasibilityTone(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

/** Timesheet submission states. Uppercase in the API, so the lookup lowercases. */
const TIMESHEET_STATUS: Record<string, BadgeTone> = {
  draft: "warning",
  submitted: "info",
  approved: "success",
  rejected: "danger",
};

export function timesheetStatusTone(status?: string | null): BadgeTone {
  return TIMESHEET_STATUS[(status ?? "").toLowerCase()] ?? "neutral";
}

/**
 * Procurement lifecycle. Distinct from project status: `Tendering` is the
 * active working state (brand) and `Awarded`/`Completed` are the good ends.
 * The API returns these capitalised, so the lookup lowercases.
 */
const PROCUREMENT_STATUS: Record<string, BadgeTone> = {
  planning: "warning",
  tendering: "brand",
  evaluation: "info",
  awarded: "info",
  completed: "success",
  cancelled: "neutral",
  pending: "warning",
  approved: "info",
  ordered: "brand",
  delivered: "success",
};

export function procurementStatusTone(status?: string | null): BadgeTone {
  return PROCUREMENT_STATUS[(status ?? "").toLowerCase()] ?? "neutral";
}

/** Vendor performance, scored 0–5. Only the low end is a warning worth colouring. */
export function ratingTone(rating: number): BadgeTone {
  if (rating >= 4) return "success";
  if (rating >= 2.5) return "warning";
  return "danger";
}

/**
 * RFQ response lifecycle: a vendor submits a bid, it is scored, then awarded or
 * rejected.
 *
 * "Awarded" is the only genuinely good outcome, so it takes the success tone;
 * "Submitted" is merely awaiting evaluation rather than a problem, which is why
 * it reads as a warning only in the sense of "needs attention".
 */
const RFQ_RESPONSE_STATUS: Record<string, BadgeTone> = {
  submitted: "warning",
  evaluated: "info",
  awarded: "success",
  rejected: "danger",
};

export function rfqResponseStatusTone(status?: string | null): BadgeTone {
  return RFQ_RESPONSE_STATUS[(status ?? "").toLowerCase()] ?? "neutral";
}

/** Bid evaluation score, 0–100. */
export function scoreTone(score: number): BadgeTone {
  if (score >= 75) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

/** WBS item / task execution statuses. */
const WBS_STATUS: Record<string, BadgeTone> = {
  not_started: "neutral",
  in_progress: "info",
  completed: "success",
  on_hold: "warning",
  delayed: "danger",
};

export function wbsStatusTone(status?: string | null): BadgeTone {
  return WBS_STATUS[(status ?? "").toLowerCase()] ?? "neutral";
}
