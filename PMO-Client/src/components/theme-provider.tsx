"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useTheme as useNextTheme } from "next-themes";
import type { ReactNode } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-script";

/**
 * The single source of truth for the app's theme.
 *
 * Before this existed the app had three implementations that could disagree:
 * a `useTheme` hook in `hooks/`, a self-contained `ThemeToggleButton` holding
 * its own state, and scattered `isDarkMode` booleans read from the DOM. Each
 * kept separate state over the same localStorage key, so toggling in one place
 * left the others stale until a reload.
 *
 * `attribute="class"` is what Tailwind's `dark:` variants key off.
 * `enableSystem` lets "system" follow the OS, and `disableTransitionOnChange`
 * suppresses the CSS transition on `body` during the swap — without it every
 * colour on screen animates at once and the change reads as a lag rather than
 * a switch.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

/**
 * Theme state for components.
 *
 * Prefer `dark:` utility classes over reading this — a class costs nothing and
 * works before hydration. Reach for the hook only when the value has to reach
 * JavaScript, such as a charting library that takes colours as props.
 *
 * `resolvedTheme` is "light" or "dark" — never "system" — and is `undefined`
 * on the server and the first client render, which is what stops a hydration
 * mismatch. Treat undefined as "not known yet" rather than as light.
 */
export function useTheme() {
  const { theme, resolvedTheme, setTheme, systemTheme } = useNextTheme();
  return {
    /** The user's preference: "light", "dark" or "system". */
    theme,
    /** What is actually on screen. Undefined until mounted. */
    resolvedTheme,
    /** True only once mounted and dark — safe to use in class expressions. */
    isDark: resolvedTheme === "dark",
    setTheme,
    systemTheme,
    toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
  };
}

export default ThemeProvider;
