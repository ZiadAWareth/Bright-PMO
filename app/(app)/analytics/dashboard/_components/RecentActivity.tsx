"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  ClipboardCheck,
  ListChecks,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ActivityEntry, ActivityResponse } from "./types";

const KIND_STYLE: Record<
  ActivityEntry["kind"],
  { icon: LucideIcon; bg: string; color: string }
> = {
  activity: {
    icon: Sparkles,
    bg: "bg-slate-100 dark:bg-slate-500/15",
    color: "text-slate-600 dark:text-slate-300",
  },
  project: {
    icon: Briefcase,
    bg: "bg-orange-50 dark:bg-orange-500/10",
    color: "text-wujha-primary",
  },
  task: {
    icon: ListChecks,
    bg: "bg-sky-50 dark:bg-sky-500/10",
    color: "text-sky-600 dark:text-sky-400",
  },
  risk: {
    icon: AlertTriangle,
    bg: "bg-rose-50 dark:bg-rose-500/10",
    color: "text-rose-600 dark:text-rose-400",
  },
  approval: {
    icon: ClipboardCheck,
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    color: "text-emerald-600 dark:text-emerald-400",
  },
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function RecentActivity({
  data,
  loading,
}: {
  data: ActivityResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-bg-surface p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-bg-surface-alt" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-bg-surface-alt" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-surface p-6">
        <h3 className="text-lg font-semibold text-text-primary">Recent activity</h3>
        <p className="mt-4 text-sm text-text-secondary">
          Nothing has changed recently.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-text-primary">Recent activity</h3>
        {data.loggedActivityCount === 0 && (
          <span
            className="text-xs text-text-secondary"
            title="The RecentActivity audit log has no rows, so this feed is built from record timestamps instead."
          >
            from record changes
          </span>
        )}
      </div>

      <ul className="space-y-1">
        {data.entries.map((entry) => {
          const style = KIND_STYLE[entry.kind];
          const Icon = style.icon;

          const body = (
            <>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.bg}`}
              >
                <Icon className={`h-4 w-4 ${style.color}`} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-primary">
                  {entry.title}
                </div>
                <div className="truncate text-xs text-text-secondary">
                  {entry.detail}
                </div>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-text-secondary/80">
                {relativeTime(entry.at)}
              </span>
            </>
          );

          return (
            <li key={entry.id}>
              {entry.href ? (
                <Link
                  href={entry.href}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-bg-surface-alt"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-2 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
