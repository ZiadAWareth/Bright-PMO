import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

// POST /api/schedules/[id]/analyze - Analyze schedule for conflicts and feasibility
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await getUserFromHeaders();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleId = parseInt(id);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    // Verify schedule belongs to user
    const schedule = await prisma.projectSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
        user_id: userId,
      },
      include: {
        tasks: {
          include: {
            assignments: {
              include: {
                resource: true,
              },
            },
            predecessors: {
              include: {
                predecessor: true,
              },
            },
            successors: {
              include: {
                successor: true,
              },
            },
            budget: true,
          },
        },
        budgets: true,
        wbs_items: {
          include: {
            budget: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Clear existing conflicts
    await prisma.scheduleConflict.deleteMany({
      where: { schedule_id: scheduleId },
    });

    const conflicts: any[] = [];
    let feasibilityScore = 100;
    let resourceUtilization = 0;
    let budgetVariance = 0;

    // 1. Analyze resource overallocation
    // Get all resources used in this schedule through task assignments
    const resourceAssignments = schedule.tasks.flatMap(task => 
      task.assignments.map(assignment => ({
        ...assignment,
        task_name: task.name,
      }))
    );

    // Group assignments by resource
    const resourceGroups = resourceAssignments.reduce((groups: any, assignment: any) => {
      const resourceId = assignment.resource.resource_id;
      if (!groups[resourceId]) {
        groups[resourceId] = {
          resource: assignment.resource,
          assignments: [],
        };
      }
      groups[resourceId].assignments.push(assignment);
      return groups;
    }, {});

    // Analyze each resource for overallocation
    for (const resourceId in resourceGroups) {
      const resourceGroup = resourceGroups[resourceId];
      const resource = resourceGroup.resource;
      const assignments = resourceGroup.assignments;
      const resourceConflicts: any[] = [];

      // Group assignments by date ranges
      const dateRanges: any[] = [];
      for (const assignment of assignments) {
        const start = assignment.start_date;
        const end = assignment.end_date;
        
        // Find overlapping ranges
        let found = false;
        for (const range of dateRanges) {
          if (start <= range.end && end >= range.start) {
            range.start = new Date(Math.min(range.start.getTime(), start.getTime()));
            range.end = new Date(Math.max(range.end.getTime(), end.getTime()));
            range.assignments.push(assignment);
            found = true;
            break;
          }
        }
        
        if (!found) {
          dateRanges.push({
            start,
            end,
            assignments: [assignment],
          });
        }
      }

      // Check for overallocation in each range
      for (const range of dateRanges) {
        const totalAllocation = range.assignments.reduce((sum: number, assignment: any) => {
          const overlapStart = new Date(Math.max(range.start.getTime(), assignment.start_date.getTime()));
          const overlapEnd = new Date(Math.min(range.end.getTime(), assignment.end_date.getTime()));
          const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
          const assignmentDays = Math.ceil((assignment.end_date.getTime() - assignment.start_date.getTime()) / (1000 * 60 * 60 * 24));
          const overlapRatio = overlapDays / assignmentDays;
          return sum + (assignment.allocation_percentage * overlapRatio);
        }, 0);

        if (totalAllocation > 100) {
          resourceConflicts.push({
            type: 'resource_overallocation',
            severity: totalAllocation > 150 ? 'critical' : totalAllocation > 120 ? 'high' : 'medium',
            description: `Resource ${resource.name} is overallocated by ${(totalAllocation - 100).toFixed(1)}%`,
            affected_tasks: range.assignments.map((a: any) => a.task_name),
            affected_resources: [resource.name],
            suggested_resolution: 'Reduce allocation percentages or extend task durations',
          });
          
          feasibilityScore -= totalAllocation > 150 ? 20 : totalAllocation > 120 ? 15 : 10;
        }
      }

      conflicts.push(...resourceConflicts);
    }

    // 2. Analyze task dependencies
    for (const task of schedule.tasks) {
      for (const predecessor of task.predecessors) {
        const predTask = predecessor.predecessor;
        if (predTask.end_date > task.start_date) {
          conflicts.push({
            type: 'dependency_violation',
            severity: 'high',
            description: `Task "${task.name}" starts before its predecessor "${predTask.name}" finishes`,
            affected_tasks: [task.name, predTask.name],
            affected_resources: [],
            suggested_resolution: 'Adjust task dates to respect dependencies',
          });
          feasibilityScore -= 15;
        }
      }
    }

    // 3. Analyze budget hierarchy
    const totalBudget = schedule.budget_amount;
    const wbsBudgets = schedule.wbs_items.reduce((sum, wbs) => sum + (wbs.budget?.planned_amount || 0), 0);
    const taskBudgets = schedule.tasks.reduce((sum: number, task: any) => {
      return sum + (task.budget?.planned_amount || 0);
    }, 0);

    if (wbsBudgets > totalBudget) {
      conflicts.push({
        type: 'budget_exceeded',
        severity: 'high',
        description: `WBS budgets (${wbsBudgets}) exceed total project budget (${totalBudget})`,
        affected_tasks: [],
        affected_resources: [],
        suggested_resolution: 'Reduce WBS budgets or increase project budget',
      });
      feasibilityScore -= 20;
      budgetVariance = ((wbsBudgets - totalBudget) / totalBudget) * 100;
    }

    if (taskBudgets > wbsBudgets) {
      conflicts.push({
        type: 'budget_exceeded',
        severity: 'medium',
        description: `Task budgets (${taskBudgets}) exceed WBS budgets (${wbsBudgets})`,
        affected_tasks: [],
        affected_resources: [],
        suggested_resolution: 'Reduce task budgets or increase WBS budgets',
      });
      feasibilityScore -= 10;
    }

    // 4. Calculate resource utilization
    const uniqueResources = Object.keys(resourceGroups).length;
    if (uniqueResources > 0) {
      const totalUtilization = Object.values(resourceGroups).reduce((sum: number, resourceGroup: any) => {
        const totalAllocation = resourceGroup.assignments.reduce((resourceSum: number, assignment: any) => {
          const days = Math.ceil((assignment.end_date.getTime() - assignment.start_date.getTime()) / (1000 * 60 * 60 * 24));
          return resourceSum + (assignment.allocation_percentage * days);
        }, 0);
        return sum + totalAllocation;
      }, 0);
      
      resourceUtilization = totalUtilization / (uniqueResources * 100);
    }

    // 5. Check for unassigned critical tasks
    const unassignedCriticalTasks = schedule.tasks.filter(task => 
      task.is_critical_path && task.assignments.length === 0
    );

    if (unassignedCriticalTasks.length > 0) {
      conflicts.push({
        type: 'resource_unavailable',
        severity: 'high',
        description: `${unassignedCriticalTasks.length} critical path tasks have no resource assignments`,
        affected_tasks: unassignedCriticalTasks.map(t => t.name),
        affected_resources: [],
        suggested_resolution: 'Assign resources to critical path tasks',
      });
      feasibilityScore -= unassignedCriticalTasks.length * 10;
    }

    // Ensure feasibility score doesn't go below 0
    feasibilityScore = Math.max(0, feasibilityScore);

    // Create conflict records
    if (conflicts.length > 0) {
      await prisma.scheduleConflict.createMany({
        data: conflicts.map(conflict => ({
          schedule_id: scheduleId,
          conflict_type: conflict.type,
          severity: conflict.severity,
          description: conflict.description,
          affected_tasks: conflict.affected_tasks,
          affected_resources: conflict.affected_resources,
          suggested_resolution: conflict.suggested_resolution,
          resolved: false,
        })),
      });
    }

    // Update schedule with analysis results
    const updatedSchedule = await prisma.projectSchedule.update({
      where: { schedule_id: scheduleId },
      data: {
        feasibility_score: feasibilityScore,
        conflicts_count: conflicts.length,
        resource_utilization: resourceUtilization,
        budget_variance: budgetVariance,
        status: conflicts.length === 0 ? 'feasible' : 'infeasible',
      },
      include: {
        conflicts: {
          orderBy: { severity: 'desc' },
        },
      },
    });

    return NextResponse.json({
      schedule: updatedSchedule,
      analysis: {
        feasibility_score: feasibilityScore,
        conflicts_count: conflicts.length,
        resource_utilization: resourceUtilization,
        budget_variance: budgetVariance,
        conflicts: conflicts,
        status: conflicts.length === 0 ? 'feasible' : 'infeasible',
      },
    });
  } catch (error) {
    console.error('Error analyzing schedule:', error);
    return NextResponse.json(
      { error: 'Failed to analyze schedule' },
      { status: 500 }
    );
  }
} 