"use client";

/**
 * Dependency-free SVG chart primitives for the analytics dashboard.
 *
 * Drawn by hand rather than pulled from a chart library so every mark inherits
 * the app's theme tokens directly — grid lines, labels and surfaces all read
 * from the same CSS custom properties as the rest of the UI, so light/dark
 * switching needs no per-chart configuration.
 */

import { useId, useMemo, useState } from "react";

const GRID_STROKE = "var(--border)";
const TEXT_MUTED = "rgb(var(--text-secondary-rgb))";
const TEXT_STRONG = "rgb(var(--text-primary-rgb))";
const SURFACE = "rgb(var(--surface-bg-rgb))";
const BRAND = "rgb(var(--bright-primary-rgb))";

type Series = { label: string; color: string; values: number[] };

/** Bars stop widening past this so a one-category chart is not a giant slab. */
const MAX_BAR_WIDTH = 72;

/**
 * Rounded axis bounds and evenly spaced ticks.
 *
 * A naive `max/4` split produces uneven labels (0, 1.5, 3, 4.5, 6) and, once
 * rounded for display, outright duplicates — which is what an all-zero series
 * used to render as ("0%, 0%, 1%, 1%, 1%"). Snapping the step to a 1/2/5×10ⁿ
 * value gives ticks that read cleanly at any magnitude.
 */
function niceScale(max: number, integer = false): { max: number; ticks: number[] } {
  const target = 4;
  if (!(max > 0)) {
    return integer
      ? { max: target, ticks: [0, 1, 2, 3, 4] }
      : { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
  }
  const rough = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  let step =
    (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) *
    magnitude;
  if (integer) step = Math.max(1, Math.round(step));
  const count = Math.ceil(max / step);
  return {
    max: step * count,
    ticks: Array.from({ length: count + 1 }, (_, i) => i * step),
  };
}

// ── Card shell ─────────────────────────────────────────────────────────────
interface ChartCardProps {
  title: string;
  subtitle?: string;
  legend?: { label: string; color: string }[];
  action?: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
  emptyLabel?: string;
}

export function ChartCard({
  title,
  subtitle,
  legend,
  action,
  children,
  empty,
  emptyLabel = "No data for this period",
}: ChartCardProps) {
  return (
    <section className="group relative overflow-hidden rounded-2xl border border-border bg-bg-surface p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-text-secondary">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-text-secondary/80">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {legend && (
            <ul className="hidden items-center gap-3 sm:flex">
              {legend.map((l) => (
                <li
                  key={l.label}
                  className="flex items-center gap-1.5 text-xs text-text-secondary"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: l.color }}
                  />
                  {l.label}
                </li>
              ))}
            </ul>
          )}
          {action}
        </div>
      </div>

      {empty ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-text-secondary/70">
          {emptyLabel}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// ── Area / line chart ──────────────────────────────────────────────────────
interface AreaChartProps {
  series: Series[];
  labels: string[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function AreaChart({
  series,
  labels,
  height = 220,
  formatValue,
}: AreaChartProps) {
  const gradId = useId();
  const padding = { top: 20, right: 16, bottom: 32, left: 52 };
  const width = 720;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { min, max } = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    if (!all.length) return { min: 0, max: 1 };
    const lo = Math.min(0, ...all);
    const hi = Math.max(...all, 1);
    const pad = (hi - lo) * 0.12 || 1;
    return { min: lo, max: hi + pad };
  }, [series]);

  const xStep = labels.length > 1 ? innerW / (labels.length - 1) : innerW;
  const yScale = (v: number) =>
    padding.top + innerH - ((v - min) / (max - min)) * innerH;
  const xScale = (i: number) => padding.left + i * xStep;

  const fmt = formatValue ?? compact;
  // Drop ticks whose formatted label repeats the one below it — with small
  // integer series (0–3 tasks a month) several raw ticks round to the same text.
  const gridValues = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4)
    .filter((v, i, all) => i === 0 || fmt(v) !== fmt(all[i - 1]!));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend chart"
        className="w-full"
        style={{ height }}
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`${gradId}-fill-${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {gridValues.map((v, i) => {
          const y = yScale(v);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke={GRID_STROKE}
                strokeDasharray="3 4"
              />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill={TEXT_MUTED}>
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {labels.map((label, i) => (
          <text
            key={i}
            x={xScale(i)}
            y={height - 10}
            textAnchor="middle"
            fontSize="10"
            fill={TEXT_MUTED}
          >
            {label}
          </text>
        ))}

        {series.map((s, idx) => {
          const points = s.values.map((v, i) => [xScale(i), yScale(v)] as const);
          if (!points.length) return null;
          const first = points[0]!;
          const last = points[points.length - 1]!;
          const linePath = points
            .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
            .join(" ");
          const fillPath = `${linePath} L${last[0]},${yScale(min)} L${first[0]},${yScale(min)} Z`;
          return (
            <g key={idx}>
              <path d={fillPath} fill={`url(#${gradId}-fill-${idx})`} />
              <path
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={hoverIdx === i ? 4.5 : 0}
                  fill={SURFACE}
                  stroke={s.color}
                  strokeWidth="2"
                />
              ))}
            </g>
          );
        })}

        {labels.map((_, i) => (
          <rect
            key={i}
            x={xScale(i) - xStep / 2}
            y={padding.top}
            width={xStep}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}

        {hoverIdx !== null && (
          <line
            x1={xScale(hoverIdx)}
            x2={xScale(hoverIdx)}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke={BRAND}
            strokeOpacity="0.5"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {hoverIdx !== null && (
        <ChartTooltip
          x={(xScale(hoverIdx) / width) * 100}
          label={labels[hoverIdx] ?? ""}
          rows={series.map((s) => ({
            color: s.color,
            label: s.label,
            value: fmt(s.values[hoverIdx] ?? 0),
          }))}
        />
      )}
    </div>
  );
}

// ── Single-series bar chart ────────────────────────────────────────────────
interface BarChartProps {
  data: { label: string; value: number; sub?: string; color?: string }[];
  height?: number;
  formatValue?: (v: number) => string;
  baseColor?: string;
}

export function BarChart({
  data,
  height = 220,
  formatValue,
  baseColor = BRAND,
}: BarChartProps) {
  const padding = { top: 24, right: 16, bottom: 38, left: 52 };
  const width = 720;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const rawMax = Math.max(0, ...data.map((d) => d.value));
  const { max, ticks } = niceScale(rawMax, Number.isInteger(rawMax));
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.min(MAX_BAR_WIDTH, slot * 0.6);
  const yScale = (v: number) => padding.top + innerH - (v / max) * innerH;
  const fmt = formatValue ?? compact;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height }}
      role="img"
    >
      {ticks.map((v, i) => {
        const y = yScale(v);
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke={GRID_STROKE}
              strokeDasharray="3 4"
            />
            <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill={TEXT_MUTED}>
              {fmt(v)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = padding.left + i * slot + (slot - barW) / 2;
        const y = yScale(d.value);
        const h = padding.top + innerH - y;
        const color = d.color ?? baseColor;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(2, h)} rx={6} fill={color}>
              <title>{`${d.label}: ${fmt(d.value)}${d.sub ? ` (${d.sub})` : ""}`}</title>
            </rect>
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={TEXT_STRONG}
            >
              {fmt(d.value)}
            </text>
            <text
              x={x + barW / 2}
              y={height - 20}
              textAnchor="middle"
              fontSize="11"
              fill={TEXT_MUTED}
            >
              {d.label}
            </text>
            {d.sub && (
              <text
                x={x + barW / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize="9.5"
                fill={TEXT_MUTED}
                opacity="0.75"
              >
                {d.sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Grouped bar chart (planned vs actual) ──────────────────────────────────
interface GroupedBarChartProps {
  data: { label: string; values: number[]; sub?: string }[];
  colors: string[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function GroupedBarChart({
  data,
  colors,
  height = 220,
  formatValue,
}: GroupedBarChartProps) {
  const padding = { top: 24, right: 16, bottom: 40, left: 56 };
  const width = 720;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const seriesCount = Math.max(1, colors.length);
  const rawMax = Math.max(0, ...data.flatMap((d) => d.values));
  const { max, ticks } = niceScale(rawMax);
  const slot = innerW / Math.max(1, data.length);
  const groupW = Math.min(MAX_BAR_WIDTH * seriesCount, slot * 0.66);
  const barW = groupW / seriesCount;

  const yScale = (v: number) => padding.top + innerH - (v / max) * innerH;
  const fmt = formatValue ?? compact;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height }}
      role="img"
    >
      {ticks.map((v, i) => {
        const y = yScale(v);
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke={GRID_STROKE}
              strokeDasharray="3 4"
            />
            <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill={TEXT_MUTED}>
              {fmt(v)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const groupX = padding.left + i * slot + (slot - groupW) / 2;
        return (
          <g key={i}>
            {d.values.map((v, si) => {
              const x = groupX + si * barW;
              const y = yScale(v);
              const h = padding.top + innerH - y;
              return (
                <rect
                  key={si}
                  x={x + 1}
                  y={y}
                  width={Math.max(2, barW - 2)}
                  height={Math.max(2, h)}
                  rx={4}
                  fill={colors[si] ?? BRAND}
                >
                  <title>{`${d.label}: ${fmt(v)}`}</title>
                </rect>
              );
            })}
            <text
              x={groupX + groupW / 2}
              y={height - 22}
              textAnchor="middle"
              fontSize="10.5"
              fill={TEXT_MUTED}
            >
              {truncate(d.label, 16)}
            </text>
            {d.sub && (
              <text
                x={groupX + groupW / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="9.5"
                fill={TEXT_MUTED}
                opacity="0.75"
              >
                {d.sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Diverging horizontal bars (schedule variance) ──────────────────────────
interface DivergingBarChartProps {
  data: { label: string; value: number; sub?: string }[];
  formatValue?: (v: number) => string;
  positiveColor?: string;
  negativeColor?: string;
}

/**
 * Horizontal bars around a zero axis. Used for "ahead of / behind plan", where
 * the sign carries the meaning and a normal bar chart would lose it.
 */
export function DivergingBarChart({
  data,
  formatValue,
  positiveColor = "var(--success)",
  negativeColor = "var(--danger)",
}: DivergingBarChartProps) {
  const fmt = formatValue ?? ((v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`);
  const magnitude = Math.max(1, ...data.map((d) => Math.abs(d.value)));

  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = (Math.abs(d.value) / magnitude) * 50;
        const positive = d.value >= 0;
        return (
          <li key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-text-primary">
                  {d.label}
                </span>
                {d.sub && (
                  <span className="shrink-0 text-[11px] text-text-secondary">{d.sub}</span>
                )}
              </div>
              <div className="relative mt-1.5 h-2.5 w-full rounded-full bg-bg-surface-alt">
                {/* Zero axis sits at the midpoint; bars grow out from it. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-[-3px] left-1/2 w-px bg-border"
                />
                <span
                  className="absolute top-0 h-full rounded-full transition-all"
                  style={{
                    background: positive ? positiveColor : negativeColor,
                    width: `${pct}%`,
                    left: positive ? "50%" : `${50 - pct}%`,
                  }}
                />
              </div>
            </div>
            <span
              className="w-16 text-right text-[13px] font-semibold tabular-nums"
              style={{ color: positive ? positiveColor : negativeColor }}
            >
              {fmt(d.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Donut chart ────────────────────────────────────────────────────────────
interface DonutChartProps {
  data: { label: string; value: number; color?: string; sub?: string }[];
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (v: number) => string;
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  formatValue,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 72;
  const stroke = 22;
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const fmt = formatValue ?? compact;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const fraction = total > 0 ? d.value / total : 0;
    const dashLen = fraction * circumference;
    const dashOffset = cumulative * circumference;
    cumulative += fraction;
    return {
      ...d,
      color: d.color ?? DONUT_PALETTE[i % DONUT_PALETTE.length]!,
      dashLen,
      dashOffset,
      fraction,
    };
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          width={size}
          height={size}
          role="img"
        >
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={GRID_STROKE} strokeWidth={stroke} />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${s.dashLen} ${circumference - s.dashLen}`}
              strokeDashoffset={-s.dashOffset}
            >
              <title>{`${s.label}: ${fmt(s.value)}`}</title>
            </circle>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">
              {centerLabel}
            </span>
          )}
          <span className="text-xl font-semibold text-text-primary">
            {centerValue ?? fmt(total)}
          </span>
        </div>
      </div>

      <ul className="min-w-[180px] flex-1 space-y-2">
        {segments.length === 0 && (
          <li className="text-sm text-text-secondary/70">Nothing to show</li>
        )}
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="truncate text-text-primary">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums text-text-secondary">
              <span>{s.sub ?? fmt(s.value)}</span>
              <span className="text-text-secondary/60">
                {(s.fraction * 100).toFixed(0)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Sparkline (KPI cards) ──────────────────────────────────────────────────
interface SparklineProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  values,
  color = BRAND,
  width = 280,
  height = 42,
}: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const last = pts[pts.length - 1]!;
  const first = pts[0]!;
  const area = `${path} L${last[0]},${height} L${first[0]},${height} Z`;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={area} fill={color} opacity="0.14" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}

// ── tooltip + helpers ──────────────────────────────────────────────────────
function ChartTooltip({
  x,
  label,
  rows,
}: {
  x: number;
  label: string;
  rows: { color: string; label: string; value: string }[];
}) {
  return (
    <div
      className="pointer-events-none absolute -top-2 z-20 -translate-x-1/2 rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs shadow-lg"
      style={{ left: `${x}%` }}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />
            {r.label}
          </span>
          <span className="font-semibold tabular-nums text-text-primary">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Compact number formatting shared by every axis and label. */
export function compact(n: number): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

/** Whole counts — avoids "1.0" on axes that can only hold integers. */
export const formatCount = (n: number) => Math.round(n).toLocaleString();

/**
 * Series colours for charts.
 *
 * Recharts takes colours as props and never sees a Tailwind class, so these
 * resolve the CSS variables at use time via `var()`. That is what lets a chart
 * follow a theme switch: the variables are redefined under `.dark`, and the
 * browser repaints the SVG without React re-rendering anything.
 *
 * Ordered for maximum separation between adjacent series rather than by hue.
 */
export const DONUT_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-6)",
  "var(--chart-5)",
  "var(--chart-7)",
  "var(--chart-8)",
];
