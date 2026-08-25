"use client";

import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/**
 * The product wordmark on a white "logo chip" — invisible on light surfaces,
 * a clean brand card on dark ones (e.g. the auth showcase panel).
 */
export function BrandChip({
  className,
  textClassName,
}: {
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 overflow-hidden rounded-[10px] bg-[#ffffff] px-3 py-2",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-wujha-primary to-wujha-primary-hover text-sm font-bold text-white"
      >
        {BRAND.monogram}
      </span>
      <span
        className={cn(
          "text-sm font-bold tracking-tight text-[#0b1220]",
          textClassName,
        )}
      >
        {BRAND.productTitle}
      </span>
    </span>
  );
}
