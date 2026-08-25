import Link from "next/link";
import { BRAND } from "@/lib/brand";

/**
 * Brand lockup used in the landing nav and footer. Links back to the landing
 * page root so it doubles as a "home" affordance.
 */
export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group flex min-w-0 items-center gap-2.5 ${className}`}
      aria-label={`${BRAND.productTitle} home`}
    >
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-wujha-primary to-wujha-primary-hover text-base font-bold text-white shadow-md shadow-wujha-primary/25"
      >
        {BRAND.monogram}
      </span>
      <span className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="truncate text-sm font-bold tracking-tight text-text-primary">
          {BRAND.productTitle}
        </span>
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
          {BRAND.suiteName}
        </span>
      </span>
    </Link>
  );
}
