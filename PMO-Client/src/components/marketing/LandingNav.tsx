import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BrandLockup } from "./BrandLockup";

const LINKS = [
  { href: "#modules", label: "Modules" },
  { href: "#workflow", label: "Workflow" },
  { href: "#platform", label: "Platform" },
];

/**
 * Floating, frosted top navigation for the landing page — a detached rounded
 * card pinned just below the top edge as the page scrolls.
 */
export function LandingNav() {
  return (
    <header className="sticky top-4 z-40 px-4">
      <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-2xl border border-border bg-bg-surface/80 px-4 shadow-lg shadow-black/5 backdrop-blur-md supports-[backdrop-filter]:bg-bg-surface/65 sm:px-6">
        <BrandLockup />

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex">
          {LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/auth/signin"
            className="group inline-flex h-9 items-center gap-1.5 rounded-xl bg-bright-primary px-4 text-sm font-semibold text-white shadow-md shadow-bright-primary/20 transition-colors hover:bg-bright-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bright-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
          >
            Sign in
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
