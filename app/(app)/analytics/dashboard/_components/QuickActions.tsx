"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarRange,
  FileText,
  Users,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
}

const ACTIONS: QuickAction[] = [
  {
    icon: Briefcase,
    label: "New project",
    description: "Set up scope, budget and gates",
    href: "/projects/create",
  },
  {
    icon: CalendarRange,
    label: "Scheduler",
    description: "Build and baseline a schedule",
    href: "/scheduler",
  },
  {
    icon: AlertTriangle,
    label: "Log a risk",
    description: "Score impact and assign an owner",
    href: "/risk/create",
  },
  {
    icon: Users,
    label: "Resources",
    description: "Review the pool and assignments",
    href: "/resources",
  },
  {
    icon: BarChart3,
    label: "Portfolios",
    description: "Roll-up across programmes",
    href: "/portfolios",
  },
  {
    icon: FileText,
    label: "Run reports",
    description: "Export status packs and EVM",
    href: "/analytics/reports",
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-6">
      <h3 className="mb-5 text-lg font-semibold text-text-primary">
        Quick actions
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="group rounded-xl border border-border p-4 text-left transition-all duration-200 hover:border-wujha-primary hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-wujha-primary/10 text-wujha-primary transition-colors group-hover:bg-wujha-primary group-hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-text-primary group-hover:text-wujha-primary">
                    {action.label}
                  </div>
                  <div className="truncate text-xs text-text-secondary">
                    {action.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
