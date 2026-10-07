import { NextRequest, NextResponse } from 'next/server';
import { calculateAndUpdateProjectHealth } from '@/lib/services/project-health-calculator';

/**
 * Calculate and update health score for a specific project
 * POST /api/projects/[id]/health
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    console.log(`🏥 Calculating health score for project ${projectId}`);
    const healthResult = await calculateAndUpdateProjectHealth(projectId);

    return NextResponse.json({
      success: true,
      healthScore: healthResult.healthScore,
      healthGrade: healthResult.healthGrade,
      healthStatus: healthResult.healthStatus,
      breakdown: healthResult.breakdown,
      metrics: healthResult.metrics,
      recommendations: healthResult.recommendations,
      riskFlags: healthResult.riskFlags,
      message: `Health score calculated successfully: ${healthResult.healthScore}% (${healthResult.healthGrade})`
    });

  } catch (error) {
    console.error('❌ Health score calculation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate health score',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get current health score and metrics for a project
 * GET /api/projects/[id]/health
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Just calculate without updating (for viewing purposes)
    const { calculateAndUpdateProjectHealth } = await import('@/lib/services/project-health-calculator');
    const healthResult = await calculateAndUpdateProjectHealth(projectId);

    return NextResponse.json({
      success: true,
      healthScore: healthResult.healthScore,
      healthGrade: healthResult.healthGrade,
      healthStatus: healthResult.healthStatus,
      breakdown: healthResult.breakdown,
      metrics: healthResult.metrics,
      recommendations: healthResult.recommendations,
      riskFlags: healthResult.riskFlags,
      lastCalculated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Health score retrieval error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve health score',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
