"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  Flag,
  ListChecks,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { PulseResponse } from "./types";

type Tone = "warning" | "info" | "success" | "neutral";

const TONE_STYLES: Record<Tone, { iconBg: string; iconText: string; ring: string }> = {
  warning: {
    iconBg: "bg-warning-soft ",
    iconText: "text-warning",
    ring: "hover:border-warning/50",
  },
  info: {
    iconBg: "bg-info-soft ",
    iconText: "text-info ",
    ring: "hover:border-info/50",
  },
  success: {
    iconBg: "bg-success-soft ",
    iconText: "text-success ",
    ring: "hover:border-success/50",
  },
  neutral: {
    iconBg: "bg-surface-2 ",
    iconText: "text-muted ",
    ring: "hover:border-line/50",
  },
};

/**
 * Delivery Pulse — portfolio progress against plan, and the four queues that
 * actually block delivery. Every tile links to the screen where the work is
 * cleared, so the panel is a worklist rather than a readout.
 */
export function DeliveryPulse({
  data,
  loading,
}: {
  data: PulseResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-bg-surface p-6">
        <div className="h-6 w-56 animate-pulse rounded bg-bg-surface-alt" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-surface-alt" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-border bg-bg-surface p-6 text-sm text-text-secondary">
        Unable to load the delivery pulse.
      </div>
    );
  }

  const { progress, blockers, nextDeadline } = data;
  const actualPct = progress.actualPct ?? 0;
  const plannedPct = progress.plannedPct;
  const variance = progress.variancePct;

  const cards: {
    label: string;
    count: number;
    icon: LucideIcon;
    href: string;
    tone: Tone;
    hint: string;
  }[] = [
    {
      label: "Overdue tasks",
      count: blockers.overdueTasks,
      icon: ListChecks,
      href: "/projects",
      tone: blockers.overdueTasks > 0 ? "warning" : "success",
      hint:
        blockers.overdueTasks === 0
          ? "Nothing past due"
          : `${blockers.criticalOverdue} on the critical path`,
    },
    {
      label: `Due next ${data.dueSoonWindowDays}d`,
      count: blockers.dueSoonTasks,
      icon: Flag,
      href: "/projects",
      tone: blockers.dueSoonTasks > 0 ? "info" : "neutral",
      hint:
        blockers.milestonesDueSoon > 0
          ? `${blockers.milestonesDueSoon} milestone${blockers.milestonesDueSoon === 1 ? "" : "s"}`
          : "No milestones in window",
    },
    {
      label: "Pending approvals",
      count: blockers.pendingApprovals,
      icon: ClipboardCheck,
      href: "/projects",
      tone: blockers.pendingApprovals > 0 ? "warning" : "success",
      hint:
        blockers.pendingApprovals === 0
          ? "Queue is clear"
          : `${blockers.approvalGates} project gate${blockers.approvalGates === 1 ? "" : "s"}`,
    },
    {
      label: "High risks open",
      count: blockers.highRisks,
      icon: ShieldAlert,
      href: "/risk",
      tone: blockers.highRisks > 0 ? "warning" : "success",
      hint:
        blockers.escalatedRisks > 0
          ? `${blockers.escalatedRisks} escalated`
          : blockers.risksOverdueReview > 0
            ? `${blockers.risksOverdueReview} review overdue`
            : "None escalated",
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-bg-surface p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bright-primary/10 text-bright-primary">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-text-primary">
              Delivery Pulse
            </h3>
            <p className="mt-0.5 truncate text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {data.activeProjects} active project
                {data.activeProjects === 1 ? "" : "s"}
              </span>
              <span className="mx-2 opacity-50">•</span>
              {data.projectsBehind > 0
                ? `${data.projectsBehind} behind plan`
                : "All tracking to plan"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {nextDeadline && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                nextDeadline.daysRemaining < 0
                  ? "bg-danger-soft text-danger  "
                  : nextDeadline.daysRemaining <= 30
                    ? "bg-warning-soft text-warning  "
                    : "bg-info-soft text-info  "
              }`}
              title={`${nextDeadline.name} — planned finish ${new Date(nextDeadline.date).toLocaleDateString()}`}
            >
              {nextDeadline.daysRemaining < 0 ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Overdue by {Math.abs(nextDeadline.daysRemaining)}d
                </>
              ) : (
                <>
                  <CalendarClock className="h-3.5 w-3.5" />
                  Next finish in {nextDeadline.daysRemaining}d
                </>
              )}
            </span>
          )}
          {variance !== null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                variance >= 0
                  ? "bg-success-soft text-success  "
                  : "bg-danger-soft text-danger  "
              }`}
            >
              {variance >= 0 ? "+" : ""}
              {variance.toFixed(1)} pts vs plan
            </span>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Portfolio progress · {progress.basis}</span>
          <span className="font-semibold tabular-nums text-text-primary">
            {actualPct.toFixed(1)}%
            {plannedPct !== null && (
              <span className="ml-1.5 font-normal text-text-secondary">
                of {plannedPct.toFixed(1)}% planned
              </span>
            )}
          </span>
        </div>
        <div className="relative mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-bg-surface-alt">
          <div
            className="h-full rounded-full bg-gradient-to-r from-bright-primary to-bright-primary-hover transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, actualPct))}%` }}
          />
          {/* Plan marker — the gap between the fill and this tick is the slip. */}
          {plannedPct !== null && (
            <span
              aria-hidden="true"
              className="absolute inset-y-[-3px] w-0.5 bg-text-primary/70"
              style={{ left: `${Math.min(100, Math.max(0, plannedPct))}%` }}
              title={`Planned ${plannedPct.toFixed(1)}%`}
            />
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const tone = TONE_STYLES[card.tone];
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`group relative overflow-hidden rounded-xl border border-border bg-bg-surface p-4 transition-all duration-200 ${tone.ring} hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone.iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${tone.iconText}`} aria-hidden="true" />
                </div>
                <ArrowRight className="h-4 w-4 text-text-secondary/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-bright-primary" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-semibold tabular-nums tracking-tight text-text-primary">
                  {card.count.toLocaleString()}
                </div>
                <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-text-secondary">
                  {card.label}
                </div>
                <div className="mt-0.5 truncate text-xs text-text-secondary/80">
                  {card.hint}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
