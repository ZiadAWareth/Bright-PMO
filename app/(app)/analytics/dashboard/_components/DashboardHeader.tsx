"use client";

import { CalendarClock, RefreshCw } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Spinner } from "@/components/ui/spinner";

function formatToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export function DashboardHeader({
  generatedAt,
  refreshing,
  onRefresh,
}: {
  generatedAt?: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { userRole, isClient } = useCurrentUser();

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Portfolio overview
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          A live view of delivery progress, cost performance, risk exposure and
          resource load across every active project.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-surface px-3 py-2 text-xs font-medium text-text-secondary">
          <CalendarClock className="h-4 w-4 text-bright-primary" aria-hidden="true" />
          {formatToday()}
        </span>
        {isClient && userRole && (
          <span className="inline-flex items-center gap-2 rounded-xl bg-bg-surface-alt px-3 py-2 text-xs font-medium text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-bright-primary" />
            Signed in as{" "}
            <strong className="text-text-primary">
              {userRole.replace(/_/g, " ")}
            </strong>
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-bright-primary/50 hover:text-text-primary disabled:opacity-60"
          title={
            generatedAt
              ? `Last updated ${new Date(generatedAt).toLocaleTimeString()}`
              : "Refresh"
          }
        >
          {refreshing ? (
            <Spinner size={16} />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
