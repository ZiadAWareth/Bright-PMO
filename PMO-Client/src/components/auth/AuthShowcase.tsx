"use client";

import { ArrowUpRight, TrendingUp } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { BrandChip } from "./BrandChip";

/** A tiny work-package card for the showcase delivery-board preview. */
function MiniPackage({
  module,
  name,
  metric,
  progress,
  initials,
  tone,
}: {
  /** Short module code (WBS / RES / RISK) — kept terse so the card stays one line. */
  module: string;
  name: string;
  metric: string;
  /** Completion, 0–100. */
  progress: number;
  initials: string;
  tone: string;
}) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-white/[0.06] p-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.25)]">
      <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/35">
        {module}
      </div>
      <div className="mt-0.5 text-[10.5px] font-semibold leading-tight text-white/90">
        {name}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold tabular-nums text-bright-primary">
          {metric}
        </span>
        <span
          className="grid h-[18px] w-[18px] place-items-center rounded-full text-[8px] font-bold text-brand-navy"
          style={{ background: tone }}
        >
          {initials}
        </span>
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-bright-primary to-bright-primary-hover"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The dark, on-brand product showcase shown beside the sign-in form on large
 * screens. Purely decorative: an ambient aurora behind a floating collage of
 * glass cards hinting at the delivery board, on-time trend and portfolio value.
 *
 * Deliberately dark in both themes — it is a brand panel, not a surface, so it
 * uses fixed hex values rather than theme tokens.
 */
export function AuthShowcase() {
  return (
    <aside className="relative hidden overflow-hidden rounded-[28px] bg-brand-navy text-white lg:flex lg:flex-col">
      {/* Ambient aurora */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 -top-28 h-[460px] w-[460px] animate-aurora-a rounded-full bg-bright-primary/30 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 right-0 h-[420px] w-[420px] animate-aurora-b rounded-full bg-bright-primary-hover/25 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-bright-secondary/10 blur-[120px]"
      />
      {/* Dot grid + top sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(var(--on-brand) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
        {/* Brand */}
        <div className="flex items-center">
          <BrandChip className="px-3.5 py-2 shadow-[0_8px_26px_rgba(0,0,0,0.3)]" />
        </div>

        {/* Headline + collage */}
        <div>
          <h1 className="max-w-md text-[32px] font-semibold leading-[1.12] tracking-tight xl:text-[38px]">
            Every project, in{" "}
            <span className="text-bright-primary">one clear</span> console.
          </h1>

          {/* Fixed geometry: the cards float ±14px, so the layers are sized to
              overlap only at their edges — depth without ever covering a figure.
              A fixed width (rather than max-width) keeps this identical from the
              `lg` breakpoint up, where the panel padding changes. */}
          <div className="relative mt-10 h-[330px] w-[420px]">
            {/* On-time trend chip — behind, top-right */}
            <div className="absolute right-0 top-0 z-0 w-[164px] animate-float-slow rounded-[18px] border border-white/10 bg-white/[0.05] p-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-white/45">
                  On-time delivery
                </span>
                <TrendingUp
                  className="h-3.5 w-3.5 text-white"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-1 text-[17px] font-semibold tabular-nums">
                94%
              </div>
              {/* `currentColor` keeps the sparkline on the themed brand colour. */}
              <svg
                viewBox="0 0 140 40"
                className="mt-1.5 h-9 w-full text-bright-primary"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="auth-spark" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="currentColor"
                      stopOpacity="0.45"
                    />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 30 L20 26 L40 28 L60 18 L80 21 L100 12 L120 14 L140 6 L140 40 L0 40 Z"
                  fill="url(#auth-spark)"
                />
                <path
                  d="M0 30 L20 26 L40 28 L60 18 L80 21 L100 12 L120 14 L140 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Delivery board — center */}
            <div className="absolute left-0 top-8 z-10 w-[264px] animate-float-soft rounded-[20px] border border-white/[0.12] bg-white/[0.05] p-3.5 shadow-[0_28px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-1.5 px-1">
                <span className="h-2 w-2 rounded-full bg-white/25" />
                <span className="h-2 w-2 rounded-full bg-white/25" />
                <span className="h-2 w-2 rounded-full bg-white/25" />
                <span className="ml-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  Delivery board
                </span>
              </div>
              {/* The KPI chip below hangs off the board's bottom-LEFT corner, so
                  the left column is deliberately the short one — that is what
                  keeps the chip from covering a card. Do not even out the
                  columns without moving the chip too. */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[9px] font-semibold text-white/55">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />{" "}
                    Complete
                  </div>
                  <div className="space-y-2">
                    <MiniPackage
                      module="WBS"
                      name="Design package"
                      metric="100%"
                      progress={100}
                      initials="SA"
                      tone="var(--brand-gold)"
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[9px] font-semibold text-white/55">
                    <span className="h-1.5 w-1.5 rounded-full bg-bright-primary" />{" "}
                    In progress
                  </div>
                  <div className="space-y-2">
                    <MiniPackage
                      module="EXEC"
                      name="Site mobilisation"
                      metric="62%"
                      progress={62}
                      initials="HD"
                      tone="var(--brand-gold)"
                    />
                    <MiniPackage
                      module="PROC"
                      name="Vendor award"
                      metric="45%"
                      progress={45}
                      initials="MK"
                      tone="var(--brand-mint)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI chip — front layer, parked in the empty bottom-right of the
                collage. The board is 264px wide and ~283px tall here, and every
                card floats ±14px, so anchoring right of it is the only position
                that cannot end up clipping a card figure. */}
            <div className="absolute bottom-0 right-2 z-20 animate-float-slow rounded-[18px] border border-white/[0.12] bg-brand-navy/70 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-white/45">
                Portfolio value
              </div>
              <div className="mt-0.5 text-[19px] font-semibold tracking-tight tabular-nums">
                SAR 312M
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-[9.5px] font-semibold text-white">
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" /> 48 active
                projects
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-white/35">
          <span>
            &copy; {new Date().getFullYear()} {BRAND.productTitle}
          </span>
          <span className="hidden items-center gap-1.5 xl:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> All
            baselines approved
          </span>
        </div>
      </div>
    </aside>
  );
}
