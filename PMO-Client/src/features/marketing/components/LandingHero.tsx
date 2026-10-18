import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  FileCheck2,
  type LucideIcon,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { LandingHeroPreview } from "./LandingHeroPreview";

/** Proof points shown beneath the hero actions. */
const TRUST_ITEMS: { label: string; Icon: LucideIcon }[] = [
  { label: "Baselined schedules", Icon: GitBranch },
  { label: "Gated approvals", Icon: ShieldCheck },
  { label: "Audit-ready trail", Icon: FileCheck2 },
];

/**
 * Landing hero: an asymmetric, headline-led layout. The copy column sits beside
 * a decorative console preview on large screens and stacks to a centered
 * column on smaller ones.
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative ambient aurora, scoped to the hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-24 h-[36rem] w-[36rem] animate-aurora-a rounded-full bg-bright-primary/15 blur-[120px] dark:bg-bright-primary/20" />
        <div className="absolute -right-24 top-8 h-[30rem] w-[30rem] animate-aurora-b rounded-full bg-bright-secondary/15 blur-[120px]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 20%, transparent 45%, rgb(var(--app-bg-rgb)) 85%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy column */}
          <div className="text-center lg:text-left">
            <span className="inline-flex animate-rise items-center gap-2 rounded-full border border-border bg-bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-text-secondary backdrop-blur">
              <Sparkles
                className="h-3.5 w-3.5 text-bright-primary"
                aria-hidden="true"
              />
              The delivery core of the ERP ecosystem
            </span>

            <h1
              className="mt-6 animate-rise text-balance text-4xl font-bold tracking-tight text-text-primary sm:text-5xl/[1.1]"
              style={{ animationDelay: "60ms" }}
            >
              Every project, one trusted plan.
            </h1>

            <p
              className="mx-auto mt-4 max-w-xl animate-rise text-balance text-base/relaxed text-text-secondary lg:mx-0"
              style={{ animationDelay: "120ms" }}
            >
              {BRAND.productTitle} unifies the enterprise project structure,
              portfolios, schedules, resources, risk and cost into a single
              delivery lifecycle — with the baselines, approvals and audit trail
              your governance board expects.
            </p>

            <div
              className="mt-8 flex animate-rise flex-wrap items-center justify-center gap-3 lg:justify-start"
              style={{ animationDelay: "180ms" }}
            >
              <Link
                href="/auth/signin"
                className="group inline-flex h-11 items-center gap-2 rounded-xl bg-bright-primary px-8 text-[0.95rem] font-semibold text-white shadow-lg shadow-bright-primary/25 transition-colors hover:bg-bright-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bright-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light"
              >
                Sign in to your workspace
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <a
                href="#modules"
                className="inline-flex h-11 items-center rounded-xl border border-border bg-bg-surface px-8 text-[0.95rem] font-semibold text-text-primary transition-colors hover:bg-bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bright-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light"
              >
                Explore modules
              </a>
            </div>

            <ul
              className="mt-10 flex animate-rise flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-text-secondary lg:justify-start"
              style={{ animationDelay: "240ms" }}
            >
              {TRUST_ITEMS.map(({ label, Icon }) => (
                <li key={label} className="inline-flex items-center gap-2">
                  <Icon
                    className="h-4 w-4 text-bright-primary"
                    aria-hidden="true"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Decorative preview (large screens only) */}
          <div
            className="hidden animate-rise lg:block"
            style={{ animationDelay: "300ms" }}
          >
            <LandingHeroPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
