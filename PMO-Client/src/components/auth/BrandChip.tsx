"use client";

import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { BrightMark } from "@/components/brand/bright-logo";

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
        "inline-flex items-center gap-2 overflow-hidden rounded-[10px] bg-on-brand px-3 py-2",
        className,
      )}
    >
      <BrightMark className="h-7 w-7 shrink-0 rounded-lg" />
      <span
        className={cn(
          "text-sm font-bold tracking-tight text-brand-navy",
          textClassName,
        )}
      >
        {BRAND.productTitle}
      </span>
    </span>
  );
}
