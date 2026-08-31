"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FormSection } from "@/components/ui/form-shell";
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  XCircle,
  MinusCircle,
} from "lucide-react";
import axios from "axios";

const metricDefinitions = [
  {
    key: "planned_cost_per_m2",
    label: "Planned Cost per m²",
    format: (v: number) =>
      `OMR ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    direction: "below", // Lower is better
  },
  {
    key: "actual_cost_per_m2",
    label: "Actual Cost per m²",
    format: (v: number) =>
      `OMR ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    direction: "below", // Lower is better
  },
  {
    key: "planned_duration_days",
    label: "Planned Duration (days)",
    format: (v: number) => `${v} days`,
    direction: "below", // Lower is better
  },
  {
    key: "actual_duration_days",
    label: "Actual Duration (days)",
    format: (v: number) => `${v} days`,
    direction: "below", // Lower is better
  },
  {
    key: "project_roi",
    label: "ROI (%)",
    format: (v: number) => `${v.toFixed(2)}%`,
    direction: "above", // Higher is better
  },
  {
    key: "cost_overrun_percent",
    label: "Cost Overrun (%)",
    format: (v: number) => `${v.toFixed(2)}%`,
    direction: "below", // Lower is better
  },
  {
    key: "average_task_delay_days",
    label: "Avg. Task Delay (days)",
    format: (v: number) => `${v.toFixed(2)} days`,
    direction: "below", // Lower is better
  },
  {
    key: "critical_path_delays",
    label: "Critical Path Delays (tasks)",
    format: (v: number) => v.toFixed(0), // Whole numbers for task counts
    direction: "below", // Lower is better
  },
  {
    key: "average_task_completion_rate",
    label: "Avg. Task Completion Rate (%)",
    format: (v: number) => `${v.toFixed(2)}%`,
    direction: "above", // Higher is better
  },
  {
    key: "efficiency_ratio",
    label: "Efficiency Ratio",
    format: (v: number) => v.toFixed(2),
    direction: "below", // Lower is better (closer to 1.0)
  },
  {
    key: "total_budget_threshold_violations",
    label: "Budget Threshold Violations",
    format: (v: number) => v.toFixed(0), // Whole numbers for violation counts
    direction: "below", // Lower is better
  },
  {
    key: "cpi",
    label: "CPI",
    format: (v: number) => v.toFixed(2),
    direction: "above", // Higher is better
  },
  {
    key: "spi",
    label: "SPI",
    format: (v: number) => v.toFixed(2),
    direction: "above", // Higher is better
  },
];

function compareMetric(
  metric: string,
  projectValue: any,
  benchmark: any,
  direction: string,
  metrics: any
) {
  switch (metric) {
    case "planned_cost_per_m2":
    case "actual_cost_per_m2":
      return direction === "below"
        ? projectValue <= benchmark.cost_per_m2
        : projectValue >= benchmark.cost_per_m2;
    case "planned_duration_days":
    case "actual_duration_days": {
      if (benchmark.duration_per_m2 && metrics && metrics.size) {
        const expectedDuration = benchmark.duration_per_m2 * metrics.size;
        return direction === "below"
          ? projectValue <= expectedDuration
          : projectValue >= expectedDuration;
      }
      return null;
    }
    case "project_roi":
      return direction === "above"
        ? projectValue >= benchmark.expected_roi
        : projectValue <= benchmark.expected_roi;
    case "cost_overrun_percent":
      return direction === "below"
        ? projectValue <= benchmark.cost_overrun_max
        : projectValue >= benchmark.cost_overrun_max;
    case "average_task_delay_days":
      return benchmark.avg_task_delay_max == null
        ? null
        : direction === "below"
        ? projectValue <= benchmark.avg_task_delay_max
        : projectValue >= benchmark.avg_task_delay_max;
    case "critical_path_delays":
      return benchmark.critical_path_delay_max == null
        ? null
        : direction === "below"
        ? projectValue <= benchmark.critical_path_delay_max
        : projectValue >= benchmark.critical_path_delay_max;
    case "average_task_completion_rate":
      return benchmark.expected_task_completion_rate == null
        ? null
        : direction === "above"
        ? projectValue >= benchmark.expected_task_completion_rate
        : projectValue <= benchmark.expected_task_completion_rate;
    case "efficiency_ratio":
      return direction === "below"
        ? projectValue <= benchmark.efficiency_ratio
        : projectValue >= benchmark.efficiency_ratio;
    case "total_budget_threshold_violations":
      return benchmark.max_budget_threshold_violation == null
        ? null
        : direction === "below"
        ? projectValue <= benchmark.max_budget_threshold_violation
        : projectValue >= benchmark.max_budget_threshold_violation;
    case "cpi":
      return direction === "above"
        ? projectValue >= benchmark.cpi_threshold
        : projectValue <= benchmark.cpi_threshold;
    case "spi":
      return direction === "above"
        ? projectValue >= benchmark.spi_threshold
        : projectValue <= benchmark.spi_threshold;
    default:
      return null;
  }
}

function calculatePercentageDifference(
  projectValue: number,
  benchmarkValue: number,
  direction: string
) {
  if (projectValue == null || benchmarkValue == null || benchmarkValue === 0) {
    return null;
  }

  const difference = ((projectValue - benchmarkValue) / benchmarkValue) * 100;

  // For metrics where lower is better (direction: "below")
  if (direction === "below") {
    return {
      percentage: Math.abs(difference),
      isGood: difference <= 0, // negative difference is good (project value is lower)
      text:
        difference <= 0
          ? `${Math.abs(difference).toFixed(2)}% better`
          : `${difference.toFixed(2)}% worse`,
    };
  }

  // For metrics where higher is better (direction: "above")
  return {
    percentage: Math.abs(difference),
    isGood: difference >= 0, // positive difference is good (project value is higher)
    text:
      difference >= 0
        ? `${difference.toFixed(2)}% better`
        : `${Math.abs(difference).toFixed(2)}% worse`,
  };
}

const BaselinePage = () => {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showNavButtons, setShowNavButtons] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [benchmark, setBenchmark] = useState<any>(null);
  const [comparisonSummary, setComparisonSummary] = useState({
    within: 0,
    total: 0,
    better: 0,
    worse: 0,
    avgDifference: 0,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      setShowNavButtons(from === "setup" || from === "previous");
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      // Fetch project metrics
      fetch(`/api/projects/${projectId}/metrics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          setMetrics(data);
          console.log("Project Metrics:", data);
        })
        .catch((err) => {
          console.error("Error fetching metrics:", err);
        });
      // Fetch project benchmark
      fetch(`/api/projects/${projectId}/benchmark`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          setBenchmark(data);
          console.log("Project Benchmark:", data);
        })
        .catch((err) => {
          console.error("Error fetching benchmark:", err);
        });
    }
  }, [projectId]);

  useEffect(() => {
    if (metrics && benchmark) {
      let within = 0,
        total = 0,
        better = 0,
        worse = 0;
      let totalDifference = 0,
        validDifferences = 0;

      for (const def of metricDefinitions) {
        if (metrics[def.key] != null && benchmark) {
          const projectValue = metrics[def.key];
          const benchmarkValue = (() => {
            switch (def.key) {
              case "planned_cost_per_m2":
              case "actual_cost_per_m2":
                return benchmark.cost_per_m2;
              case "planned_duration_days":
              case "actual_duration_days":
                return benchmark.duration_per_m2 && metrics.size
                  ? benchmark.duration_per_m2 * metrics.size
                  : null;
              case "project_roi":
                return benchmark.expected_roi;
              case "cost_overrun_percent":
                return benchmark.cost_overrun_max;
              case "average_task_delay_days":
                return benchmark.avg_task_delay_max;
              case "critical_path_delays":
                return benchmark.critical_path_delay_max;
              case "average_task_completion_rate":
                return benchmark.expected_task_completion_rate;
              case "efficiency_ratio":
                return benchmark.efficiency_ratio;
              case "total_budget_threshold_violations":
                return benchmark.max_budget_threshold_violation;
              case "cpi":
                return benchmark.cpi_threshold;
              case "spi":
                return benchmark.spi_threshold;
              default:
                return null;
            }
          })();

          const ok = compareMetric(
            def.key,
            projectValue,
            benchmark,
            def.direction,
            metrics
          );
          const percentDiff = calculatePercentageDifference(
            projectValue,
            benchmarkValue,
            def.direction
          );

          if (ok !== null) {
            total++;
            if (ok) within++;
          }

          if (percentDiff) {
            if (percentDiff.isGood) better++;
            else worse++;
            totalDifference += percentDiff.percentage;
            validDifferences++;
          }
        }
      }

      const avgDifference =
        validDifferences > 0 ? totalDifference / validDifferences : 0;
      setComparisonSummary({ within, total, better, worse, avgDifference });
    }
  }, [metrics, benchmark]);

  const handleBackButton = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      if (from === "previous") {
        router.push(`/projects/${projectId}/setup`);
      } else {
        router.push(`/projects/${projectId}`);
      }
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      await axios.patch(
        `/api/projects/${projectId}/setup`,
        { baseline: true },
        token
          ? {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined
      );
      setDone(true);
      router.push(`/projects/${projectId}/approval?from=previous`); // Or `/projects/${projectId}/setup` if you want to go to setup overview
    } catch (e) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Baseline Comparison"
      subtitle="How this project's metrics compare against the benchmark"
      backHref={`/projects/${projectId}/setup`}
      backLabel="Back to Setup"
    >
      {/* Summary */}
      {metrics && benchmark && (
        <FormSection title="Comparison Summary" className="mb-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
            {(
              [
                [
                  "text-info",
                  `${comparisonSummary.within}/${comparisonSummary.total}`,
                  "Metrics within benchmark",
                ],
                ["text-success", comparisonSummary.better, "Metrics performing better"],
                ["text-danger", comparisonSummary.worse, "Metrics performing worse"],
                [
                  "text-ink",
                  `${comparisonSummary.avgDifference.toFixed(2)}%`,
                  "Average difference",
                ],
              ] as [string, React.ReactNode, string][]
            ).map(([tone, value, label]) => (
              <div key={label} className="min-w-0">
                <p className={`text-[22px] font-semibold tabular-nums ${tone}`}>
                  {value}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">{label}</p>
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* Metrics Table */}
      {metrics && benchmark && (
        <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-ink-3">
                  Metric
                </th>
                <th className="px-4 py-3 text-center font-semibold text-ink-3">
                  Your Project
                </th>
                <th className="px-4 py-3 text-center font-semibold text-ink-3">
                  Benchmark
                </th>
                <th className="px-4 py-3 text-center font-semibold text-ink-3">
                  Difference
                </th>
                <th className="px-4 py-3 text-center font-semibold text-ink-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {metricDefinitions.map((def) => {
                const projectValue = metrics[def.key];
                const benchmarkValue = (() => {
                  switch (def.key) {
                    case "planned_cost_per_m2":
                    case "actual_cost_per_m2":
                      return benchmark.cost_per_m2;
                    case "planned_duration_days":
                    case "actual_duration_days":
                      return benchmark.duration_per_m2 && metrics.size
                        ? benchmark.duration_per_m2 * metrics.size
                        : null;
                    case "project_roi":
                      return benchmark.expected_roi;
                    case "cost_overrun_percent":
                      return benchmark.cost_overrun_max;
                    case "average_task_delay_days":
                      return benchmark.avg_task_delay_max;
                    case "critical_path_delays":
                      return benchmark.critical_path_delay_max;
                    case "average_task_completion_rate":
                      return benchmark.expected_task_completion_rate;
                    case "efficiency_ratio":
                      return benchmark.efficiency_ratio;
                    case "total_budget_threshold_violations":
                      return benchmark.max_budget_threshold_violation;
                    case "cpi":
                      return benchmark.cpi_threshold;
                    case "spi":
                      return benchmark.spi_threshold;
                    default:
                      return null;
                  }
                })();
                const ok = compareMetric(
                  def.key,
                  projectValue,
                  benchmark,
                  def.direction,
                  metrics
                );
                const percentDiff = calculatePercentageDifference(
                  projectValue,
                  benchmarkValue,
                  def.direction
                );

                return (
                  <tr
                    key={def.key}
                    className="border-t hover:bg-surface-2"
                  >
                    <td className="px-4 py-3 font-medium text-ink-3">
                      {def.label}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {projectValue != null ? (
                        def.format ? (
                          def.format(projectValue)
                        ) : typeof projectValue === "number" ? (
                          projectValue.toFixed(2)
                        ) : (
                          projectValue
                        )
                      ) : (
                        <span className="text-faint">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {benchmarkValue != null ? (
                        def.format ? (
                          def.format(benchmarkValue)
                        ) : typeof benchmarkValue === "number" ? (
                          benchmarkValue.toFixed(2)
                        ) : (
                          benchmarkValue
                        )
                      ) : (
                        <span className="text-faint">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {percentDiff ? (
                        <div className="flex items-center justify-center space-x-2">
                          <span
                            className={`font-medium ${
                              percentDiff.isGood
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {percentDiff.text}
                          </span>
                          {percentDiff.isGood ? (
                            <div className="w-2 h-2 rounded-full bg-success"></div>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-danger"></div>
                          )}
                        </div>
                      ) : (
                        <span className="text-faint">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ok === null ? (
                        <MinusCircle className="inline w-5 h-5 text-faint" />
                      ) : ok ? (
                        <CheckCircle className="inline w-5 h-5 text-success" />
                      ) : (
                        <XCircle className="inline w-5 h-5 text-danger" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
      {/* No data fallback */}
      {(!metrics || !benchmark) && (
        <div className="text-center text-muted my-12">
          Loading metrics and benchmark...
        </div>
      )}
      {/* Navigation Buttons */}
      {showNavButtons && (
        <div className="mt-8 flex justify-between w-full max-w-2xl mx-auto">
          <button
            onClick={handleBackButton}
            className="flex items-center space-x-2 px-6 py-3 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
            disabled={loading}
          >
            <ArrowLeft size={16} />
            <span>Back to Setup</span>
          </button>
          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-6 py-3 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
            disabled={loading || done}
          >
            <span>{"Next: Request Approvals"}</span>
            <Plus size={16} />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default BaselinePage;
