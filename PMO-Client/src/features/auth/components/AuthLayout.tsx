"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BRAND } from "@/lib/brand";
import { AuthShowcase } from "./AuthShowcase";
import { BrandChip } from "./BrandChip";

/**
 * Auth shell — an on-brand product showcase beside the sign-in form.
 *
 * The showcase collapses away below `lg`, leaving a single centred form column.
 * This owns its own scroll container so it stays usable on short viewports.
 */
export function AuthLayout({
  heading,
  subtitle,
  children,
  backHref,
  backLabel = "Back to home",
}: {
  heading: string;
  subtitle: string;
  children: ReactNode;
  /** Renders a back link above the heading (e.g. to the public landing page). */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative h-dvh overflow-y-auto bg-bg-light lg:p-4">
      {/* Theme toggle — top-right across all auth screens */}
      <div className="absolute right-5 top-5 z-30 lg:right-7 lg:top-7">
        <ThemeToggle />
      </div>

      <div className="grid min-h-full lg:min-h-[calc(100dvh-2rem)] lg:grid-cols-[1.08fr_1fr] lg:gap-4">
        <AuthShowcase />

        {/* Form panel */}
        <main className="flex items-center justify-center rounded-[28px] bg-bg-surface px-6 py-12 shadow-xl shadow-black/5 max-lg:bg-bg-light max-lg:shadow-none">
          <div className="w-full max-w-[380px]">
            <div className="mb-8 lg:hidden">
              <BrandChip className="px-2.5 py-1.5 shadow-sm" />
            </div>

            <div className="mb-8">
              {backHref && (
                <Link
                  href={backHref}
                  className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
                </Link>
              )}
              <h2 className="text-[26px] font-semibold tracking-tight text-text-primary">
                {heading}
              </h2>
              <p className="mt-1.5 text-[13.5px] text-text-secondary">
                {subtitle}
              </p>
            </div>

            {children}

            <p className="mt-8 text-center text-[12.5px] text-text-secondary">
              {BRAND.productTitle} &middot; Secure enterprise access
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
