import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PortfolioStatus, PortfolioPriority, Project, Prisma, RiskStatus } from '@prisma/client';

interface ProjectWithMetrics {
  project_id: number;
  name: string;
  budget_amount: number;
  actual_cost: number;
  progress_percentage: number;
  status: string;
}

interface PortfolioWithMetrics {
  portfolio_id: number;
  name: string;
  description: string | null;
  status: PortfolioStatus;
  priority: PortfolioPriority;
  strategic_objective: string | null;
  manager_id: number;
  created_at: Date;
  updated_at: Date;
  tags: string[];
  manager: {
    user_id: number;
    account: {
      first_name: string;
      last_name: string;
    };
  };
  projects: ProjectWithMetrics[];
  total_budget: number;
  total_actual_cost: number;
  avg_progress: number;
  project_count: number;
  metrics: {
    projects_by_status: Record<string, number>;
    overbudget_projects: number;
    delayed_tasks: number;
    open_risks_by_impact: Record<string, number>;
    risky_projects: number;
    average_spi: number;
    average_cpi: number;
    health_index: number;
    health_status: string;
    underperforming_projects: Array<{
      project_id: number;
      reasons: string[];
    }>;
    summary_generated_at: string;
  };
}

/**
 * @swagger
 * /api/portfolios/{id}:
 *   get:
 *     summary: Get portfolio KPI summary
 *     description: Retrieves comprehensive KPI summary for a specific portfolio including project metrics, risks, and performance indicators
 *     tags:
 *       - Portfolios
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the portfolio to retrieve KPIs for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Portfolio KPI summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 portfolio_id:
 *                   type: integer
 *                 portfolio_name:
 *                   type: string
 *                 avg_progress_percentage:
 *                   type: number
 *                   format: float
 *                 projects_by_status:
 *                   type: object
 *                 overbudget_projects:
 *                   type: integer
 *                 delayed_tasks:
 *                   type: integer
 *                 open_risks_by_impact:
 *                   type: object
 *                 risky_projects:
 *                   type: integer
 *                 average_spi:
 *                   type: number
 *                   format: float
 *                 average_cpi:
 *                   type: number
 *                   format: float
 *                 summary_generated_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Portfolio not found
 *       500:
 *         description: Server error
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  try {
    // Get portfolio with relations
    const portfolio = await prisma.portfolio.findUnique({
      where: { portfolio_id: parseInt(id) },
      include: {
        manager: {
          include: {
            user: {
              select: {
                user_id: true,
                account: {
                  select: {
                    first_name: true,
                    last_name: true
                  }
                }
              }
            }
          }
        },
        projects: true
      }
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio does not exist!' }, { status: 404 });
    }

    // Calculate metrics
    const totalBudgetFromProjects = portfolio.projects.reduce((sum: number, project: ProjectWithMetrics) => sum + project.budget_amount, 0);
    // Use budget_capacity if set, otherwise use sum of project budgets
    const totalBudget = portfolio.budget_capacity && portfolio.budget_capacity > 0 
      ? portfolio.budget_capacity 
      : totalBudgetFromProjects;
    const totalActualCost = portfolio.projects.reduce((sum: number, project: ProjectWithMetrics) => sum + project.actual_cost, 0);
    const avgProgress = portfolio.projects.length > 0 
      ? portfolio.projects.reduce((sum: number, project: ProjectWithMetrics) => sum + project.progress_percentage, 0) / portfolio.projects.length 
      : 0;

    // Projects by status
    const projectStatusCounts = await prisma.project.groupBy({
      by: ['status'],
      where: { portfolio_id: parseInt(id) },
      _count: true,
    });
    const projectsByStatus = Object.fromEntries(
      projectStatusCounts.map(p => [p.status, p._count])
    );

    // Overbudget projects
    const overbudgetProjects = await prisma.project.count({
      where: {
        portfolio_id: parseInt(id),
        actual_cost: { gt: prisma.project.fields.budget_amount },
      },
    });

    // Delayed tasks
    const delayedTasks = await prisma.task.count({
      where: {
        wbs: { project: { portfolio_id: parseInt(id) } },
        actual_end_date: { not: null },
        AND: [{ actual_end_date: { gt: prisma.task.fields.end_date } }],
      },
    });

    // Open risks by impact
    const riskCounts = await prisma.risk.groupBy({
      by: ['impact'],
      where: {
        project: { portfolio_id: parseInt(id) },
        status: { not: 'closed' },
      },
      _count: true,
    });
    const openRisksByImpact = Object.fromEntries(
      riskCounts.map(r => [r.impact, r._count])
    );

    // Risky projects
    const riskyProjects = await prisma.project.count({
      where: {
        portfolio_id: parseInt(id),
        risks: {
          some: {
            impact: 'high',
            status: { not: 'closed' },
          },
        },
      },
    });

    // Calculate real-time SPI and CPI for each project in the portfolio
    const projectsWithEVM = await prisma.project.findMany({
      where: { portfolio_id: parseInt(id) },
      select: {
        project_id: true,
        budget_amount: true,
        actual_cost: true,
        progress_percentage: true,
        start_date: true,
        planned_end_date: true,
        status: true
      }
    });

    let totalSPI = 0;
    let totalCPI = 0;
    let validProjectsCount = 0;

    for (const project of projectsWithEVM) {
      // Calculate Earned Value (EV)
      const earnedValue = (project.progress_percentage / 100) * project.budget_amount;
      
      // Calculate Planned Value (PV) based on time elapsed
      const currentDate = new Date();
      const startDate = new Date(project.start_date);
      const endDate = project.planned_end_date ? new Date(project.planned_end_date) : new Date();
      
      let plannedValue = 0;
      if (currentDate >= endDate) {
        // Project should be completed
        plannedValue = project.budget_amount;
      } else if (currentDate <= startDate) {
        // Project hasn't started yet
        plannedValue = 0;
      } else {
        // Project is in progress - calculate based on time elapsed
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsedTime = currentDate.getTime() - startDate.getTime();
        const timeProgress = elapsedTime / totalDuration;
        plannedValue = timeProgress * project.budget_amount;
      }

      // Calculate SPI (Schedule Performance Index) = EV / PV
      const spi = plannedValue > 0 ? earnedValue / plannedValue : 0;
      
      // Calculate CPI (Cost Performance Index) = EV / AC (Actual Cost)
      const cpi = project.actual_cost > 0 ? earnedValue / project.actual_cost : 0;

      // Only include projects with valid metrics
      if (spi > 0 && cpi > 0) {
        totalSPI += spi;
        totalCPI += cpi;
        validProjectsCount++;
      }
    }

    const averageSPI = validProjectsCount > 0 ? totalSPI / validProjectsCount : 0;
    const averageCPI = validProjectsCount > 0 ? totalCPI / validProjectsCount : 0;

    // Calculate Portfolio Health Index
    // Health index is based on multiple factors: SPI, CPI, risk levels, project status distribution
    let healthScore = 0;
    let healthFactors = 0;

    // Factor 1: Schedule Performance (30% weight)
    if (validProjectsCount > 0) {
      if (averageSPI >= 1.0) {
        healthScore += 30; // Excellent schedule performance
      } else if (averageSPI >= 0.9) {
        healthScore += 25; // Good schedule performance
      } else if (averageSPI >= 0.8) {
        healthScore += 20; // Fair schedule performance
      } else if (averageSPI >= 0.7) {
        healthScore += 15; // Poor schedule performance
      } else if (averageSPI > 0) {
        healthScore += 10; // Critical schedule performance
      } else {
        healthScore += 5; // No schedule data
      }
    } else {
      // No valid SPI data, use project progress as proxy
      if (avgProgress >= 80) {
        healthScore += 25;
      } else if (avgProgress >= 60) {
        healthScore += 20;
      } else if (avgProgress >= 40) {
        healthScore += 15;
      } else if (avgProgress >= 20) {
        healthScore += 10;
      } else {
        healthScore += 5;
      }
    }
    healthFactors += 30;

    // Factor 2: Cost Performance (30% weight)
    if (validProjectsCount > 0) {
      if (averageCPI >= 1.0) {
        healthScore += 30; // Excellent cost performance
      } else if (averageCPI >= 0.9) {
        healthScore += 25; // Good cost performance
      } else if (averageCPI >= 0.8) {
        healthScore += 20; // Fair cost performance
      } else if (averageCPI >= 0.7) {
        healthScore += 15; // Poor cost performance
      } else if (averageCPI > 0) {
        healthScore += 10; // Critical cost performance
      } else {
        healthScore += 5; // No cost data
      }
    } else {
      // No valid CPI data, use budget vs actual cost as proxy
      if (totalActualCost > 0 && totalBudget > 0) {
        const costRatio = totalActualCost / totalBudget;
        if (costRatio <= 0.8) {
          healthScore += 25; // Under budget
        } else if (costRatio <= 1.0) {
          healthScore += 20; // On budget
        } else if (costRatio <= 1.2) {
          healthScore += 15; // Slightly over budget
        } else {
          healthScore += 10; // Over budget
        }
      } else {
        healthScore += 15; // Default moderate score when no cost data
      }
    }
    healthFactors += 30;

    // Factor 3: Project Status Distribution (20% weight)
    const totalProjects = portfolio.projects.length;
    if (totalProjects > 0) {
      const completedProjects = projectsByStatus['completed'] || 0;
      const executionProjects = projectsByStatus['execution'] || 0;
      const onHoldProjects = projectsByStatus['on_hold'] || 0;
      
      const healthyStatusRatio = (completedProjects + executionProjects) / totalProjects;
      if (healthyStatusRatio >= 0.8) {
        healthScore += 20; // Excellent status distribution
      } else if (healthyStatusRatio >= 0.6) {
        healthScore += 16; // Good status distribution
      } else if (healthyStatusRatio >= 0.4) {
        healthScore += 12; // Fair status distribution
      } else {
        healthScore += 8; // Poor status distribution
      }
    }
    healthFactors += 20;

    // Factor 4: Risk Level (20% weight)
    const totalOpenRisks = Object.values(openRisksByImpact).reduce((sum: number, count: number) => sum + count, 0);
    const highRisks = openRisksByImpact['high'] || 0;
    if (totalProjects > 0) {
      const riskRatio = totalOpenRisks / totalProjects;
      const highRiskRatio = highRisks / totalProjects;
      
      if (riskRatio <= 0.5 && highRiskRatio === 0) {
        healthScore += 20; // Excellent risk management
      } else if (riskRatio <= 1.0 && highRiskRatio <= 0.1) {
        healthScore += 16; // Good risk management
      } else if (riskRatio <= 2.0 && highRiskRatio <= 0.2) {
        healthScore += 12; // Fair risk management
      } else {
        healthScore += 8; // Poor risk management
      }
    }
    healthFactors += 20;

    // Calculate underperforming projects
    const underperformingProjects = [];
    
    for (const project of projectsWithEVM) {
      let isUnderperforming = false;
      const reasons = [];

      // Check schedule performance (progress vs time elapsed)
      const currentDate = new Date();
      const startDate = new Date(project.start_date);
      const endDate = project.planned_end_date ? new Date(project.planned_end_date) : new Date();
      
      if (currentDate > startDate && currentDate < endDate) {
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsedTime = currentDate.getTime() - startDate.getTime();
        const expectedProgress = (elapsedTime / totalDuration) * 100;
        
        if (project.progress_percentage < (expectedProgress - 10)) {
          isUnderperforming = true;
          reasons.push('Behind schedule');
        }
      } else if (currentDate >= endDate && project.progress_percentage < 100) {
        isUnderperforming = true;
        reasons.push('Overdue');
      }

      // Check cost performance (over budget by more than 15%)
      if (project.actual_cost > project.budget_amount * 1.15) {
        isUnderperforming = true;
        reasons.push('Over budget');
      }

      // Check if project is on hold or has low progress after significant time
      if (project.status === 'on_hold') {
        isUnderperforming = true;
        reasons.push('On hold');
      }

      // Check if progress is significantly low after 25% of timeline has passed
      const timeElapsed = Math.min((currentDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime()), 1);
      if (timeElapsed > 0.25 && project.progress_percentage < 10) {
        isUnderperforming = true;
        reasons.push('Low progress');
      }

      if (isUnderperforming) {
        underperformingProjects.push({
          project_id: project.project_id,
          reasons: reasons
        });
      }
    }

    // Normalize health index to 0-100 scale
    const healthIndex = healthFactors > 0 ? Math.round((healthScore / healthFactors) * 100) : 0;

    // Determine health status
    let healthStatus = 'Critical';
    if (healthIndex >= 80) {
      healthStatus = 'Excellent';
    } else if (healthIndex >= 70) {
      healthStatus = 'Good';
    } else if (healthIndex >= 60) {
      healthStatus = 'Fair';
    } else if (healthIndex >= 50) {
      healthStatus = 'Poor';
    }

    // Combine portfolio data with metrics
    const portfolioWithMetrics: PortfolioWithMetrics = {
      portfolio_id: portfolio.portfolio_id,
      name: portfolio.name,
      description: portfolio.description,
      status: portfolio.status,
      priority: portfolio.priority,
      strategic_objective: portfolio.strategic_objective,
      manager_id: portfolio.manager_id,
      created_at: portfolio.created_at,
      updated_at: portfolio.updated_at,
      tags: portfolio.tags,
      manager: {
        user_id: portfolio.manager.user.user_id,
        account: portfolio.manager.user.account ?? { first_name: '', last_name: '' }
      },
      projects: portfolio.projects,
      total_budget: totalBudget,
      total_actual_cost: totalActualCost,
      avg_progress: avgProgress,
      project_count: portfolio.projects.length,
      metrics: {
        projects_by_status: projectsByStatus,
        overbudget_projects: overbudgetProjects,
        delayed_tasks: delayedTasks,
        open_risks_by_impact: openRisksByImpact,
        risky_projects: riskyProjects,
        average_spi: averageSPI,
        average_cpi: averageCPI,
        health_index: healthIndex,
        health_status: healthStatus,
        underperforming_projects: underperformingProjects,
        summary_generated_at: new Date().toISOString(),
      }
    };

    return NextResponse.json(portfolioWithMetrics, { status: 200 });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/portfolios/{id}:
 *   put:
 *     summary: Update a portfolio
 *     description: Updates an existing portfolio by ID
 *     tags:
 *       - Portfolios
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the portfolio to update
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the portfolio
 *               description:
 *                 type: string
 *                 description: Description of the portfolio
 *               manager_id:
 *                 type: integer
 *                 description: ID of the portfolio manager
 *     responses:
 *       200:
 *         description: Portfolio updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 portfolio_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 manager_id:
 *                   type: integer
 *       404:
 *         description: Portfolio not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  try {
    const body = await req.json();
    const { name, description, status, priority, strategic_objective, budget_capacity, tags } = body;

    // Ensure portfolio exists
    const portfolio = await prisma.portfolio.findUnique({
      where: { portfolio_id: parseInt(id) },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio does not exist!' }, { status: 404 });
    }

    // Update portfolio
    const updatedPortfolio = await prisma.portfolio.update({
      where: { portfolio_id: parseInt(id) },
      data: {
        name,
        description: description || null,
        status: status as PortfolioStatus,
        priority: priority as PortfolioPriority,
        strategic_objective: strategic_objective || null,
        budget_capacity: budget_capacity !== undefined ? (budget_capacity > 0 ? budget_capacity : 0) : undefined,
        tags: tags !== undefined ? (Array.isArray(tags) ? tags : []) : undefined,
      },
      include: {
        manager: true,
        projects: {
          select: {
            project_id: true,
            budget_amount: true,
            actual_cost: true,
            progress_percentage: true,
            status: true
          }
        }
      }
    });

    // Calculate additional metrics
    const totalBudgetFromProjects = updatedPortfolio.projects.reduce((sum, project) => sum + project.budget_amount, 0);
    // Use budget_capacity if set, otherwise use sum of project budgets
    const totalBudget = updatedPortfolio.budget_capacity && updatedPortfolio.budget_capacity > 0 
      ? updatedPortfolio.budget_capacity 
      : totalBudgetFromProjects;
    const totalActualCost = updatedPortfolio.projects.reduce((sum, project) => sum + project.actual_cost, 0);
    const avgProgress = updatedPortfolio.projects.length > 0 
      ? updatedPortfolio.projects.reduce((sum, project) => sum + project.progress_percentage, 0) / updatedPortfolio.projects.length 
      : 0;

    const portfolioWithMetrics = {
      ...updatedPortfolio,
      total_budget: totalBudget,
      total_actual_cost: totalActualCost,
      avg_progress: avgProgress,
      project_count: updatedPortfolio.projects.length
    };

    return NextResponse.json(portfolioWithMetrics, { status: 200 });
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/portfolios/{id}:
 *   delete:
 *     summary: Delete a portfolio
 *     description: Deletes a portfolio by ID
 *     tags:
 *       - Portfolios
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the portfolio to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Portfolio deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 portfolio_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 manager_id:
 *                   type: integer
 *       404:
 *         description: Portfolio not found
 *       500:
 *         description: Server error
 */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  
  // Check for force delete parameter
  const url = new URL(req.url);
  const forceDelete = url.searchParams.get('force') === 'true';

  try {
    // Ensure portfolio exists
    const portfolio = await prisma.portfolio.findUnique({
      where: { portfolio_id: parseInt(id) },
      include: {
        projects: {
          select: {
            project_id: true,
            name: true,
            status: true
          }
        }
      }
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio does not exist!' }, { status: 404 });
    }

    // Check for active projects - block deletion if portfolio contains active projects (unless force delete)
    const activeProjectStatuses = ['planning', 'execution', 'pending_approval', 'approved', 'on_hold'];
    const activeProjects = portfolio.projects.filter(p => 
      activeProjectStatuses.includes(p.status)
    );
    const completedProjects = portfolio.projects.filter(p => 
      ['completed', 'closed'].includes(p.status)
    );

    if (activeProjects.length > 0 && !forceDelete) {
      return NextResponse.json({ 
        error: 'Cannot delete portfolio with active projects',
        message: `This portfolio contains ${activeProjects.length} active project(s) that must be completed or closed before deletion.`,
        activeProjects: activeProjects.map(p => ({
          project_id: p.project_id,
          name: p.name,
          status: p.status
        })),
        totalProjects: portfolio.projects.length,
        activeCount: activeProjects.length,
        completedCount: completedProjects.length
      }, { status: 403 });
    }

    // Start a transaction to ensure all deletions are atomic
    // Increase timeout to 60 seconds for large deletions with many projects
    await prisma.$transaction(async (tx) => {
      // Collect all project IDs for batch operations
      const projectIds = portfolio.projects.map(p => p.project_id);
      const portfolioId = parseInt(id);
      
      // Get all schedule IDs linked to projects or the portfolio
      const schedules = await tx.projectSchedule.findMany({
        where: {
          OR: [
            { project_id: { in: projectIds } },
            { portfolio_id: portfolioId }
          ]
        },
        select: { schedule_id: true }
      });
      const scheduleIds = schedules.map(s => s.schedule_id);
      
      // Delete ProjectSchedule-related data first (before deleting schedules)
      if (scheduleIds.length > 0) {
        // Get all task IDs for these schedules
        const scheduleTasks = await tx.scheduleTask.findMany({
          where: { schedule_id: { in: scheduleIds } },
          select: { task_id: true }
        });
        const scheduleTaskIds = scheduleTasks.map(t => t.task_id);
        
        // Get all WBS IDs for these schedules
        const scheduleWBS = await tx.scheduleWBS.findMany({
          where: { schedule_id: { in: scheduleIds } },
          select: { wbs_id: true }
        });
        const scheduleWBSIds = scheduleWBS.map(w => w.wbs_id);
        
        // Delete schedule-related data in proper order
        if (scheduleTaskIds.length > 0) {
          await Promise.all([
            tx.scheduleTaskAssignment.deleteMany({ where: { task_id: { in: scheduleTaskIds } } }),
            tx.scheduleTaskDependency.deleteMany({
              where: {
                OR: [
                  { predecessor_task_id: { in: scheduleTaskIds } },
                  { successor_task_id: { in: scheduleTaskIds } }
                ]
              }
            }),
            tx.scheduleAssignment.deleteMany({ where: { task_id: { in: scheduleTaskIds } } }),
            tx.scheduleRiskMitigation.deleteMany({ where: { task_id: { in: scheduleTaskIds } } }),
          ]);
        }
        
        // Delete schedule-level data
        await Promise.all([
          tx.scheduleTask.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
          tx.scheduleWBS.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
          tx.scheduleBudget.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
          tx.scheduleRisk.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
          tx.scheduleTeamMember.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
          tx.scheduleProcurement.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
          tx.scheduleSite.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
          tx.scheduleConflict.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
          tx.scheduleApproval.deleteMany({ where: { schedule_id: { in: scheduleIds } } }),
        ]);
        
        // Now delete the schedules themselves
        await tx.projectSchedule.deleteMany({
          where: {
            OR: [
              { project_id: { in: projectIds } },
              { portfolio_id: portfolioId }
            ]
          }
        });
      }
      
      // Batch delete project-level data that doesn't have complex dependencies
      // This is more efficient than deleting per project
      if (projectIds.length > 0) {
        // Delete project-level records in batch (parallel execution)
        // Note: Using Promise.all for parallel execution to speed up deletion
        await Promise.all([
          tx.risk.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.budget.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.document.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.lesson.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.baseline.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.eVM.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.procurement.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.transaction.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.alert.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.approval.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.projectApproval.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.projectTeamMember.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.projectAssignment.deleteMany({ where: { projectId: { in: projectIds } } }),
          tx.projectChecklist.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.timeEntry.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.timesheet.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.projectSetup.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.closureDocumentItem.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.closureChecklistItem.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.punchListItem.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.finalInspection.deleteMany({ where: { project_id: { in: projectIds } } }),
          tx.handover.deleteMany({ where: { project_id: { in: projectIds } } }),
        ]);
        
        // Delete equipment site logs and sites in batch
        const sites = await tx.site.findMany({
          where: { project_id: { in: projectIds } },
          select: { site_id: true }
        });
        const siteIds = sites.map(s => s.site_id);
        if (siteIds.length > 0) {
          await tx.equipmentSiteLog.deleteMany({ where: { site_id: { in: siteIds } } });
        }
        await tx.site.deleteMany({ where: { project_id: { in: projectIds } } });
      }
      
      // Delete each project using Prisma directly (for task/WBS dependencies that need sequential deletion)
      for (const project of portfolio.projects) {
        // Delete project-related data in proper order (respecting foreign key constraints)
        
        // Get all task IDs for this project
        const projectTasks = await tx.task.findMany({
          where: { wbs: { project_id: project.project_id } },
          select: { task_id: true }
        });
        const taskIds = projectTasks.map(task => task.task_id);

        // Only proceed with task-related deletions if there are tasks
        if (taskIds.length > 0) {
          // First, delete all records that reference tasks or resource assignments
          // Get resource assignment IDs that belong to these tasks
          const resourceAssignments = await tx.resourceAssignment.findMany({
            where: { task_id: { in: taskIds } },
            select: { assignment_id: true }
          });
          const assignmentIds = resourceAssignments.map(ra => ra.assignment_id);

          // Delete progress reports first (they reference resource assignments)
          if (assignmentIds.length > 0) {
            await tx.fieldData.deleteMany({
              where: { resource_assignment_id: { in: assignmentIds } }
            });
          }

          // Now delete resource assignments
          await tx.resourceAssignment.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          await tx.taskDependency.deleteMany({
            where: { 
              OR: [
                { predecessor_task_id: { in: taskIds } },
                { successor_task_id: { in: taskIds } }
              ]
            }
          });

          await tx.riskMitigation.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          await tx.document.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          await tx.performanceMetric.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          await tx.scorecard.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          await tx.escalation.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          await tx.timeEntry.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          await tx.fieldData.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          await tx.workflowRule.deleteMany({
            where: { 
              OR: [
                { trigger_task_id: { in: taskIds } },
                { action_target_id: { in: taskIds } }
              ]
            }
          });

          await tx.taskComment.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          await tx.taskAssignment.deleteMany({
            where: { task_id: { in: taskIds } }
          });

          // Now we can safely delete tasks
          await tx.task.deleteMany({
            where: { wbs: { project_id: project.project_id } }
          });
        }

        // Delete WBS-related data
        // Get all WBS IDs for this project
        const projectWBS = await tx.wBS.findMany({
          where: { project_id: project.project_id },
          select: { wbs_id: true }
        });
        const wbsIds = projectWBS.map(wbs => wbs.wbs_id);

        if (wbsIds.length > 0) {
          // Delete recurring tasks that reference WBS
          await tx.recurringTask.deleteMany({
            where: { wbs_id: { in: wbsIds } }
          });

          // Delete documents that reference WBS
          await tx.document.deleteMany({
            where: { wbs_id: { in: wbsIds } }
          });
        }

        await tx.wBSItem.deleteMany({
          where: { wbs: { project_id: project.project_id } }
        });

        await tx.wBS.deleteMany({
          where: { project_id: project.project_id }
        });

        // Note: Project-level data (risks, budgets, etc.) already deleted in batch above
        // Only delete the project itself now
        await tx.project.delete({
          where: { project_id: project.project_id }
        });
      }

      // Finally, delete the portfolio
      await tx.portfolio.delete({
        where: { portfolio_id: parseInt(id) }
      });
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
      timeout: 60000, // Maximum time the transaction can run (60 seconds)
    });

    return NextResponse.json({ message: 'Portfolio and all related data deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}