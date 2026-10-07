"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * The application's Toaster (sonner), theme-aware and matched to Bright's
 * palette.
 *
 * Toasts sit on the ordinary card surface with app text and take a subtle
 * coloured left accent plus a tinted icon per type — not a full green/red
 * fill. A saturated fill is louder than the message usually warrants, and
 * white-on-colour is the one combination the theme tokens cannot follow into
 * dark mode.
 *
 * Mount this once, in the root layout. Importing `Toaster` straight from
 * `sonner` bypasses the theme and is what this wrapper exists to prevent.
 */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "light"}
      position="bottom-right"
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-[12px] group-[.toaster]:border group-[.toaster]:border-line group-[.toaster]:bg-surface group-[.toaster]:text-ink group-[.toaster]:shadow-card-lg",
          title: "group-[.toast]:font-semibold group-[.toast]:text-ink",
          description: "group-[.toast]:text-muted",
          success:
            "group-[.toast]:border-l-[3px] group-[.toast]:border-l-success [&_[data-icon]]:text-success",
          error:
            "group-[.toast]:border-l-[3px] group-[.toast]:border-l-danger [&_[data-icon]]:text-danger",
          warning:
            "group-[.toast]:border-l-[3px] group-[.toast]:border-l-bright [&_[data-icon]]:text-bright-deep",
          info: "group-[.toast]:border-l-[3px] group-[.toast]:border-l-info [&_[data-icon]]:text-info",
          actionButton:
            "group-[.toast]:bg-bright group-[.toast]:text-on-brand",
          cancelButton:
            "group-[.toast]:bg-surface-2 group-[.toast]:text-muted",
          closeButton:
            "group-[.toast]:border-line group-[.toast]:bg-surface group-[.toast]:text-muted",
        },
      }}
      {...props}
    />
  );
}
