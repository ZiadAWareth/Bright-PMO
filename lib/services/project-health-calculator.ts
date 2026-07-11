import { prisma } from '@/lib/prisma';

/**
 * Comprehensive Project Health Score Calculator
 * 
 * Calculates a meaningful health score (0-100) based on multiple project management indicators:
 * 1. Schedule Performance (25% weight) - SPI, task completion rates, critical path delays
 * 2. Cost Performance (25% weight) - CPI, budget utilization, cost variance
 * 3. Quality & Progress (20% weight) - Task quality, milestone achievements, deliverable completion
 * 4. Risk Management (15% weight) - Risk levels, mitigation effectiveness, issue resolution
 * 5. Resource Management (10% weight) - Resource utilization, workload distribution, team performance
 * 6. Stakeholder & Communication (5% weight) - Approval delays, communication effectiveness
 */

export interface ProjectHealthMetrics {
  // Schedule Performance (25%)
  schedulePerformanceIndex: number | null; // SPI from EVM
  taskCompletionRate: number; // % of tasks completed on time
  criticalPathStatus: number; // % of critical path tasks on track
  milestoneAchievementRate: number; // % of milestones completed on time
  
  // Cost Performance (25%)
  costPerformanceIndex: number | null; // CPI from EVM
  budgetUtilization: number; // Actual cost / Budget amount
  costVariancePercentage: number; // (EV - AC) / AC * 100
  budgetThresholdViolations: number; // Number of budget threshold violations
  
  // Quality & Progress (20%)
  overallProgress: number; // Project progress percentage
  taskQualityScore: number; // Based on rework, defects, acceptance rates
  wbsCompletionConsistency: number; // Consistency of WBS completion across phases
  deliverableQuality: number; // Quality of deliverables and documents
  
  // Risk Management (15%)
  riskExposure: number; // Weighted risk score based on open risks
  riskMitigationEffectiveness: number; // % of risks with active mitigation
  issueResolutionRate: number; // Speed of issue resolution
  riskTrendAnalysis: number; // Trend of risk levels over time
  
  // Resource Management (10%)
  resourceUtilization: number; // Resource allocation vs capacity
  teamProductivity: number; // Actual hours vs estimated hours
  resourceAvailability: number; // Team availability and workload balance
  skillsAlignment: number; // Resource skills vs task requirements
  
  // Stakeholder & Communication (5%)
  approvalEfficiency: number; // Approval processing time
  communicationEffectiveness: number; // Notification response rates, stakeholder engagement
  changeManagement: number; // How well changes are managed
}

export interface ProjectHealthResult {
  healthScore: number; // Final health score (0-100)
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F'; // Letter grade
  healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'; // Status description
  metrics: ProjectHealthMetrics;
  recommendations: string[]; // Actionable recommendations
  riskFlags: string[]; // Critical issues requiring immediate attention
  breakdown: {
    schedule: { score: number; weight: number; weightedScore: number };
    cost: { score: number; weight: number; weightedScore: number };
    quality: { score: number; weight: number; weightedScore: number };
    risk: { score: number; weight: number; weightedScore: number };
    resource: { score: number; weight: number; weightedScore: number };
    stakeholder: { score: number; weight: number; weightedScore: number };
  };
}

export class ProjectHealthCalculator {
  private readonly WEIGHTS = {
    schedule: 0.25,    // 25%
    cost: 0.25,        // 25%
    quality: 0.20,     // 20%
    risk: 0.15,        // 15%
    resource: 0.10,    // 10%
    stakeholder: 0.05  // 5%
  };

  /**
   * Calculate comprehensive health score for a project
   */
  async calculateProjectHealth(projectId: number): Promise<ProjectHealthResult> {
    console.log(`🏥 Starting health score calculation for project ${projectId}`);

    // Load project with all related data
    const project = await this.loadProjectData(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Calculate individual component scores
    const scheduleScore = await this.calculateSchedulePerformance(project);
    const costScore = await this.calculateCostPerformance(project);
    const qualityScore = await this.calculateQualityPerformance(project);
    const riskScore = await this.calculateRiskManagement(project);
    const resourceScore = await this.calculateResourceManagement(project);
    const stakeholderScore = await this.calculateStakeholderManagement(project);

    // Calculate weighted health score
    const breakdown = {
      schedule: {
        score: scheduleScore.score,
        weight: this.WEIGHTS.schedule,
        weightedScore: scheduleScore.score * this.WEIGHTS.schedule
      },
      cost: {
        score: costScore.score,
        weight: this.WEIGHTS.cost,
        weightedScore: costScore.score * this.WEIGHTS.cost
      },
      quality: {
        score: qualityScore.score,
        weight: this.WEIGHTS.quality,
        weightedScore: qualityScore.score * this.WEIGHTS.quality
      },
      risk: {
        score: riskScore.score,
        weight: this.WEIGHTS.risk,
        weightedScore: riskScore.score * this.WEIGHTS.risk
      },
      resource: {
        score: resourceScore.score,
        weight: this.WEIGHTS.resource,
        weightedScore: resourceScore.score * this.WEIGHTS.resource
      },
      stakeholder: {
        score: stakeholderScore.score,
        weight: this.WEIGHTS.stakeholder,
        weightedScore: stakeholderScore.score * this.WEIGHTS.stakeholder
      }
    };

    const healthScore = Math.round(
      breakdown.schedule.weightedScore +
      breakdown.cost.weightedScore +
      breakdown.quality.weightedScore +
      breakdown.risk.weightedScore +
      breakdown.resource.weightedScore +
      breakdown.stakeholder.weightedScore
    );

    // Combine all metrics
    const metrics: ProjectHealthMetrics = {
      schedulePerformanceIndex: null,
      taskCompletionRate: 0,
      criticalPathStatus: 0,
      milestoneAchievementRate: 0,
      costPerformanceIndex: null,
      budgetUtilization: 0,
      costVariancePercentage: 0,
      budgetThresholdViolations: 0,
      overallProgress: 0,
      taskQualityScore: 0,
      wbsCompletionConsistency: 0,
      deliverableQuality: 0,
      riskExposure: 0,
      riskMitigationEffectiveness: 0,
      issueResolutionRate: 0,
      riskTrendAnalysis: 0,
      resourceUtilization: 0,
      teamProductivity: 0,
      resourceAvailability: 0,
      skillsAlignment: 0,
      approvalEfficiency: 0,
      communicationEffectiveness: 0,
      changeManagement: 0,
      ...scheduleScore.metrics,
      ...costScore.metrics,
      ...qualityScore.metrics,
      ...riskScore.metrics,
      ...resourceScore.metrics,
      ...stakeholderScore.metrics
    };

    // Generate recommendations and risk flags
    const recommendations = this.generateRecommendations(breakdown, metrics);
    const riskFlags = this.generateRiskFlags(breakdown, metrics);

    // Determine health grade and status
    const { healthGrade, healthStatus } = this.getHealthGradeAndStatus(healthScore);

    console.log(`✅ Health score calculation completed: ${healthScore}% (${healthGrade})`);

    return {
      healthScore,
      healthGrade,
      healthStatus,
      metrics,
      recommendations,
      riskFlags,
      breakdown
    };
  }

  /**
   * Load project with all related data for health calculation
   */
  private async loadProjectData(projectId: number) {
    return await prisma.project.findUnique({
      where: { project_id: projectId },
      include: {
        wbs: {
          include: {
            tasks: {
              include: {              resourceAssignments: {
                include: {
                  resource: true,
                  field_data: true
                }
              },
              predecessor_dependencies: true,
              successor_dependencies: true,
                comments: true
              }
            }
          }
        },
        risks: {
          include: {
            mitigations: true
          }
        },
        team_members: {
          include: {
            user: {
              include: {
                account: true
              }
            }
          }
        },
        projectApprovals: true,
        budgets: true,
        evms: {
          orderBy: { created_at: 'desc' },
          take: 5 // Get recent EVM data
        },
        documents: true,
        checklists: true,
        baselines: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });
  }

  /**
   * Calculate Schedule Performance Score (25% weight)
   * Factors: SPI, task completion rates, critical path status, milestone achievement
   */
  private async calculateSchedulePerformance(project: any) {
    let score = 0;
    let factorCount = 0;
    const metrics: Partial<ProjectHealthMetrics> = {};

    // 1. Schedule Performance Index (SPI) from latest EVM
    if (project.evms.length > 0) {
      const latestEVM = project.evms[0];
      metrics.schedulePerformanceIndex = latestEVM.schedule_performance_index;
      
      if (latestEVM.schedule_performance_index >= 1.0) {
        score += 100; // On or ahead of schedule
      } else if (latestEVM.schedule_performance_index >= 0.9) {
        score += 85; // Slightly behind schedule
      } else if (latestEVM.schedule_performance_index >= 0.8) {
        score += 70; // Moderately behind schedule
      } else if (latestEVM.schedule_performance_index >= 0.7) {
        score += 50; // Significantly behind schedule
      } else {
        score += 25; // Critically behind schedule
      }
      factorCount++;
    } else {
      metrics.schedulePerformanceIndex = null;
    }

    // 2. Task Completion Rate (on-time completion)
    const allTasks = project.wbs.flatMap((wbs: any) => wbs.tasks);
    const completedTasks = allTasks.filter((task: any) => task.status === 'completed');
    const onTimeCompletedTasks = completedTasks.filter((task: any) => {
      if (!task.actual_end_date || !task.end_date) return false;
      return new Date(task.actual_end_date) <= new Date(task.end_date);
    });
    
    metrics.taskCompletionRate = completedTasks.length > 0 
      ? (onTimeCompletedTasks.length / completedTasks.length) * 100 
      : 100; // No completed tasks yet, assume good

    score += metrics.taskCompletionRate;
    factorCount++;

    // 3. Critical Path Status
    const criticalPathTasks = allTasks.filter((task: any) => task.is_critical_path);
    const onTrackCriticalTasks = criticalPathTasks.filter((task: any) => {
      if (task.status === 'completed') {
        return !task.actual_end_date || !task.end_date || 
               new Date(task.actual_end_date) <= new Date(task.end_date);
      } else {
        // For ongoing tasks, check if they're likely to finish on time
        const today = new Date();
        const endDate = new Date(task.end_date);
        const progress = task.progress_percentage || 0;
        
        if (today > endDate && progress < 100) return false; // Overdue
        
        // Estimate if on track based on progress vs time elapsed
        const startDate = new Date(task.start_date);
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsedTime = Math.max(0, today.getTime() - startDate.getTime());
        const expectedProgress = totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0;
        
        return progress >= expectedProgress * 0.8; // Allow 20% tolerance
      }
    });

    metrics.criticalPathStatus = criticalPathTasks.length > 0 
      ? (onTrackCriticalTasks.length / criticalPathTasks.length) * 100 
      : 100; // No critical path tasks

    score += metrics.criticalPathStatus;
    factorCount++;

    // 4. Milestone Achievement Rate
    const milestoneTasks = allTasks.filter((task: any) => task.is_milestone);
    const onTimeMilestones = milestoneTasks.filter((task: any) => {
      if (task.status !== 'completed') return false;
      if (!task.actual_end_date || !task.end_date) return false;
      return new Date(task.actual_end_date) <= new Date(task.end_date);
    });

    metrics.milestoneAchievementRate = milestoneTasks.length > 0 
      ? (onTimeMilestones.length / milestoneTasks.length) * 100 
      : 100; // No milestones yet

    score += metrics.milestoneAchievementRate;
    factorCount++;

    const averageScore = factorCount > 0 ? score / factorCount : 50;

    return {
      score: Math.round(averageScore),
      metrics
    };
  }

  /**
   * Calculate Cost Performance Score (25% weight)
   * Factors: CPI, budget utilization, cost variance, budget threshold violations
   */
  private async calculateCostPerformance(project: any) {
    let score = 0;
    let factorCount = 0;
    const metrics: Partial<ProjectHealthMetrics> = {};

    // 1. Cost Performance Index (CPI) from latest EVM
    if (project.evms.length > 0) {
      const latestEVM = project.evms[0];
      metrics.costPerformanceIndex = latestEVM.cost_performance_index;
      
      if (latestEVM.cost_performance_index >= 1.0) {
        score += 100; // Under or on budget
      } else if (latestEVM.cost_performance_index >= 0.9) {
        score += 85; // Slightly over budget
      } else if (latestEVM.cost_performance_index >= 0.8) {
        score += 70; // Moderately over budget
      } else if (latestEVM.cost_performance_index >= 0.7) {
        score += 50; // Significantly over budget
      } else {
        score += 25; // Critically over budget
      }
      factorCount++;
    } else {
      metrics.costPerformanceIndex = null;
    }

    // 2. Budget Utilization
    const budgetUtilization = project.budget_amount > 0 
      ? (project.actual_cost / project.budget_amount) * 100 
      : 0;
    
    metrics.budgetUtilization = budgetUtilization;

    if (budgetUtilization <= 80) {
      score += 100; // Well under budget
    } else if (budgetUtilization <= 90) {
      score += 90; // Under budget
    } else if (budgetUtilization <= 100) {
      score += 80; // On budget
    } else if (budgetUtilization <= 110) {
      score += 60; // Slightly over budget
    } else if (budgetUtilization <= 120) {
      score += 40; // Moderately over budget
    } else {
      score += 20; // Significantly over budget
    }
    factorCount++;

    // 3. Cost Variance Percentage
    if (project.evms.length > 0) {
      const latestEVM = project.evms[0];
      const earnedValue = latestEVM.earned_value || 0;
      const actualCost = latestEVM.actual_cost || project.actual_cost;
      
      metrics.costVariancePercentage = actualCost > 0 
        ? ((earnedValue - actualCost) / actualCost) * 100 
        : 0;

      if (metrics.costVariancePercentage >= 0) {
        score += 100; // Positive variance (under budget)
      } else if (metrics.costVariancePercentage >= -5) {
        score += 85; // Small negative variance
      } else if (metrics.costVariancePercentage >= -10) {
        score += 70; // Moderate negative variance
      } else if (metrics.costVariancePercentage >= -15) {
        score += 50; // Large negative variance
      } else {
        score += 25; // Very large negative variance
      }
      factorCount++;
    } else {
      metrics.costVariancePercentage = 0;
    }

    // 4. Budget Threshold Violations
    const topLevelBudgets = project.budgets.filter((budget: any) => 
      budget.wbs_id == null && budget.task_id == null
    );
    
    const violations = topLevelBudgets.filter((budget: any) => 
      budget.actual_amount > budget.planned_amount + (budget.threshold || 0)
    ).length;

    metrics.budgetThresholdViolations = violations;

    if (violations === 0) {
      score += 100; // No violations
    } else if (violations <= 2) {
      score += 70; // Few violations
    } else if (violations <= 5) {
      score += 50; // Moderate violations
    } else {
      score += 25; // Many violations
    }
    factorCount++;

    const averageScore = factorCount > 0 ? score / factorCount : 50;

    return {
      score: Math.round(averageScore),
      metrics
    };
  }

  /**
   * Calculate Quality & Progress Score (20% weight)
   * Factors: Overall progress, task quality, WBS completion consistency, deliverable quality
   */
  private async calculateQualityPerformance(project: any) {
    let score = 0;
    let factorCount = 0;
    const metrics: Partial<ProjectHealthMetrics> = {};

    // 1. Overall Progress
    metrics.overallProgress = project.progress_percentage || 0;
    
    // Score based on progress relative to time elapsed
    const today = new Date();
    const startDate = new Date(project.start_date);
    const endDate = project.planned_end_date ? new Date(project.planned_end_date) : new Date();
    
    let expectedProgress = 0;
    if (today >= endDate) {
      expectedProgress = 100; // Should be complete
    } else if (today <= startDate) {
      expectedProgress = 0; // Hasn't started
    } else {
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsedTime = today.getTime() - startDate.getTime();
      expectedProgress = (elapsedTime / totalDuration) * 100;
    }

    const progressRatio = expectedProgress > 0 ? (metrics.overallProgress || 0) / expectedProgress : 1;
    
    if (progressRatio >= 1.0) {
      score += 100; // On or ahead of expected progress
    } else if (progressRatio >= 0.9) {
      score += 85; // Slightly behind expected progress
    } else if (progressRatio >= 0.8) {
      score += 70; // Moderately behind expected progress
    } else if (progressRatio >= 0.7) {
      score += 50; // Significantly behind expected progress
    } else {
      score += 25; // Critically behind expected progress
    }
    factorCount++;

    // 2. Task Quality Score (based on rework indicators)
    const allTasks = project.wbs.flatMap((wbs: any) => wbs.tasks);
    const tasksWithComments = allTasks.filter((task: any) => task.comments.length > 0);
    const averageCommentsPerTask = allTasks.length > 0 ? tasksWithComments.length / allTasks.length : 0;
    
    // Assume fewer comments indicate higher quality (less rework/issues)
    if (averageCommentsPerTask <= 0.1) {
      metrics.taskQualityScore = 100; // Very few issues
    } else if (averageCommentsPerTask <= 0.3) {
      metrics.taskQualityScore = 85; // Few issues
    } else if (averageCommentsPerTask <= 0.5) {
      metrics.taskQualityScore = 70; // Moderate issues
    } else if (averageCommentsPerTask <= 0.7) {
      metrics.taskQualityScore = 50; // Many issues
    } else {
      metrics.taskQualityScore = 25; // Excessive issues
    }

    score += metrics.taskQualityScore;
    factorCount++;

    // 3. WBS Completion Consistency
    const wbsProgressVariance = this.calculateWBSProgressVariance(project.wbs);
    metrics.wbsCompletionConsistency = Math.max(0, 100 - wbsProgressVariance);

    score += metrics.wbsCompletionConsistency;
    factorCount++;

    // 4. Deliverable Quality (based on documents and checklists)
    const totalChecklists = project.checklists.length;
    const completedChecklists = project.checklists.filter((checklist: any) => 
      checklist.is_completed
    ).length;
    
    metrics.deliverableQuality = totalChecklists > 0 
      ? (completedChecklists / totalChecklists) * 100 
      : 80; // Default good score if no checklists

    score += metrics.deliverableQuality;
    factorCount++;

    const averageScore = factorCount > 0 ? score / factorCount : 50;

    return {
      score: Math.round(averageScore),
      metrics
    };
  }

  /**
   * Calculate Risk Management Score (15% weight)
   * Factors: Risk exposure, mitigation effectiveness, issue resolution, risk trends
   */
  private async calculateRiskManagement(project: any) {
    let score = 0;
    let factorCount = 0;
    const metrics: Partial<ProjectHealthMetrics> = {};

    // 1. Risk Exposure (weighted by impact and probability)
    const openRisks = project.risks.filter((risk: any) => 
      risk.status !== 'closed' && risk.status !== 'resolved'
    );
    
    const weightedRiskScore = openRisks.reduce((sum: number, risk: any) => {
      return sum + (risk.riskScore || 0);
    }, 0);

    const maxPossibleRiskScore = openRisks.length * 9; // Max risk score is 9 (3x3)
    metrics.riskExposure = maxPossibleRiskScore > 0 
      ? (weightedRiskScore / maxPossibleRiskScore) * 100 
      : 0;

    if (metrics.riskExposure <= 20) {
      score += 100; // Low risk exposure
    } else if (metrics.riskExposure <= 40) {
      score += 80; // Moderate risk exposure
    } else if (metrics.riskExposure <= 60) {
      score += 60; // High risk exposure
    } else if (metrics.riskExposure <= 80) {
      score += 40; // Very high risk exposure
    } else {
      score += 20; // Critical risk exposure
    }
    factorCount++;

    // 2. Risk Mitigation Effectiveness
    const risksWithMitigation = openRisks.filter((risk: any) => 
      risk.mitigations && risk.mitigations.length > 0
    );
    
    metrics.riskMitigationEffectiveness = openRisks.length > 0 
      ? (risksWithMitigation.length / openRisks.length) * 100 
      : 100; // No open risks

    score += metrics.riskMitigationEffectiveness;
    factorCount++;

    // 3. Issue Resolution Rate (based on risk closure speed)
    const closedRisks = project.risks.filter((risk: any) => 
      risk.status === 'closed' || risk.status === 'resolved'
    );
    
    const totalRisks = project.risks.length;
    metrics.issueResolutionRate = totalRisks > 0 
      ? (closedRisks.length / totalRisks) * 100 
      : 100; // No risks means good resolution

    score += metrics.issueResolutionRate;
    factorCount++;

    // 4. Risk Trend Analysis (simplified - based on recent risk creation)
    const recentRisks = project.risks.filter((risk: any) => {
      const riskDate = new Date(risk.identified_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return riskDate >= thirtyDaysAgo;
    });

    // Fewer recent risks indicate better trend
    if (recentRisks.length === 0) {
      metrics.riskTrendAnalysis = 100; // No new risks
    } else if (recentRisks.length <= 2) {
      metrics.riskTrendAnalysis = 80; // Few new risks
    } else if (recentRisks.length <= 5) {
      metrics.riskTrendAnalysis = 60; // Moderate new risks
    } else {
      metrics.riskTrendAnalysis = 40; // Many new risks
    }

    score += metrics.riskTrendAnalysis;
    factorCount++;

    const averageScore = factorCount > 0 ? score / factorCount : 75; // Default good score

    return {
      score: Math.round(averageScore),
      metrics
    };
  }

  /**
   * Calculate Resource Management Score (10% weight)
   * Factors: Resource utilization, team productivity, availability, skills alignment
   */
  private async calculateResourceManagement(project: any) {
    let score = 0;
    let factorCount = 0;
    const metrics: Partial<ProjectHealthMetrics> = {};

    // 1. Resource Utilization
    const totalTeamWorkload = project.team_members.reduce((sum: number, member: any) => 
      sum + (member.workload || 0), 0
    );
    const averageWorkload = project.team_members.length > 0 
      ? totalTeamWorkload / project.team_members.length 
      : 0;

    metrics.resourceUtilization = averageWorkload;

    if (averageWorkload >= 70 && averageWorkload <= 90) {
      score += 100; // Optimal utilization
    } else if (averageWorkload >= 60 && averageWorkload <= 95) {
      score += 85; // Good utilization
    } else if (averageWorkload >= 50 && averageWorkload <= 100) {
      score += 70; // Acceptable utilization
    } else {
      score += 50; // Poor utilization (too low or too high)
    }
    factorCount++;

    // 2. Team Productivity Calculation
    // 
    // Formula: Productivity = (Estimated Hours / Actual Hours) * 100
    // 
    // Explanation:
    // - This measures efficiency by comparing estimated vs actual time spent
    // - 100% = exactly as estimated (on time)
    // - >100% = faster than estimated (e.g., 150% = completed in 2/3 of estimated time)
    // - <100% = slower than estimated (e.g., 50% = took twice as long as estimated)
    // 
    // Examples:
    // - Estimated: 100h, Actual: 50h → Productivity = 200% (very efficient, completed in half the time)
    // - Estimated: 100h, Actual: 100h → Productivity = 100% (on target)
    // - Estimated: 100h, Actual: 200h → Productivity = 50% (inefficient, took twice as long)
    // 
    // Edge cases handled:
    // - If actual hours are very small (< 1% of estimated), cap at 200% to prevent unrealistic values
    // - If no estimated hours, assume 100% productivity (neutral score)
    // - Maximum productivity is capped at 200% (you can't be more than twice as efficient)
    const allTasks = project.wbs.flatMap((wbs: any) => wbs.tasks);
    const totalEstimatedHours = allTasks.reduce((sum: number, task: any) => 
      sum + (task.estimated_hours || 0), 0
    );
    const totalActualHours = allTasks.reduce((sum: number, task: any) => 
      sum + (task.actual_hours || 0), 0
    );

    if (totalEstimatedHours === 0) {
      // No estimated hours available - assume neutral productivity
      metrics.teamProductivity = 100;
    } else if (totalActualHours === 0) {
      // No actual hours logged yet - assume on track
      metrics.teamProductivity = 100;
    } else {
      // Calculate productivity with safety checks
      const rawProductivity = (totalEstimatedHours / totalActualHours) * 100;
      
      // Cap productivity at 200% to prevent unrealistic values when actual hours are very small
      // This handles cases where tasks are logged with minimal actual hours (e.g., 0.1h vs 144h estimated)
      // A productivity above 200% is unrealistic and likely indicates data entry errors
      metrics.teamProductivity = Math.min(rawProductivity, 200);
      
      // Additional safety: if actual hours are less than 1% of estimated, it's likely a data issue
      // In such cases, cap at 200% to prevent extreme values like 14400%
      const actualHoursRatio = totalActualHours / totalEstimatedHours;
      if (actualHoursRatio < 0.01) {
        metrics.teamProductivity = 200; // Cap at maximum reasonable productivity
      }
    }

    if (metrics.teamProductivity >= 90) {
      score += 100; // High productivity
    } else if (metrics.teamProductivity >= 80) {
      score += 85; // Good productivity
    } else if (metrics.teamProductivity >= 70) {
      score += 70; // Acceptable productivity
    } else if (metrics.teamProductivity >= 60) {
      score += 50; // Low productivity
    } else {
      score += 25; // Very low productivity
    }
    factorCount++;

    // 3. Resource Availability (based on team size vs workload)
    const teamSize = project.team_members.length;
    const projectComplexity = allTasks.length;
    
    // Simple heuristic: more team members relative to task count is better
    const resourceRatio = projectComplexity > 0 ? teamSize / projectComplexity : 1;
    
    if (resourceRatio >= 0.3) {
      metrics.resourceAvailability = 100; // Plenty of resources
    } else if (resourceRatio >= 0.2) {
      metrics.resourceAvailability = 85; // Adequate resources
    } else if (resourceRatio >= 0.1) {
      metrics.resourceAvailability = 70; // Limited resources
    } else {
      metrics.resourceAvailability = 50; // Insufficient resources
    }

    score += metrics.resourceAvailability;
    factorCount++;

    // 4. Skills Alignment (simplified - assume good if no major delays)
    const delayedTasks = allTasks.filter((task: any) => {
      if (task.status === 'completed') return false;
      const today = new Date();
      const endDate = new Date(task.end_date);
      return today > endDate && task.progress_percentage < 100;
    });

    const delayRate = allTasks.length > 0 ? delayedTasks.length / allTasks.length : 0;
    
    if (delayRate <= 0.1) {
      metrics.skillsAlignment = 100; // Few delays suggest good skills alignment
    } else if (delayRate <= 0.2) {
      metrics.skillsAlignment = 80; // Some delays
    } else if (delayRate <= 0.3) {
      metrics.skillsAlignment = 60; // Moderate delays
    } else {
      metrics.skillsAlignment = 40; // Many delays suggest skills issues
    }

    score += metrics.skillsAlignment;
    factorCount++;

    const averageScore = factorCount > 0 ? score / factorCount : 75; // Default good score

    return {
      score: Math.round(averageScore),
      metrics
    };
  }

  /**
   * Calculate Stakeholder & Communication Score (5% weight)
   * Factors: Approval efficiency, communication effectiveness, change management
   */
  private async calculateStakeholderManagement(project: any) {
    let score = 0;
    let factorCount = 0;
    const metrics: Partial<ProjectHealthMetrics> = {};

    // 1. Approval Efficiency
    const approvals = project.projectApprovals;
    const pendingApprovals = approvals.filter((approval: any) => 
      approval.status === 'PENDING'
    );
    
    // Check for overdue approvals (more than 7 days old)
    const overdueApprovals = pendingApprovals.filter((approval: any) => {
      const createdDate = new Date(approval.created_at);
      const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation > 7;
    });

    if (overdueApprovals.length === 0) {
      metrics.approvalEfficiency = 100; // No overdue approvals
    } else if (overdueApprovals.length <= 2) {
      metrics.approvalEfficiency = 70; // Few overdue approvals
    } else {
      metrics.approvalEfficiency = 40; // Many overdue approvals
    }

    score += metrics.approvalEfficiency;
    factorCount++;

    // 2. Communication Effectiveness (simplified based on document updates)
    const recentDocuments = project.documents.filter((doc: any) => {
      const docDate = new Date(doc.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return docDate >= thirtyDaysAgo;
    });

    // Regular document updates suggest good communication
    if (recentDocuments.length >= 5) {
      metrics.communicationEffectiveness = 100; // High activity
    } else if (recentDocuments.length >= 2) {
      metrics.communicationEffectiveness = 80; // Moderate activity
    } else {
      metrics.communicationEffectiveness = 60; // Low activity
    }

    score += metrics.communicationEffectiveness;
    factorCount++;

    // 3. Change Management (based on baseline updates)
    const hasBaseline = project.baselines.length > 0;
    
    if (hasBaseline) {
      metrics.changeManagement = 80; // Has baseline for change control
    } else {
      metrics.changeManagement = 60; // No baseline established
    }

    score += metrics.changeManagement;
    factorCount++;

    const averageScore = factorCount > 0 ? score / factorCount : 75; // Default good score

    return {
      score: Math.round(averageScore),
      metrics
    };
  }

  /**
   * Calculate variance in WBS progress percentages
   */
  private calculateWBSProgressVariance(wbsItems: any[]): number {
    if (wbsItems.length <= 1) return 0;

    const progressValues = wbsItems.map(wbs => wbs.progress_percentage || 0);
    const mean = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
    const variance = progressValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / progressValues.length;
    
    return Math.sqrt(variance); // Standard deviation
  }

  /**
   * Generate actionable recommendations based on health metrics
   */
  private generateRecommendations(breakdown: any, metrics: ProjectHealthMetrics): string[] {
    const recommendations: string[] = [];

    // Schedule recommendations
    if (breakdown.schedule.score < 70) {
      if (metrics.schedulePerformanceIndex && metrics.schedulePerformanceIndex < 0.9) {
        recommendations.push("Review project schedule and consider fast-tracking critical activities");
      }
      if (metrics.criticalPathStatus < 80) {
        recommendations.push("Focus resources on critical path tasks to prevent schedule delays");
      }
      if (metrics.taskCompletionRate < 80) {
        recommendations.push("Investigate causes of task delays and implement corrective actions");
      }
    }

    // Cost recommendations
    if (breakdown.cost.score < 70) {
      if (metrics.costPerformanceIndex && metrics.costPerformanceIndex < 0.9) {
        recommendations.push("Implement cost control measures and review budget allocation");
      }
      if (metrics.budgetUtilization > 100) {
        recommendations.push("Review and rebaseline project budget or scope");
      }
      if (metrics.budgetThresholdViolations > 2) {
        recommendations.push("Establish stricter budget monitoring and approval processes");
      }
    }

    // Quality recommendations
    if (breakdown.quality.score < 70) {
      if (metrics.taskQualityScore < 70) {
        recommendations.push("Implement quality assurance processes and regular reviews");
      }
      if (metrics.wbsCompletionConsistency < 70) {
        recommendations.push("Balance workload distribution across WBS phases");
      }
    }

    // Risk recommendations
    if (breakdown.risk.score < 70) {
      if (metrics.riskExposure > 60) {
        recommendations.push("Develop and implement risk mitigation strategies for high-impact risks");
      }
      if (metrics.riskMitigationEffectiveness < 70) {
        recommendations.push("Assign risk owners and create mitigation action plans");
      }
    }

    // Resource recommendations
    if (breakdown.resource.score < 70) {
      if (metrics.resourceUtilization < 60 || metrics.resourceUtilization > 95) {
        recommendations.push("Optimize resource allocation and workload distribution");
      }
      if (metrics.teamProductivity < 70) {
        recommendations.push("Provide additional training or support to improve team productivity");
      }
    }

    // Stakeholder recommendations
    if (breakdown.stakeholder.score < 70) {
      if (metrics.approvalEfficiency < 70) {
        recommendations.push("Streamline approval processes and follow up on pending approvals");
      }
      if (metrics.communicationEffectiveness < 70) {
        recommendations.push("Improve project communication and stakeholder engagement");
      }
    }

    return recommendations;
  }

  /**
   * Generate risk flags for critical issues
   */
  private generateRiskFlags(breakdown: any, metrics: ProjectHealthMetrics): string[] {
    const riskFlags: string[] = [];

    // Critical schedule issues
    if (metrics.schedulePerformanceIndex && metrics.schedulePerformanceIndex < 0.7) {
      riskFlags.push("CRITICAL: Project is significantly behind schedule (SPI < 0.7)");
    }

    // Critical cost issues
    if (metrics.costPerformanceIndex && metrics.costPerformanceIndex < 0.7) {
      riskFlags.push("CRITICAL: Project is significantly over budget (CPI < 0.7)");
    }

    // Critical quality issues
    if (metrics.overallProgress < 50 && breakdown.quality.score < 50) {
      riskFlags.push("CRITICAL: Low progress combined with quality concerns");
    }

    // Critical risk exposure
    if (metrics.riskExposure > 80) {
      riskFlags.push("CRITICAL: Very high risk exposure - immediate attention required");
    }

    // Critical resource issues
    if (metrics.teamProductivity < 50) {
      riskFlags.push("WARNING: Very low team productivity detected");
    }

    // Critical approval delays
    if (metrics.approvalEfficiency < 50) {
      riskFlags.push("WARNING: Significant approval delays may impact project timeline");
    }

    return riskFlags;
  }

  /**
   * Determine health grade and status based on score
   */
  private getHealthGradeAndStatus(score: number): { healthGrade: 'A' | 'B' | 'C' | 'D' | 'F'; healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical' } {
    if (score >= 90) {
      return { healthGrade: 'A', healthStatus: 'Excellent' };
    } else if (score >= 80) {
      return { healthGrade: 'B', healthStatus: 'Good' };
    } else if (score >= 70) {
      return { healthGrade: 'C', healthStatus: 'Fair' };
    } else if (score >= 60) {
      return { healthGrade: 'D', healthStatus: 'Poor' };
    } else {
      return { healthGrade: 'F', healthStatus: 'Critical' };
    }
  }

  /**
   * Update project health score in database
   */
  async updateProjectHealthScore(projectId: number, healthScore: number): Promise<void> {
    await prisma.project.update({
      where: { project_id: projectId },
      data: { healthScore }
    });
  }
}

/**
 * Calculate and update health score for a project
 */
export async function calculateAndUpdateProjectHealth(projectId: number): Promise<ProjectHealthResult> {
  const calculator = new ProjectHealthCalculator();
  const result = await calculator.calculateProjectHealth(projectId);
  
  // Update the health score in the database
  await calculator.updateProjectHealthScore(projectId, result.healthScore);
  
  return result;
}

/**
 * Calculate health scores for all active projects
 */
export async function calculateAllProjectHealthScores(): Promise<void> {
  const projects = await prisma.project.findMany({
    where: {
      status: {
        in: ['planning', 'execution']
      }
    },
    select: { project_id: true, name: true }
  });

  console.log(`🏥 Calculating health scores for ${projects.length} active projects...`);

  const calculator = new ProjectHealthCalculator();
  
  for (const project of projects) {
    try {
      console.log(`📊 Processing project: ${project.name}`);
      const result = await calculator.calculateProjectHealth(project.project_id);
      await calculator.updateProjectHealthScore(project.project_id, result.healthScore);
      console.log(`✅ Updated health score for ${project.name}: ${result.healthScore}%`);
    } catch (error) {
      console.error(`❌ Failed to calculate health for project ${project.name}:`, error);
    }
  }

  console.log(`🎉 Completed health score calculation for all projects`);
}
