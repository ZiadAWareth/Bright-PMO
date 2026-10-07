import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

/**
 * Admin endpoint to detect and fix invalid task dependencies
 * - Removes self-dependencies (where predecessor_task_id === successor_task_id)
 * - Reports on any other dependency issues
 */
export async function POST(req: Request) {
  try {
    const { userId, role } = await getUserFromHeaders();
    
    // Only allow admins to use this endpoint
    if (role !== 'admin' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Find all self-dependencies
    const selfDependencies = await prisma.taskDependency.findMany({
      where: {
        predecessor_task_id: {
          equals: prisma.taskDependency.fields.successor_task_id
        }
      },
      include: {
        predecessor: {
          select: {
            task_id: true,
            name: true
          }
        },
        successor: {
          select: {
            task_id: true,
            name: true
          }
        }
      }
    });

    // Manual check for self-dependencies (Prisma doesn't support comparing fields directly)
    const allDependencies = await prisma.taskDependency.findMany({
      include: {
        predecessor: {
          select: {
            task_id: true,
            name: true
          }
        },
        successor: {
          select: {
            task_id: true,
            name: true
          }
        }
      }
    });

    const actualSelfDependencies = allDependencies.filter(
      dep => dep.predecessor_task_id === dep.successor_task_id
    );

    const results = {
      selfDependenciesFound: actualSelfDependencies.length,
      selfDependenciesFixed: 0,
      details: [] as any[]
    };

    // Delete self-dependencies
    if (actualSelfDependencies.length > 0) {
      for (const dep of actualSelfDependencies) {
        await prisma.taskDependency.delete({
          where: {
            dependency_id: dep.dependency_id
          }
        });

        results.selfDependenciesFixed++;
        results.details.push({
          dependency_id: dep.dependency_id,
          task_id: dep.predecessor_task_id,
          task_name: dep.predecessor.name,
          issue: 'Self-dependency (task depends on itself)',
          action: 'Deleted'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${results.selfDependenciesFixed} invalid dependencies`,
      results
    });

  } catch (error) {
    console.error('Error fixing dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to fix dependencies: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to detect issues without fixing them
 */
export async function GET(req: Request) {
  try {
    const { userId, role } = await getUserFromHeaders();
    
    // Only allow admins to use this endpoint
    if (role !== 'admin' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Get all dependencies
    const allDependencies = await prisma.taskDependency.findMany({
      include: {
        predecessor: {
          select: {
            task_id: true,
            name: true
          }
        },
        successor: {
          select: {
            task_id: true,
            name: true
          }
        }
      }
    });

    // Check for self-dependencies
    const selfDependencies = allDependencies.filter(
      dep => dep.predecessor_task_id === dep.successor_task_id
    );

    // Check for circular dependencies (basic check)
    const circularIssues = [];
    for (const dep of allDependencies) {
      const reverse = allDependencies.find(
        d => d.predecessor_task_id === dep.successor_task_id && 
             d.successor_task_id === dep.predecessor_task_id
      );
      if (reverse) {
        circularIssues.push({
          task1_id: dep.predecessor_task_id,
          task1_name: dep.predecessor.name,
          task2_id: dep.successor_task_id,
          task2_name: dep.successor.name,
          issue: 'Circular dependency (tasks depend on each other)'
        });
      }
    }

    return NextResponse.json({
      totalDependencies: allDependencies.length,
      issues: {
        selfDependencies: selfDependencies.map(dep => ({
          dependency_id: dep.dependency_id,
          task_id: dep.predecessor_task_id,
          task_name: dep.predecessor.name,
          type: dep.dependency_type
        })),
        circularDependencies: circularIssues
      }
    });

  } catch (error) {
    console.error('Error checking dependencies:', error);
    return NextResponse.json(
      { error: 'Failed to check dependencies: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
