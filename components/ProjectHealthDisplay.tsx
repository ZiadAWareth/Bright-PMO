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
    if (score >= 90) return "text-success bg-success-soft border-success";
    if (score >= 80) return "text-info bg-info-soft border-info";
    if (score >= 70) return "text-warning bg-warning-soft border-warning";
    if (score >= 60) return "text-bright bg-bright-soft border-bright";
    return "text-danger bg-danger-soft border-danger";
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 80) return "text-info";
    if (score >= 70) return "text-warning";
    if (score >= 60) return "text-bright";
    return "text-danger";
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return "bg-success";
    if (score >= 80) return "bg-info";
    if (score >= 70) return "bg-warning";
    if (score >= 60) return "bg-bright";
    return "bg-danger";
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-line p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-surface-3 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-surface-3 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-surface-3 rounded"></div>
            <div className="h-4 bg-surface-3 rounded w-5/6"></div>
            <div className="h-4 bg-surface-3 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="bg-surface rounded-xl border border-line p-6">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-faint" />
          <h3 className="mt-4 text-lg font-medium text-ink">
            Health Score Calculating...
          </h3>
          <p className="mt-2 text-sm text-muted">
            Please wait while we calculate the project health score based on
            current metrics.
          </p>
          <div className="mt-4 animate-pulse">
            <div className="h-2 bg-surface-3 rounded w-3/4 mx-auto"></div>
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
        <div className="bg-danger-soft border border-danger rounded-xl p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-danger mr-2" />
            <h3 className="text-lg font-semibold text-danger">
              Critical Issues
            </h3>
          </div>
          <ul className="space-y-2">
            {healthData.riskFlags.map((flag, index) => (
              <li key={index} className="flex items-start">
                <AlertCircle className="h-4 w-4 text-danger mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-danger">
                  {flag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-line">
        <nav className="-mb-px flex space-x-8 overflow-x-scroll">
          {[
            { id: "overview", label: "Summary", icon: BarChart3 },
            { id: "breakdown", label: "Detailed Breakdown", icon: Activity },
            { id: "recommendations", label: "Recommendations", icon: Info },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative py-2 px-1 font-medium text-sm flex items-center space-x-2 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-bright after:transition-opacity ${
                activeTab === tab.id
                  ? "text-bright after:opacity-100"
                  : "text-muted after:opacity-0 hover:text-ink"
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
                className="bg-surface rounded-lg border border-line p-6 overflow-hidden"
              >
                {/* Category name on top - centered */}
                <h3 className="text-base font-bold text-ink capitalize text-center mb-4">
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
                <div className="w-full bg-surface-3 rounded-full h-2">
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
          <div className="bg-surface rounded-lg border border-line p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Schedule Performance (25% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted">
                  Schedule Performance Index (SPI)
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.schedulePerformanceIndex?.toFixed(2) ||
                    "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Task Completion Rate
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.taskCompletionRate.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Critical Path Status
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.criticalPathStatus.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Milestone Achievement Rate
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.milestoneAchievementRate.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Cost Performance */}
          <div className="bg-surface rounded-lg border border-line p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Cost Performance (25% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted">
                  Cost Performance Index (CPI)
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.costPerformanceIndex?.toFixed(2) || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Budget Utilization
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.budgetUtilization.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Cost Variance %
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.costVariancePercentage.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Budget Threshold Violations
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.budgetThresholdViolations}
                </p>
              </div>
            </div>
          </div>

          {/* Quality & Progress */}
          <div className="bg-surface rounded-lg border border-line p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Quality & Progress (20% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted">
                  Overall Progress
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.overallProgress.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Task Quality Score
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.taskQualityScore.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  WBS Completion Consistency
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.wbsCompletionConsistency.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Deliverable Quality
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.deliverableQuality.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="bg-surface rounded-lg border border-line p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Risk Management (15% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted">
                  Risk Exposure
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.riskExposure.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Risk Mitigation Effectiveness
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.riskMitigationEffectiveness.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Issue Resolution Rate
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.issueResolutionRate.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Risk Trend Analysis
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.riskTrendAnalysis.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Resource Management */}
          <div className="bg-surface rounded-lg border border-line p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Resource Management (10% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted">
                  Resource Utilization
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.resourceUtilization.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Team Productivity
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.teamProductivity.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Resource Availability
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.resourceAvailability.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Skills Alignment
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.skillsAlignment.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Stakeholder & Communication */}
          <div className="bg-surface rounded-lg border border-line p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Stakeholder & Communication (5% weight)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted">
                  Approval Efficiency
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.approvalEfficiency.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
                  Communication Effectiveness
                </label>
                <p className="text-lg font-semibold">
                  {healthData.metrics.communicationEffectiveness.toFixed(2)}%
                </p>
              </div>
              <div>
                <label className="text-sm text-muted">
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
            <div className="bg-info-soft border border-info rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-info">
                <TrendingUp className="h-5 w-5 mr-2" />
                Actionable Recommendations
              </h3>
              <ul className="space-y-3">
                {healthData.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-info-soft rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-medium text-info">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-sm text-info">
                      {recommendation}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-success-soft border border-success rounded-xl p-6 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-success mb-3" />
              <h3 className="text-lg font-semibold text-success mb-2">
                Great Job!
              </h3>
              <p className="text-sm text-success">
                Your project is performing well across all health metrics. No
                specific recommendations at this time.
              </p>
            </div>
          )}

          {/* Health Score Explanation */}
          <div className="bg-surface-2 border border-line rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2" />
              How Health Score is Calculated
            </h3>
            <div className="space-y-4 text-sm text-muted">
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
