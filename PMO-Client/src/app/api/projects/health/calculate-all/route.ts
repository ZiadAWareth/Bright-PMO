import { NextRequest, NextResponse } from 'next/server';
import { calculateAllProjectHealthScores } from '@/lib/services/project-health-calculator';

/**
 * Calculate health scores for all active projects
 * POST /api/projects/health/calculate-all
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🏥 Starting bulk health score calculation for all projects');

    await calculateAllProjectHealthScores();

    return NextResponse.json({
      success: true,
      message: 'Health scores calculated successfully for all active projects'
    });

  } catch (error) {
    console.error('❌ Bulk health score calculation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate health scores for all projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
