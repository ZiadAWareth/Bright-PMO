import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Configurable thresholds (should match the overview endpoint)
const WORKLOAD_THRESHOLDS = {
  overloaded_threshold: 90,
  under_utilized_threshold: 60
};

interface WorkloadQueryParams {
  start_date?: string;
  end_date?: string;
  breakdown?: 'daily' | 'weekly' | 'monthly';
}

/**
 * @swagger
 * /api/resources/{resource_id}/workload:
 *   get:
 *     summary: Get detailed workload for a specific resource
 *     description: Retrieves detailed workload utilization data for a specific resource including assignment breakdown and optional time-based breakdown.
 *     tags:
 *       - Resource Workload
 *     parameters:
 *       - in: path
 *         name: resource_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the resource to get workload for
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
 *         name: breakdown
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         description: Optional breakdown granularity
 *     responses:
 *       200:
 *         description: Resource workload retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resource:
 *                   type: object
 *                   properties:
 *                     resource_id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     department:
 *                       type: string
 *                     capacity:
 *                       type: number
 *                       description: Daily capacity in hours
 *                     availability_status:
 *                       type: string
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
 *                     under_utilized_threshold:
 *                       type: number
 *                 utilization_summary:
 *                   type: object
 *                   properties:
 *                     total_capacity_hours:
 *                       type: number
 *                     total_planned_hours:
 *                       type: number
 *                     total_actual_hours:
 *                       type: number
 *                     planned_utilization_rate:
 *                       type: number
 *                     actual_utilization_rate:
 *                       type: number
 *                     status:
 *                       type: string
 *                       enum: [overloaded, optimal, under_utilized]
 *                 assignments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assignment_id:
 *                         type: integer
 *                       task_id:
 *                         type: integer
 *                       task_name:
 *                         type: string
 *                       project_name:
 *                         type: string
 *                       start_date:
 *                         type: string
 *                         format: date
 *                       end_date:
 *                         type: string
 *                         format: date
 *                       planned_hours:
 *                         type: number
 *                       actual_hours:
 *                         type: number
 *                       allocation_percentage:
 *                         type: number
 *                 breakdown:
 *                   type: array
 *                   description: Optional time-based breakdown (only if breakdown parameter is provided)
 *                   items:
 *                     type: object
 *       404:
 *         description: Resource not found
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ resource_id: string }> }
) {
  const resolvedParams = await context.params;
  const { resource_id } = resolvedParams;

  try {
    const resourceId = parseInt(resource_id);
    
    if (isNaN(resourceId)) {
      return NextResponse.json(
        { error: 'Invalid resource_id. Must be a number.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    
    // Get query parameters
    const queryParams: WorkloadQueryParams = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      breakdown: (searchParams.get('breakdown') as 'daily' | 'weekly' | 'monthly') || undefined,
    };

    // Set default date range (current month if not provided)
    const now = new Date();
    const startDate = queryParams.start_date ? new Date(queryParams.start_date) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = queryParams.end_date ? new Date(queryParams.end_date) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'start_date must be before or equal to end_date' },
        { status: 400 }
      );
    }

    // Get resource with assignments in the specified period
    const resource = await prisma.resource.findUnique({
      where: { resource_id: resourceId },
      include: {
        assignments: {
          where: {
            AND: [
              { start_date: { lte: endDate } },
              { end_date: { gte: startDate } },
            ],
          },
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
          },
          orderBy: {
            start_date: 'asc'
          }
        }
      }
    });

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Calculate working days in the period
    const workingDays = calculateWorkingDays(startDate, endDate);
    const totalCapacityHours = resource.capacity * workingDays;

    // Calculate total planned and actual hours
    let totalPlannedHours = 0;
    let totalActualHours = 0;

    const dailyCapacity = resource.capacity;

    const assignmentDetails = resource.assignments.map(assignment => {
        // Calculate overlap between assignment period and query period
        const assignmentStart = new Date(assignment.start_date);
        const assignmentEnd = new Date(assignment.end_date);

        const overlapStart = new Date(Math.max(assignmentStart.getTime(), startDate.getTime()));
        const overlapEnd = new Date(Math.min(assignmentEnd.getTime(), endDate.getTime()));

        let overlappingPlannedHours = 0;
        let overlappingActualHours = 0;

        if (overlapStart <= overlapEnd) {
            const overlapDays = calculateWorkingDays(overlapStart, overlapEnd);
            const assignmentDays = calculateWorkingDays(assignmentStart, assignmentEnd);
            const overlapRatio = assignmentDays > 0 ? overlapDays / assignmentDays : 0;

            // Use allocation_percentage for period utilization so "50% allocated" shows as 50%
            const pct = Math.min(100, Math.max(0, assignment.allocation_percentage ?? 0)) / 100;
            overlappingPlannedHours = pct * dailyCapacity * overlapDays;
            overlappingActualHours = assignment.actual_hours * overlapRatio;

            totalPlannedHours += overlappingPlannedHours;
            totalActualHours += overlappingActualHours;
        }

        return {
            assignment_id: assignment.assignment_id,
            task_id: assignment.task_id,
            task_name: assignment.task.name,
            project_name: assignment.task.wbs.project.name,
            start_date: assignment.start_date.toISOString().split('T')[0],
            end_date: assignment.end_date.toISOString().split('T')[0],
            planned_hours: Math.round(overlappingPlannedHours * 100) / 100,
            actual_hours: Math.round(overlappingActualHours * 100) / 100,
            allocation_percentage: assignment.allocation_percentage,
            full_planned_hours: assignment.planned_hours,
            full_actual_hours: assignment.actual_hours
        };
    });

    // Calculate utilization rates
    const plannedUtilizationRate = totalCapacityHours > 0 ? (totalPlannedHours / totalCapacityHours) * 100 : 0;
    const actualUtilizationRate = totalCapacityHours > 0 ? (totalActualHours / totalCapacityHours) * 100 : 0;

    // Determine status based on planned utilization
    let status: 'overloaded' | 'optimal' | 'under_utilized';
    if (plannedUtilizationRate > WORKLOAD_THRESHOLDS.overloaded_threshold) {
        status = 'overloaded';
    } else if (plannedUtilizationRate < WORKLOAD_THRESHOLDS.under_utilized_threshold) {
        status = 'under_utilized';
    } else {
        status = 'optimal';
    }

    // Prepare response
    const response: any = {
        resource: {
            resource_id: resource.resource_id,
            name: resource.name,
            role: resource.role,
            department: resource.department,
            capacity: resource.capacity,
            availability_status: resource.availability_status
        },
        period: {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        },
        thresholds: WORKLOAD_THRESHOLDS,
        utilization_summary: {
            total_capacity_hours: totalCapacityHours,
            total_planned_hours: Math.round(totalPlannedHours * 100) / 100,
            total_actual_hours: Math.round(totalActualHours * 100) / 100,
            planned_utilization_rate: Math.round(plannedUtilizationRate * 100) / 100,
            actual_utilization_rate: Math.round(actualUtilizationRate * 100) / 100,
            status
        },
        assignments: assignmentDetails
    };

    // Add breakdown if requested
    if (queryParams.breakdown) {
        response.breakdown = generateBreakdown(
            startDate, 
            endDate, 
            resource.assignments, 
            resource.capacity, 
            queryParams.breakdown
        );
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching resource workload:', error);
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

/**
 * Generate time-based breakdown (daily/weekly/monthly)
 */
function generateBreakdown(
    startDate: Date, 
    endDate: Date, 
    assignments: any[], 
    dailyCapacity: number, 
    breakdownType: 'daily' | 'weekly' | 'monthly'
) {
    const breakdown = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
        let periodStart = new Date(current);
        let periodEnd = new Date(current);
        
        // Set period end based on breakdown type
        switch (breakdownType) {
            case 'daily':
                // Period is just this day
                break;
            case 'weekly':
                // Find start of week (Monday)
                const dayOfWeek = current.getDay();
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                periodStart = new Date(current);
                periodStart.setDate(current.getDate() - daysToMonday);
                periodEnd = new Date(periodStart);
                periodEnd.setDate(periodStart.getDate() + 6);
                break;
            case 'monthly':
                periodStart = new Date(current.getFullYear(), current.getMonth(), 1);
                periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                break;
        }
        
        // Ensure period doesn't exceed our query range
        if (periodStart < startDate) periodStart = new Date(startDate);
        if (periodEnd > endDate) periodEnd = new Date(endDate);
        
        // Calculate capacity and utilization for this period
        const workingDays = calculateWorkingDays(periodStart, periodEnd);
        const capacityHours = dailyCapacity * workingDays;
        
        let plannedHours = 0;
        let actualHours = 0;
        
        // Calculate hours from assignments that overlap with this period
        assignments.forEach(assignment => {
            const assignmentStart = new Date(assignment.start_date);
            const assignmentEnd = new Date(assignment.end_date);
            
            const overlapStart = new Date(Math.max(assignmentStart.getTime(), periodStart.getTime()));
            const overlapEnd = new Date(Math.min(assignmentEnd.getTime(), periodEnd.getTime()));
            
            if (overlapStart <= overlapEnd) {
                const overlapDays = calculateWorkingDays(overlapStart, overlapEnd);
                const assignmentDays = calculateWorkingDays(assignmentStart, assignmentEnd);
                const overlapRatio = assignmentDays > 0 ? overlapDays / assignmentDays : 0;
                const pct = Math.min(100, Math.max(0, assignment.allocation_percentage ?? 0)) / 100;
                plannedHours += pct * dailyCapacity * overlapDays;
                actualHours += assignment.actual_hours * overlapRatio;
            }
        });
        
        breakdown.push({
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            capacity_hours: capacityHours,
            planned_hours: Math.round(plannedHours * 100) / 100,
            actual_hours: Math.round(actualHours * 100) / 100,
            planned_utilization_rate: capacityHours > 0 ? Math.round((plannedHours / capacityHours) * 10000) / 100 : 0,
            actual_utilization_rate: capacityHours > 0 ? Math.round((actualHours / capacityHours) * 10000) / 100 : 0
        });
        
        // Move to next period
        switch (breakdownType) {
            case 'daily':
                current.setDate(current.getDate() + 1);
                break;
            case 'weekly':
                current.setDate(current.getDate() + 7);
                break;
            case 'monthly':
                current.setMonth(current.getMonth() + 1);
                current.setDate(1);
                break;
        }
    }
    
    return breakdown;
} 