"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
    <DashboardLayout title="Baseline Management">
      {/* Header with back button and Baseline title */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={handleBackButton}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Baseline Comparison
        </h1>
      </div>
      {/* Summary */}
      {metrics && benchmark && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {comparisonSummary.within}/{comparisonSummary.total}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              Metrics within benchmark
            </div>
          </div>

          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {comparisonSummary.better}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              Metrics performing better
            </div>
          </div>

          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">
              {comparisonSummary.worse}
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">
              Metrics performing worse
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {comparisonSummary.avgDifference.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Average difference
            </div>
          </div>
        </div>
      )}
      {/* Metrics Table */}
      {metrics && benchmark && (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg bg-white dark:bg-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                  Metric
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">
                  Your Project
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">
                  Benchmark
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">
                  Difference
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">
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
                    className="border-t hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
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
                        <span className="text-gray-400">N/A</span>
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
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {percentDiff ? (
                        <div className="flex items-center justify-center space-x-2">
                          <span
                            className={`font-medium ${
                              percentDiff.isGood
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {percentDiff.text}
                          </span>
                          {percentDiff.isGood ? (
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ok === null ? (
                        <MinusCircle className="inline w-5 h-5 text-gray-400" />
                      ) : ok ? (
                        <CheckCircle className="inline w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="inline w-5 h-5 text-red-600" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* No data fallback */}
      {(!metrics || !benchmark) && (
        <div className="text-center text-gray-500 dark:text-gray-400 my-12">
          Loading metrics and benchmark...
        </div>
      )}
      {/* Navigation Buttons */}
      {showNavButtons && (
        <div className="mt-8 flex justify-between w-full max-w-2xl mx-auto">
          <button
            onClick={handleBackButton}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            disabled={loading}
          >
            <ArrowLeft size={16} />
            <span>Back to Setup</span>
          </button>
          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
