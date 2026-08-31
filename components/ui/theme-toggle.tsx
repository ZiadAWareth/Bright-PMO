"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch.
 *
 * The two icons are both rendered and crossfaded by `dark:` classes rather than
 * picking one in JavaScript. That keeps the button correct before hydration —
 * the inline theme script has already set the `dark` class by then — so there
 * is no wrong icon on first paint and no `mounted` flag to guard against a
 * hydration mismatch.
 *
 * `motion-reduce:transition-none` respects a reduced-motion preference; the
 * icons still swap, just without the spin.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      // Both labels would be wrong half the time if chosen at render, so name
      // the control rather than the destination state.
      aria-label="Toggle light and dark mode"
      title="Toggle theme"
      className={cn(
        "relative grid h-[38px] w-[38px] place-items-center rounded-full border border-line bg-surface-2 text-muted transition-colors",
        "hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bright-soft",
        className,
      )}
    >
      <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-transform duration-300 ease-out motion-reduce:transition-none dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-transform duration-300 ease-out motion-reduce:transition-none dark:rotate-0 dark:scale-100" />
    </button>
  );
}

export default ThemeToggle;
