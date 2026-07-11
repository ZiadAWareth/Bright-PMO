import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Users,
  CheckCircle,
  TrendingUp,
  MessageSquare,
  Info,
  AlertCircle,
  BarChart3,
} from "lucide-react";

interface HealthMetrics {
  schedulePerformanceIndex: number | null;
  taskCompletionRate: number;
  criticalPathStatus: number;
  milestoneAchievementRate: number;
  costPerformanceIndex: number | null;
  budgetUtilization: number;
  costVariancePercentage: number;
  budgetThresholdViolations: number;
  overallProgress: number;
  taskQualityScore: number;
  wbsCompletionConsistency: number;
  deliverableQuality: number;
  riskExposure: number;
  riskMitigationEffectiveness: number;
  issueResolutionRate: number;
  riskTrendAnalysis: number;
  resourceUtilization: number;
  teamProductivity: number;
  resourceAvailability: number;
  skillsAlignment: number;
  approvalEfficiency: number;
  communicationEffectiveness: number;
  changeManagement: number;
}

interface HealthBreakdown {
  schedule: { score: number; weight: number; weightedScore: number };
  cost: { score: number; weight: number; weightedScore: number };
  quality: { score: number; weight: number; weightedScore: number };
  risk: { score: number; weight: number; weightedScore: number };
  resource: { score: number; weight: number; weightedScore: number };
  stakeholder: { score: number; weight: number; weightedScore: number };
}

interface HealthResult {
  healthScore: number;
  healthGrade: "A" | "B" | "C" | "D" | "F";
  healthStatus: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
  breakdown: HealthBreakdown;
  metrics: HealthMetrics;
  recommendations: string[];
  riskFlags: string[];
  lastCalculated?: string;
}

interface ProjectHealthDisplayProps {
  projectId: number;
  onHealthUpdate?: (healthScore: number) => void;
}

export default function ProjectHealthDisplay({
  projectId,
  onHealthUpdate,
}: ProjectHealthDisplayProps) {
  const [healthData, setHealthData] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "breakdown" | "recommendations"
  >("overview");

  // Load current health data
  const loadHealthData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/health`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setHealthData(result);
      } else {
        console.error("Failed to load health data");
      }
    } catch (error) {
      console.error("Error loading health data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthData();
  }, [projectId]);

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (score >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-blue-500";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Health Score Calculating...
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please wait while we calculate the project health score based on
            current metrics.
          </p>
          <div className="mt-4 animate-pulse">
            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Overall Health Score */}
      <div
        className={`rounded-xl border p-6 ${getHealthColor(
          healthData.healthScore
        )}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Project Health Score</h2>
            <div className="flex items-center space-x-4">
              <span className="text-4xl font-bold">
                {healthData.healthScore}%
              </span>
              <div>
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(
                    healthData.healthScore
                  )}`}
                >
                  Grade {healthData.healthGrade}
                </div>
                <div className="text-sm mt-1">{healthData.healthStatus}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <Activity className="h-8 w-8 opacity-60" />
          </div>
        </div>
      </div>

      {/* Risk Flags */}
      {healthData.riskFlags.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              Critical Issues
            </h3>
          </div>
          <ul className="space-y-2">
            {healthData.riskFlags.map((flag, index) => (
              <li key={index} className="flex items-start">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300">
                  {flag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-scroll">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "breakdown", label: "Detailed Breakdown", icon: Activity },
            { id: "recommendations", label: "Recommendations", icon: Info },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(healthData.breakdown).map(([category, data]) => {
            const icons = {
              schedule: Activity,
              cost: DollarSign,
              quality: CheckCircle,
              risk: AlertTriangle,
              resource: Users,
              stakeholder: MessageSquare,
            };
            const Icon = icons[category as keyof typeof icons] || Activity;

            return (
              <div
                key={category}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 overflow-hidden"
              >
                {/* Category name on top - centered */}
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 capitalize text-center mb-4">
                  {category}
                </h3>

                {/* Icon and percentage side by side */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg ${getHealthColor(
                      data.score
                    )}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={`font-bold ${getScoreColor(
                      data.score
                    )} leading-none ${
                      data.score >= 100
                        ? "text-xl sm:text-2xl"
                        : "text-2xl sm:text-3xl"
                    }`}
                  >
                    {data.score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(
                      data.score
                    )}`}
                    style={{ width: `${data.score}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "breakdown" && (
        <div className="space-y-6">
          {/* Schedule Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Schedule Performance (25% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Schedule Performance Index (SPI)
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.schedulePerformanceIndex?.toFixed(2) ||
                    "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Task Completion Rate
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.taskCompletionRate.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Critical Path Status
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.criticalPathStatus.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Milestone Achievement Rate
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.milestoneAchievementRate.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Cost Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Cost Performance (25% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Cost Performance Index (CPI)
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.costPerformanceIndex?.toFixed(2) || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Budget Utilization
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.budgetUtilization.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Cost Variance %
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.costVariancePercentage.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Budget Threshold Violations
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.budgetThresholdViolations}
                </p>
              </div>
            </div>
          </div>

          {/* Quality & Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Quality & Progress (20% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Overall Progress
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.overallProgress.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Task Quality Score
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.taskQualityScore.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  WBS Completion Consistency
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.wbsCompletionConsistency.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Deliverable Quality
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.deliverableQuality.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Risk Management (15% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Risk Exposure
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.riskExposure.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Risk Mitigation Effectiveness
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.riskMitigationEffectiveness.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Issue Resolution Rate
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.issueResolutionRate.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Risk Trend Analysis
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.riskTrendAnalysis.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Resource Management */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Resource Management (10% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Resource Utilization
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.resourceUtilization.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Team Productivity
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.teamProductivity.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Resource Availability
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.resourceAvailability.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Skills Alignment
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.skillsAlignment.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Stakeholder & Communication */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Stakeholder & Communication (5% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Approval Efficiency
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.approvalEfficiency.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Communication Effectiveness
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.communicationEffectiveness.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Change Management
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.changeManagement.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "recommendations" && (
        <div className="space-y-6">
          {/* Recommendations */}
          {healthData.recommendations.length > 0 ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-800 dark:text-blue-200">
                <TrendingUp className="h-5 w-5 mr-2" />
                Actionable Recommendations
              </h3>
              <ul className="space-y-3">
                {healthData.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-200">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      {recommendation}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-3" />
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                Great Job!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your project is performing well across all health metrics. No
                specific recommendations at this time.
              </p>
            </div>
          )}

          {/* Health Score Explanation */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2" />
              How Health Score is Calculated
            </h3>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <p>
                The Project Health Score is a comprehensive metric that
                evaluates your project's performance across six key dimensions:
              </p>
              <ul className="space-y-2 list-disc list-inside ml-4">
                <li>
                  <strong>Schedule Performance (25%):</strong> SPI, task
                  completion rates, critical path status, milestone achievements
                </li>
                <li>
                  <strong>Cost Performance (25%):</strong> CPI, budget
                  utilization, cost variance, budget violations
                </li>
                <li>
                  <strong>Quality & Progress (20%):</strong> Overall progress,
                  task quality, WBS consistency, deliverable quality
                </li>
                <li>
                  <strong>Risk Management (15%):</strong> Risk exposure,
                  mitigation effectiveness, issue resolution, risk trends
                </li>
                <li>
                  <strong>Resource Management (10%):</strong> Resource
                  utilization, team productivity, availability, skills alignment
                </li>
                <li>
                  <strong>Stakeholder & Communication (5%):</strong> Approval
                  efficiency, communication effectiveness, change management
                </li>
              </ul>
              <p>
                Each component is scored from 0-100, then weighted according to
                its importance to create the final health score. Regular
                monitoring helps identify issues early and maintain project
                success.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
