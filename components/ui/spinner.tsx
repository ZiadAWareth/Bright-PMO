'use client';

import { cn } from '@/lib/utils';

/**
 * Spinner — the single canonical loading indicator for the whole app.
 * A branded dual-ring spinner: a faint full track, a fast top arc, and a slower
 * counter-rotating inner arc.
 *
 * It draws in `currentColor` and defaults to the brand orange. The default
 * matters: `body` sets `color: var(--ink)`, so a spinner with no colour of its
 * own would inherit near-black rather than reading as a brand element. Callers
 * that need a different colour — white on a dark button, for instance — pass
 * `className="text-white"`, which wins because it comes later in `cn()`.
 */
export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  const bw = Math.max(2, Math.round(size / 8)); // border scales with size
  const inset = Math.round(size * 0.16);
  return (
    <span
      className={cn('relative inline-block shrink-0 align-[-0.125em] text-bright-primary', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      {/* faint full track */}
      <span className="absolute inset-0 rounded-full opacity-20" style={{ border: `${bw}px solid currentColor` }} />
      {/* fast outer arc */}
      <span
        className="absolute inset-0 animate-spin rounded-full [animation-duration:0.9s]"
        style={{ border: `${bw}px solid transparent`, borderTopColor: 'currentColor' }}
      />
      {/* slower counter-rotating inner arc */}
      <span
        className="absolute animate-spin rounded-full opacity-50 [animation-direction:reverse] [animation-duration:1.5s]"
        style={{ inset, border: `${bw}px solid transparent`, borderBottomColor: 'currentColor' }}
      />
    </span>
  );
}

/**
 * LoadingState — a big, centered spinner that fills the screen (or a section in
 * `compact` mode) while data loads. Intentionally text-free: the spinner alone
 * communicates loading across every screen. `label` is accepted for backward
 * compatibility but no longer rendered.
 */
export function LoadingState({
  label: _label,
  className,
  compact = false,
}: {
  /** @deprecated no longer rendered — the spinner speaks for itself. */
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      aria-live="polite"
      className={cn(
        'flex w-full items-center justify-center',
        compact ? 'py-16' : 'min-h-[60vh] py-20',
        className,
      )}
    >
      <Spinner size={compact ? 40 : 56} className="text-bright-primary" />
    </div>
  );
}
