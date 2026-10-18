/**
 * Utilities for WBS progress rollup with optional per-WBS weights.
 * When no weights are set, behavior is simple average (existing flow).
 * When some WBS have weights, they use those; the remainder of 100% is split equally among unweighted items.
 */

export interface ProgressWeightItem {
  progress: number;
  weight?: number | null;
}

/**
 * Compute weighted average progress (0-100) from a list of progress + optional weight.
 * - All weights null/undefined → simple average (current behavior).
 * - Some have weight → use their weight; remainder of 100% is split equally among unweighted.
 * - Weights are treated as 0-100. If explicit weights sum > 100, they are normalized to 100 and unweighted get 0.
 */
export function weightedProgressAverage(items: ProgressWeightItem[]): number {
  if (items.length === 0) return 0;

  const withWeight = items.filter((i) => i.weight != null && i.weight > 0);
  const withoutWeight = items.filter((i) => i.weight == null || i.weight <= 0);
  const explicitTotal = withWeight.reduce((s, i) => s + (i.weight ?? 0), 0);
  const unweightedCount = withoutWeight.length;

  if (withWeight.length === 0) {
    // No weights → simple average
    const sum = items.reduce((s, i) => s + i.progress, 0);
    return Math.round((sum / items.length) * 100) / 100;
  }

  // Effective weight per item (out of 100)
  let remainder = Math.max(0, 100 - explicitTotal);
  const weightPerUnweighted = unweightedCount > 0 ? remainder / unweightedCount : 0;

  let weightedSum = 0;
  for (const item of withWeight) {
    let effective = item.weight ?? 0;
    if (explicitTotal > 100) effective = (effective / explicitTotal) * 100;
    weightedSum += (item.progress * effective) / 100;
  }
  for (const item of withoutWeight) {
    weightedSum += (item.progress * weightPerUnweighted) / 100;
  }

  return Math.round(weightedSum * 100) / 100;
}
