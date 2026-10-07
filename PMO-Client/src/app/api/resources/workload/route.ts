import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Configurable thresholds (can be moved to environment variables later)
const WORKLOAD_THRESHOLDS = {
  overloaded_threshold: 90,
  under_utilized_threshold: 60
};

interface WorkloadQueryParams {
  start_date?: string;
  end_date?: string;
  department?: string;
  role?: string;
  project_id?: string;
  task_id?: string;
}

/**
 * @swagger
 * /api/resources/workload:
 *   get:
 *     summary: Get workload overview for all resources
 *     description: Retrieves workload utilization data for all resources with filtering options. Shows who is overloaded, optimal, or under-utilized.
 *     tags:
 *       - Resource Workload
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for workload calculation (defaults to current month start)
 *         example: "2024-01-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for workload calculation (defaults to current month end)
 *         example: "2024-01-31"
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter resources by department
 *         example: "Construction"
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter resources by role
 *         example: "Engineer"
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: Filter by assignments to specific project
 *       - in: query
 *         name: task_id
 *         schema:
 *           type: integer
 *         description: Filter by assignments to specific task
 *     responses:
 *       200:
 *         description: Workload overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     start_date:
 *                       type: string
 *                       format: date
 *                     end_date:
 *                       type: string
 *                       format: date
 *                 thresholds:
 *                   type: object
 *                   properties:
 *                     overloaded_threshold:
 *                       type: number
 *                       example: 90
 *                     under_utilized_threshold:
 *                       type: number
 *                       example: 60
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_resources:
 *                       type: integer
 *                     overloaded_count:
 *                       type: integer
 *                     under_utilized_count:
 *                       type: integer
 *                     optimal_count:
 *                       type: integer
 *                 resources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       resource_id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *                       department:
 *                         type: string
 *                       capacity_hours:
 *                         type: number
 *                         description: Total capacity hours for the period
 *                       planned_hours:
 *                         type: number
 *                         description: Total planned hours for the period
 *                       actual_hours:
 *                         type: number
 *                         description: Total actual hours for the period
 *                       planned_utilization_rate:
 *                         type: number
 *                         description: Planned hours / capacity hours * 100
 *                       actual_utilization_rate:
 *                         type: number
 *                         description: Actual hours / capacity hours * 100
 *                       status:
 *                         type: string
 *                         enum: [overloaded, optimal, under_utilized]
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        // Get query parameters
        const params: WorkloadQueryParams = {
            start_date: searchParams.get('start_date') || undefined,
            end_date: searchParams.get('end_date') || undefined,
            department: searchParams.get('department') || undefined,
            role: searchParams.get('role') || undefined,
            project_id: searchParams.get('project_id') || undefined,
            task_id: searchParams.get('task_id') || undefined,
        };

        // Set default date range (current month if not provided)
        const now = new Date();
        const startDate = params.start_date ? new Date(params.start_date) : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = params.end_date ? new Date(params.end_date) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Validate date range
        if (startDate > endDate) {
            return NextResponse.json(
                { error: 'start_date must be before or equal to end_date' },
                { status: 400 }
            );
        }

        // Build resource filter
        const resourceWhere: any = {
            availability_status: 'available',
        };

        if (params.department) {
            resourceWhere.department = params.department;
        }

        if (params.role) {
            resourceWhere.role = params.role;
        }

        // Build assignment filter for date range and optional task/project filters
        const assignmentWhere: any = {
            AND: [
                { start_date: { lte: endDate } },
                { end_date: { gte: startDate } },
            ],
        };

        if (params.task_id) {
            assignmentWhere.task_id = parseInt(params.task_id);
        }

        if (params.project_id) {
            assignmentWhere.task = {
                wbs: {
                    project_id: parseInt(params.project_id)
                }
            };
        }

        // Get resources with their assignments in the specified period
        const resources = await prisma.resource.findMany({
            where: resourceWhere,
            include: {
                assignments: {
                    where: assignmentWhere,
                    include: {
                        task: {
                            include: {
                                wbs: {
                                    include: {
                                        project: {
                                            select: {
                                                name: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Calculate workload metrics for each resource
        const workloadData = resources.map(resource => {
            // Calculate working days in the period (excluding weekends)
            const workingDays = calculateWorkingDays(startDate, endDate);
            const capacityHours = (resource as any).capacity * workingDays;

            // Calculate total planned and actual hours for assignments that overlap with our period
            let totalPlannedHours = 0;
            let totalActualHours = 0;

            resource.assignments.forEach(assignment => {
                // Calculate overlap between assignment period and query period
                const assignmentStart = new Date(assignment.start_date);
                const assignmentEnd = new Date(assignment.end_date);
                
                const overlapStart = new Date(Math.max(assignmentStart.getTime(), startDate.getTime()));
                const overlapEnd = new Date(Math.min(assignmentEnd.getTime(), endDate.getTime()));
                
                if (overlapStart <= overlapEnd) {
                    const overlapDays = calculateWorkingDays(overlapStart, overlapEnd);
                    const assignmentDays = calculateWorkingDays(assignmentStart, assignmentEnd);
                    
                    // Proportional allocation based on overlap
                    const overlapRatio = assignmentDays > 0 ? overlapDays / assignmentDays : 0;
                    
                    totalPlannedHours += assignment.planned_hours * overlapRatio;
                    totalActualHours += assignment.actual_hours * overlapRatio;
                }
            });

            // Calculate utilization rates
            const plannedUtilizationRate = capacityHours > 0 ? (totalPlannedHours / capacityHours) * 100 : 0;
            const actualUtilizationRate = capacityHours > 0 ? (totalActualHours / capacityHours) * 100 : 0;

            // Determine status based on planned utilization
            let status: 'overloaded' | 'optimal' | 'under_utilized';
            if (plannedUtilizationRate > WORKLOAD_THRESHOLDS.overloaded_threshold) {
                status = 'overloaded';
            } else if (plannedUtilizationRate < WORKLOAD_THRESHOLDS.under_utilized_threshold) {
                status = 'under_utilized';
            } else {
                status = 'optimal';
            }

            // If no assignments, set status to under_utilized
            if (resource.assignments.length === 0) {
                status = 'under_utilized';
            }

            return {
                resource_id: resource.resource_id,
                name: resource.name,
                role: resource.role,
                department: resource.department,
                capacity_hours: capacityHours,
                planned_hours: Math.round(totalPlannedHours * 100) / 100,
                actual_hours: Math.round(totalActualHours * 100) / 100,
                planned_utilization_rate: Math.round(plannedUtilizationRate * 100) / 100,
                actual_utilization_rate: Math.round(actualUtilizationRate * 100) / 100,
                status
            };
        });

        // Calculate summary statistics
        const summary = {
            total_resources: workloadData.length,
            overloaded_count: workloadData.filter(r => r.status === 'overloaded').length,
            under_utilized_count: workloadData.filter(r => r.status === 'under_utilized').length,
            optimal_count: workloadData.filter(r => r.status === 'optimal').length,
        };

        const response = {
            period: {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            },
            thresholds: WORKLOAD_THRESHOLDS,
            summary,
            resources: workloadData
        };

        return NextResponse.json(response);

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch resource workload data' },
            { status: 500 }
        );
    }
}

/**
 * Calculate working days between two dates (excluding weekends)
 */
function calculateWorkingDays(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
} 
