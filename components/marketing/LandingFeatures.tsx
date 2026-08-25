import {
  FolderTree,
  Network,
  CalendarRange,
  Users,
  AlertTriangle,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const MODULES: { title: string; description: string; Icon: LucideIcon }[] = [
  {
    title: "EPS & Portfolios",
    description:
      "Enterprise project structure, portfolio roll-ups, strategic value scoring and programme-level governance.",
    Icon: FolderTree,
  },
  {
    title: "Projects & WBS",
    description:
      "Project setup, work breakdown structures, templates, checklists and stage-gate approvals through to closure.",
    Icon: Network,
  },
  {
    title: "Scheduling & Critical Path",
    description:
      "Tasks, dependencies with lag, working calendars, baselines, Gantt views and critical path analysis.",
    Icon: CalendarRange,
  },
  {
    title: "Resources & Timesheets",
    description:
      "Resource pools, assignments, availability, weekly timesheets and actual hours posted back to the plan.",
    Icon: Users,
  },
  {
    title: "Risk & Issues",
    description:
      "Risk registers, probability and impact scoring, mitigation owners and escalation alerts before they bite.",
    Icon: AlertTriangle,
  },
  {
    title: "Cost, Budget & EVM",
    description:
      "Budgets, commitments, procurement, contracts and earned value metrics against an approved baseline.",
    Icon: Wallet,
  },
];

/** Feature grid — the core modules of the PMO suite. */
export function LandingFeatures() {
  return (
    <section id="modules" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
      <div className="reveal-on-scroll mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-wujha-primary">
          Modules
        </p>
        <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          One suite for the whole delivery function
        </h2>
        <p className="mt-4 text-balance text-base/relaxed text-text-secondary">
          Every module writes to the same project record, so a status report is
          a read — not a reconciliation. Reporting, baselines and approvals come
          with it.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(({ title, description, Icon }) => (
          <div
            key={title}
            className="reveal-on-scroll group relative overflow-hidden rounded-2xl border border-border bg-bg-surface p-6 transition-colors hover:border-wujha-primary/40"
          >
            <div
              aria-hidden="true"
              className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-wujha-primary/5 blur-2xl transition-opacity group-hover:opacity-100 sm:opacity-0"
            />
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-wujha-primary/10 text-wujha-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="mt-1.5 text-sm/relaxed text-text-secondary">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
