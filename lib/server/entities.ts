import { prisma } from "../prisma";
import { entityConfig } from "../entities";
import { PrismaClient, TaskStatus } from "@prisma/client";

type PrismaModel = {
  findMany: (args: any) => Promise<any>;
  findUnique: (args: any) => Promise<any>;
};

export const getEntityConfig = (entityKey: string) => {
  const config = entityConfig[entityKey];
  if (!config) {
    throw new Error(`Entity configuration not found for ${entityKey}`);
  }

  const model = prisma[entityKey as keyof typeof prisma] as PrismaModel;
  if (!model || typeof model.findMany !== 'function') {
    throw new Error(`Invalid model for entity ${entityKey}`);
  }

  return {
    ...config,
    model,
  };
};

export const getEntityList = async (entityKey: string) => {
  const config = getEntityConfig(entityKey);
  return config.model.findMany({
    include: config.include,
  });
};

export const getEntityById = async (entityKey: string, id: number) => {
  const config = getEntityConfig(entityKey);
  return config.model.findUnique({
    where: { [`${entityKey}_id`]: id },
    include: config.include,
  });
};

// Function to check milestone completion and trigger EVM calculations
export async function checkMilestoneCompletion() {
  const milestoneTasks = await prisma.task.findMany({
    where: {
      is_milestone: true, // Only consider tasks marked as milestones
      end_date: { lte: new Date() }, // Check if the milestone is due
      status: TaskStatus.todo, // Only consider pending milestones
    },
  });

  for (const task of milestoneTasks) {
    // Mark milestone task as completed
    await prisma.task.update({
      where: { task_id: task.task_id },
      data: { status: TaskStatus.completed },
    });

    // Trigger EVM calculation for the completed milestone
    await triggerEVMCalculation(task.task_id);
  }
}

// Function to calculate EVM metrics and handle escalations
export async function triggerEVMCalculation(taskId: number) {
  const task = await prisma.task.findUnique({
    where: { task_id: taskId },
    include: { wbs: { include: { project: true } } }, // Include related project data
  });

  if (!task) throw new Error('Task not found');

  // Calculate CPI (avoid division by zero) and SPI
  const budgetAmt = task.wbs.project.budget_amount;
  const cpi = budgetAmt > 0 ? task.wbs.project.actual_cost / budgetAmt : 0;
  const spi = task.progress_percentage / 100;
  const evmData = { cpi, spi };

  // Save performance metrics
  await prisma.performanceMetric.create({
    data: {
      cpi: evmData.cpi,
      spi: evmData.spi,
      status: evmData.cpi < 0.9 || evmData.spi < 0.9 ? 'At Risk' : 'On Track',
      commentary: evmData.cpi < 0.9 || evmData.spi < 0.9 ? 'Performance below threshold' : 'Performance is satisfactory',
      task: { connect: { task_id: taskId } }
    },
  });

  // Generate scorecard
  await prisma.scorecard.create({
    data: {
      cpi: evmData.cpi,
      spi: evmData.spi,
      status: evmData.cpi < 0.9 || evmData.spi < 0.9 ? 'At Risk' : 'On Track',
      commentary: evmData.cpi < 0.9 || evmData.spi < 0.9 ? 'Performance below threshold' : 'Performance is satisfactory',
      task: { connect: { task_id: taskId } }
    },
  });

  // Trigger escalation if necessary
  if (evmData.cpi < 0.9 || evmData.spi < 0.9) {
    await triggerEscalation(taskId, 'Performance below threshold');
  }
}

// Function to handle escalations for tasks
export async function triggerEscalation(taskId: number, reason: string) {
  await prisma.escalation.create({
    data: {
      task_id: taskId,
      triggered_at: new Date(), // Record the time of escalation
      escalated_to: 'PMO, DIR', // Notify stakeholders (e.g., PMO, Director)
      reason, // Reason for the escalation
    },
  });

  // Log the escalation (can be replaced with actual notification logic)
  console.log(`Escalation triggered for task ${taskId}: ${reason}`);
}

// Function to send reminders for mitigation actions
export async function sendReminders() {
  // Fetch mitigation actions that are due in 3 days or overdue
  const actions = await prisma.riskMitigation.findMany({
    where: {
      due_date: {
        lte: new Date(new Date().setDate(new Date().getDate() + 3)), // Due in 3 days
      },
      status: {
        not: "completed", // Exclude completed actions
      },
    },
  });

  for (const action of actions) {
    // Log the reminder in the ReminderLog table
    await prisma.reminderLog.create({
      data: {
        actionId: action.mitigation_id,
        sentAt: new Date(),
        method: "Email", // Example method of notification
        status: "Sent", // Mark as sent
      },
    });

    console.log(`Reminder sent for mitigation action ${action.mitigation_id}`);
  }
}

// Function to notify and escalate overdue mitigation actions
export async function notifyAndEscalate() {
  // Fetch mitigation actions that are overdue
  const overdueActions = await prisma.riskMitigation.findMany({
    where: {
      due_date: {
        lt: new Date(), // Overdue actions
      },
      status: {
        not: "completed", // Exclude completed actions
      },
    },
  });

  for (const action of overdueActions) {
    const overdueDays = Math.ceil((new Date().getTime() - new Date(action.due_date).getTime()) / (1000 * 60 * 60 * 24));

    // Notify the Project Manager (PJM)
    console.log(`Notification sent to PM for overdue action ${action.mitigation_id}`);

    // Escalate if overdue for more than 7 days
    if (overdueDays > 7) {
      console.log(`Escalation triggered for action ${action.mitigation_id}`);
    }
  }
}

/**
 * Migrates all schedule-related data to the real project models when a schedule is fully approved.
 * @param scheduleId The ID of the ProjectSchedule to migrate
 * @returns The project_id of the created/updated project
 */
export async function migrateScheduleToProject(scheduleId: number): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    // 1. Get the schedule and all related data
    const schedule = await tx.projectSchedule.findUnique({
      where: { schedule_id: scheduleId },
      include: {
        wbs_items: { include: { tasks: { include: { assignments: true, user_assignments: true, predecessors: true, successors: true, budget: true } }, budget: true, procurements: true } },
        tasks: { include: { assignments: true, user_assignments: true, predecessors: true, successors: true, budget: true } },
        budgets: true,
        team_members: true,
        risks: { include: { mitigations: true } },
        procurements: true,
        sites: true,
      },
    });
    if (!schedule) throw new Error('Schedule not found');

    // 2. Create or update the Project
    let project = null;
    if (schedule.project_id) {
      project = await tx.project.update({
        where: { project_id: schedule.project_id },
        data: {
          name: schedule.name,
          description: schedule.description || '',
          start_date: schedule.start_date,
          planned_end_date: schedule.planned_end_date,
          budget_amount: schedule.budget_amount,
          actual_cost: 0,
          priority: schedule.priority,
          type: schedule.type,
          location: schedule.location || '',
          client: schedule.client || '',
          contractor: schedule.contractor || '',
          strategicValue: schedule.strategic_value,
          required_approvals: 2, // or from schedule if available
          status: 'approved',
          compliance: 'pending',
          roi: 0,
          expected_roi: 0,
          healthScore: 50,
          riskScore: 0,
          qualityScore: 50,
          tags: [],
          size: 0,
          archived: false,
          manager_id: schedule.user_id,
          eps_level_id: schedule.eps_level_id || 1,
          portfolio_id: schedule.portfolio_id || 1,
        },
      });
    } else {
      project = await tx.project.create({
        data: {
          project_code: `SCHED-${scheduleId}-${Date.now()}`,
          name: schedule.name,
          description: schedule.description || '',
          start_date: schedule.start_date,
          planned_end_date: schedule.planned_end_date,
          budget_amount: schedule.budget_amount,
          actual_cost: 0,
          priority: schedule.priority,
          type: schedule.type,
          location: schedule.location || '',
          client: schedule.client || '',
          contractor: schedule.contractor || '',
          strategicValue: schedule.strategic_value,
          required_approvals: 2, // or from schedule if available
          status: 'approved',
          compliance: 'pending',
          roi: 0,
          expected_roi: 0,
          healthScore: 50,
          riskScore: 0,
          qualityScore: 50,
          tags: [],
          size: 0,
          archived: false,
          created_by: schedule.user_id,
          eps_level_id: schedule.eps_level_id || 1,
          portfolio_id: schedule.portfolio_id || 1,
          manager_id: schedule.user_id,
        },
      });
      // Link schedule to project
      await tx.projectSchedule.update({
        where: { schedule_id: scheduleId },
        data: { project_id: project.project_id },
      });
    }
    const projectId = project.project_id;

    // 3. Migrate WBS
    const wbsIdMap = new Map<number, number>();
    for (const wbs of schedule.wbs_items) {
      const newWbs = await tx.wBS.create({
        data: {
          wbs_code: wbs.wbs_code,
          name: wbs.name,
          description: wbs.description || '',
          status: wbs.status,
          project_id: projectId,
          parent_wbs_id: null, // Set below if needed
          level: wbs.level,
          progress_percentage: wbs.progress_percentage,
          start_date: wbs.start_date,
          end_date: wbs.end_date,
        },
      });
      wbsIdMap.set(wbs.wbs_id, newWbs.wbs_id);
    }
    // Set parent_wbs_id for WBS
    for (const wbs of schedule.wbs_items) {
      if (wbs.parent_wbs_id) {
        const newWbsId = wbsIdMap.get(wbs.wbs_id)!;
        const newParentId = wbsIdMap.get(wbs.parent_wbs_id);
        if (newParentId) {
          await tx.wBS.update({
            where: { wbs_id: newWbsId },
            data: { parent_wbs_id: newParentId },
          });
        }
      }
    }

    // 4. Migrate Tasks
    const taskIdMap = new Map<number, number>();
    for (const wbs of schedule.wbs_items) {
      for (const task of wbs.tasks) {
        const newTask = await tx.task.create({
          data: {
            name: task.name,
            description: task.description || '',
            wbs_id: wbsIdMap.get(wbs.wbs_id)!,
            start_date: task.start_date,
            end_date: task.end_date,
            duration: task.duration,
            progress_percentage: task.progress_percentage,
            is_milestone: task.is_milestone,
            is_critical_path: task.is_critical_path,
            priority: task.priority,
            status: task.status,
            estimated_hours: task.estimated_hours,
            actual_hours: 0,
            work_package: task.work_package || '',
            created_by: schedule.user_id,
          },
        });
        taskIdMap.set(task.task_id, newTask.task_id);
      }
    }

    // 4b. Migrate Task Dependencies
    for (const wbs of schedule.wbs_items) {
      for (const task of wbs.tasks) {
        // Predecessors
        if (Array.isArray(task.predecessors)) {
          for (const dep of task.predecessors) {
            const predecessorId = taskIdMap.get(dep.predecessor_task_id);
            const successorId = taskIdMap.get(dep.successor_task_id);
            if (predecessorId && successorId) {
              await tx.taskDependency.create({
                data: {
                  predecessor_task_id: predecessorId,
                  successor_task_id: successorId,
                  dependency_type: dep.dependency_type,
                  lag_time: dep.lag_time ?? 0,
                },
              });
            }
          }
        }
        // Successors (optional, usually covered by predecessors)
      }
    }

    // 4c. Migrate Team Member Assignments to Tasks
    for (const wbs of schedule.wbs_items) {
      for (const task of wbs.tasks) {
        if (Array.isArray(task.user_assignments)) {
          for (const assignment of task.user_assignments) {
            const newTaskId = taskIdMap.get(task.task_id);
            if (newTaskId && assignment.user_id) {
              await tx.taskAssignment.create({
                data: {
                  task_id: newTaskId,
                  user_id: assignment.user_id,
                  assigned_at: assignment.created_at || new Date(),
                },
              });
            }
          }
        }
      }
    }

    // 4d. Migrate Resource Assignments to Tasks
    for (const wbs of schedule.wbs_items) {
      for (const task of wbs.tasks) {
        if (Array.isArray(task.assignments)) {
          for (const assignment of task.assignments) {
            const newTaskId = taskIdMap.get(task.task_id);
            if (newTaskId && assignment.resource_id) {
              await tx.resourceAssignment.create({
                data: {
                  resource_id: assignment.resource_id,
                  task_id: newTaskId,
                  allocation_percentage: assignment.allocation_percentage || 100,
                  start_date: assignment.start_date || task.start_date,
                  end_date: assignment.end_date || task.end_date,
                  planned_hours: assignment.planned_hours || 0,
                  actual_hours: 0,
                  progress: assignment.progress || 0,
                },
              });
            }
          }
        }
      }
    }

    // 5. Migrate Team Members
    for (const member of schedule.team_members) {
      await tx.projectTeamMember.create({
        data: {
          project_id: projectId,
          user_id: member.user_id,
          role: member.role || '',
          department: member.department || '',
          is_lead: member.is_lead,
          workload: member.workload,
        },
      });
    }

    // 6. Migrate Budgets
    for (const budget of schedule.budgets) {
      await tx.budget.create({
        data: {
          project_id: projectId,
          wbs_id: budget.wbs_id ? wbsIdMap.get(budget.wbs_id) : undefined,
          task_id: budget.task_id ? taskIdMap.get(budget.task_id) : undefined,
          cost_type: budget.cost_type || '',
          planned_amount: budget.planned_amount,
          actual_amount: 0,
          variance: 0,
          threshold: budget.threshold,
          fiscal_year: budget.fiscal_year,
          fiscal_period: budget.fiscal_period || '',
        },
      });
    }

    // 7. Migrate Risks
    for (const risk of schedule.risks) {
      const riskData: any = {
        project_id: projectId,
        name: risk.name || '',
        description: risk.description || '',
        category: risk.category,
        impact: risk.impact,
        probability: risk.probability,
        risk_level: risk.risk_level,
        risk_score: risk.risk_score,
        likelihood_score: risk.likelihood_score || 0,
        impact_score: risk.impact_score || 0,
        status: risk.status,
        identified_date: risk.identified_date,
        mitigation_plan: risk.mitigation_plan || '',
      };
      if (risk.owner_id) riskData.owner_id = risk.owner_id;
      const newRisk = await tx.risk.create({ data: riskData });
      // Migrate mitigations
      for (const mitigation of risk.mitigations) {
        const mitigationData: any = {
          risk_id: newRisk.risk_id,
          description: mitigation.description || '',
          action_plan: mitigation.action_plan || '',
          mitigation_type: mitigation.mitigation_type,
          start_date: mitigation.start_date,
          due_date: mitigation.due_date,
          status: mitigation.status,
          progress_percentage: mitigation.progress_percentage || 0,
          notes: mitigation.notes || '',
        };
        if (mitigation.user_id) mitigationData.user_id = mitigation.user_id;
        await tx.riskMitigation.create({ data: mitigationData });
      }
    }

    // 8. Migrate Procurements
    for (const procurement of schedule.procurements) {
      const procurementData: any = {
        project_id: projectId,
        wbs_id: procurement.wbs_id ? wbsIdMap.get(procurement.wbs_id) : undefined,
        type: procurement.type,
        description: procurement.description || '',
        estimated_cost: procurement.estimated_cost,
        actual_cost: procurement.actual_cost || 0,
        status: procurement.status || 'planned',
        // delivery_date: procurement.delivery_date || undefined, // OMITTED if not in model
      };
      await tx.procurement.create({ data: procurementData });
    }

    // 9. Migrate Sites
    for (const site of schedule.sites) {
      const siteData: any = {
        project_id: projectId,
        name: site.name || '',
        address: site.address || '',
        capacity: site.capacity || 0,
        description: site.description || '',
        // site_type: site.site_type || '', // OMITTED if not in model
      };
      await tx.site.create({ data: siteData });
    }

    // TODO: Migrate assignments, dependencies, and other relations as needed
    // (You can expand this section to cover all relations in your schema)

    return projectId;
  });
}