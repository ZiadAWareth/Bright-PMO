import { BRAND } from "@/lib/brand";
import { BrandLockup } from "./BrandLockup";

/** Landing footer. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
        <BrandLockup />
        <p className="text-center text-xs text-text-secondary sm:text-right">
          &copy; {new Date().getFullYear()} {BRAND.productTitle}. All rights
          reserved.
          <span className="mx-2 opacity-40">&middot;</span>
          Enterprise project management
        </p>
      </div>
    </footer>
  );
}
