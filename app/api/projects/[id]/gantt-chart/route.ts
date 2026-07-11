import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/projects/{id}/gantt-chart:
 *   get:
 *     summary: Get Gantt chart data for a project
 *     description: Retrieves comprehensive Gantt chart data including WBS nodes with timelines, tasks, dependencies, and resources for a specific project
 *     tags:
 *       - Project Resources
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to retrieve Gantt chart data for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Gantt chart data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timelines:
 *                   type: object
 *                   properties:
 *                     project:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         start:
 *                           type: string
 *                           format: date
 *                         end:
 *                           type: string
 *                           format: date
 *                     wbs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                           level:
 *                             type: integer
 *                           progress:
 *                             type: number
 *                             format: float
 *                           start:
 *                             type: string
 *                             format: date
 *                             description: WBS start date for timeline visualization
 *                           end:
 *                             type: string
 *                             format: date
 *                             description: WBS end date for timeline visualization
 *                     wbsItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                           wbs_id:
 *                             type: integer
 *                           start:
 *                             type: string
 *                             format: date
 *                           end:
 *                             type: string
 *                             format: date
 *                           budget:
 *                             type: number
 *                             format: float
 *                           actualCost:
 *                             type: number
 *                             format: float
 *                           progress:
 *                             type: number
 *                             format: float
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       start:
 *                         type: string
 *                         format: date
 *                       end:
 *                         type: string
 *                         format: date
 *                       actualStart:
 *                         type: string
 *                         format: date
 *                       actualEnd:
 *                         type: string
 *                         format: date
 *                       progress:
 *                         type: number
 *                         format: float
 *                       duration:
 *                         type: integer
 *                       isMilestone:
 *                         type: boolean
 *                       isCritical:
 *                         type: boolean
 *                       hasDependencies:
 *                         type: boolean
 *                         description: Indicates if the task has any dependencies (predecessors or successors)
 *                       hasPredecessors:
 *                         type: boolean
 *                         description: Indicates if the task has predecessor dependencies
 *                       hasSuccessors:
 *                         type: boolean
 *                         description: Indicates if the task has successor dependencies
 *                       dependencyCount:
 *                         type: integer
 *                         description: Total number of dependencies (predecessors + successors)
 *                       wbs:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                       predecessors:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             type:
 *                               type: string
 *                             lag:
 *                               type: integer
 *                       resources:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             allocation:
 *                               type: number
 *                               format: float
 *                 milestones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Same structure as tasks but filtered for milestones
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
// GET Gantt chart data for a project
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  
  try {
    const projectId = parseInt(id);
    
    // 1. check if the project exists
    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    // 2. get all WBS elements for the project
    const wbsElements = await prisma.wBS.findMany({
      where: { project_id: projectId }
    });
    
    const wbsIds = wbsElements.map(wbs => wbs.wbs_id);
    
    // 3. get all WBS items for the project
    const wbsItems = await prisma.wBSItem.findMany({
      where: { wbs_id: { in: wbsIds } }
    });
    
    // 4. get all tasks for the project through WBS
    const tasks = await prisma.task.findMany({
      where: {
        wbs_id: { in: wbsIds }
      },
      include: {
        wbs: true,
        predecessor_dependencies: {
          include: { predecessor: true }
        },
        successor_dependencies: {
          include: { successor: true }
        },
        resourceAssignments: {
          include: { resource: true }
        }
      }
    });
    
    // 5. format task data for Gantt chart
    const ganttTasks = tasks.map(task => {
      // Format predecessors for the Gantt chart
      const predecessors = task.predecessor_dependencies.map(dep => ({
        id: dep.predecessor.task_id,
        name: dep.predecessor.name,
        type: dep.dependency_type,
        lag: dep.lag_time
      }));
      
      // Format resource assignments for the Gantt chart
      const resources = task.resourceAssignments.map(assignment => ({
        id: assignment.resource.resource_id,
        name: assignment.resource.name,
        allocation: assignment.allocation_percentage
      }));
      
      // Check for dependency indicators
      const hasPredecessors = task.predecessor_dependencies.length > 0;
      const hasSuccessors = task.successor_dependencies.length > 0;
      const hasDependencies = hasPredecessors || hasSuccessors;
      
      // Return a formatted task object for the Gantt chart
      return {
        id: task.task_id,
        name: task.name,
        start: task.start_date,
        end: task.end_date,
        actualStart: task.actual_start_date,
        actualEnd: task.actual_end_date,
        progress: task.progress_percentage,
        duration: task.duration,
        isMilestone: task.is_milestone,
        isCritical: task.is_critical_path,
        hasDependencies: hasDependencies,
        hasPredecessors: hasPredecessors,
        hasSuccessors: hasSuccessors,
        dependencyCount: task.predecessor_dependencies.length + task.successor_dependencies.length,
        wbs: {
          id: task.wbs.wbs_id,
          name: task.wbs.name
        },
        predecessors,
        resources
      };
    });
    
    // Step 6: Structure the response with enhanced timeline data
    const ganttData = {
        timelines: {
            project: {
                id: project.project_id,
                name: project.name,
                start: project.start_date,
                end: project.planned_end_date
            },
            wbs: wbsElements.map(wbs => ({
                id: wbs.wbs_id,
                name: wbs.name,
                code: wbs.wbs_code,
                level: wbs.level,
                progress: wbs.progress_percentage,
                start: wbs.start_date,
                end: wbs.end_date
            })),
            wbsItems: wbsItems.map(item => ({
                id: item.wbs_item_id,
                name: item.name,
                code: item.wbs_item_code,
                wbs_id: item.wbs_id,
                start: item.start_date,
                end: item.end_date,
                budget: item.budget_amount,
                actualCost: item.actual_cost,
                progress: item.progress_percentage
            }))
        },
        tasks: ganttTasks.filter(task => !task.isMilestone),
        milestones: ganttTasks.filter(task => task.isMilestone)
    };
    
    return NextResponse.json(ganttData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate Gantt chart data: " + (error as Error).message },
      { status: 500 }
    );
  }
} 