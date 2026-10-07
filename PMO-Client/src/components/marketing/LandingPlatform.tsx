import { Network, Lock, BarChart3, Globe2, type LucideIcon } from "lucide-react";
import { BRAND } from "@/lib/brand";

const PILLARS: { title: string; description: string; Icon: LucideIcon }[] = [
  {
    title: "Connected ecosystem",
    description:
      "Single sign-on and shared master data with the wider ERP suite — HR, finance and procurement work off the same project record.",
    Icon: Network,
  },
  {
    title: "Governance by design",
    description:
      "Role-based permissions, stage-gate approvals and locked baselines keep the plan defensible.",
    Icon: Lock,
  },
  {
    title: "Reporting on demand",
    description:
      "Dashboards, earned value, health scores and status packs exportable to PDF, Excel or PowerPoint whenever you need them.",
    Icon: BarChart3,
  },
  {
    title: "Built for scale",
    description:
      "Multiple portfolios, programmes, sites and delivery teams under one enterprise project structure.",
    Icon: Globe2,
  },
];

/** Platform pillars — why the suite is trusted with the delivery plan. */
export function LandingPlatform() {
  return (
    <section id="platform" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="reveal-on-scroll">
          <p className="text-sm font-bold uppercase tracking-wider text-bright-primary">
            Platform
          </p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Part of the {BRAND.companyName} ERP ecosystem
          </h2>
          <p className="mt-4 text-balance text-base/relaxed text-text-secondary">
            Delivery does not run in isolation. The suite shares identity, master
            data and documents with the rest of the platform, so the progress you
            report is the progress the business actually made.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map(({ title, description, Icon }) => (
            <div
              key={title}
              className="reveal-on-scroll rounded-2xl border border-border bg-bg-surface p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-bright-secondary/10 text-bright-secondary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-text-primary">{title}</h3>
              <p className="mt-1.5 text-sm/relaxed text-text-secondary">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
