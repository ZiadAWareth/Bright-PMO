import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WorkflowTriggerType, WorkflowActionType } from '@prisma/client';

/**
 * @swagger
 * /api/workflowRule:
 *   get:
 *     summary: Get all workflow rules
 *     description: Retrieves a list of all workflow rules with their associated tasks
 *     tags:
 *       - Workflow Rules
 *     responses:
 *       200:
 *         description: List of workflow rules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   rule_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   trigger_type:
 *                     type: string
 *                     enum: [TASK_COMPLETED, TASK_STARTED, TASK_ON_HOLD, DEPENDENCY_COMPLETED]
 *                     description: Type of trigger that activates the workflow rule
 *                   trigger_task_id:
 *                     type: integer
 *                     description: ID of the task that triggers the rule
 *                   action_type:
 *                     type: string
 *                     enum: [START_TASK, SEND_NOTIFICATION, UPDATE_TASK_STATUS, ASSIGN_RESOURCE, CREATE_RECURRING_TASK, ESCALATE_TASK, UPDATE_PROJECT_STATUS]
 *                     description: Type of action to perform when the rule is triggered
 *                   action_target_id:
 *                     type: integer
 *                     description: ID of the task or resource that the action targets
 *                   is_active:
 *                     type: boolean
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                   trigger_task:
 *                     type: object
 *                   action_task:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const rules = await prisma.workflowRule.findMany({
      include: {
        trigger_task: true,
        action_task: true,
      },
    });
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch workflow rules: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/workflowRule:
 *   post:
 *     summary: Create a new workflow rule
 *     description: Creates a new workflow rule with the specified trigger and action
 *     tags:
 *       - Workflow Rules
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - trigger_type
 *               - trigger_task_id
 *               - action_type
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the workflow rule
 *               description:
 *                 type: string
 *                 description: Description of the workflow rule
 *               trigger_type:
 *                 type: string
 *                 enum: [TASK_COMPLETED, TASK_STARTED, TASK_ON_HOLD, DEPENDENCY_COMPLETED]
 *                 description: Type of trigger that activates the workflow rule
 *               trigger_task_id:
 *                 type: integer
 *                 description: ID of the task that triggers the rule
 *               action_type:
 *                 type: string
 *                 enum: [START_TASK, SEND_NOTIFICATION, UPDATE_TASK_STATUS, ASSIGN_RESOURCE, CREATE_RECURRING_TASK, ESCALATE_TASK, UPDATE_PROJECT_STATUS]
 *                 description: Type of action to perform when the rule is triggered
 *               action_target_id:
 *                 type: integer
 *                 description: ID of the task or resource that the action targets
 *     responses:
 *       201:
 *         description: Workflow rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rule_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       400:
 *         description: Missing required fields or invalid input
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, trigger_type, trigger_task_id, action_type, action_target_id } = body;

    // Validate required fields
    if (!name || !trigger_type || !trigger_task_id || !action_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, trigger_type, trigger_task_id, and action_type are required' },
        { status: 400 }
      );
    }

    // Validate enum values
    if (!Object.values(WorkflowTriggerType).includes(trigger_type)) {
      return NextResponse.json(
        { error: 'Invalid trigger type' },
        { status: 400 }
      );
    }

    if (!Object.values(WorkflowActionType).includes(action_type)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    const rule = await prisma.workflowRule.create({
      data: {
        name,
        description,
        trigger_type,
        trigger_task_id,
        action_type,
        action_target_id,
      },
      include: {
        trigger_task: true,
        action_task: true,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create workflow rule: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 