import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WorkflowTriggerType, WorkflowActionType } from '@prisma/client';

/**
 * @swagger
 * /api/workflowRule/{workflowRule_id}:
 *   get:
 *     summary: Get a workflow rule by ID
 *     description: Retrieves a specific workflow rule by its ID with associated tasks
 *     tags:
 *       - Workflow Rules
 *     parameters:
 *       - in: path
 *         name: workflowRule_id
 *         required: true
 *         description: ID of the workflow rule to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workflow rule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rule_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 trigger_type:
 *                   type: string
 *                   enum: [TASK_COMPLETED, TASK_STARTED, TASK_ON_HOLD, DEPENDENCY_COMPLETED]
 *                   description: Type of trigger that activates the workflow rule
 *                 trigger_task_id:
 *                   type: integer
 *                   description: ID of the task that triggers the rule
 *                 action_type:
 *                   type: string
 *                   enum: [START_TASK, SEND_NOTIFICATION, UPDATE_TASK_STATUS, ASSIGN_RESOURCE, CREATE_RECURRING_TASK, ESCALATE_TASK, UPDATE_PROJECT_STATUS]
 *                   description: Type of action to perform when the rule is triggered
 *                 action_target_id:
 *                   type: integer
 *                   description: ID of the task or resource that the action targets
 *                 is_active:
 *                   type: boolean
 *                   description: Whether the rule is currently active
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 trigger_task:
 *                   type: object
 *                   description: The task that triggers this rule
 *                 action_task:
 *                   type: object
 *                   description: The task that is affected by this rule
 *       404:
 *         description: Workflow rule not found
 *       500:
 *         description: Server error
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ workflowRule_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { workflowRule_id } = resolvedParams;
    const rule = await prisma.workflowRule.findUnique({
      where: { rule_id: parseInt(workflowRule_id) },
      include: {
        trigger_task: true,
        action_task: true,
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: 'Workflow rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch workflow rule: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/workflowRule/{workflowRule_id}:
 *   put:
 *     summary: Update a workflow rule
 *     description: Updates an existing workflow rule with new values
 *     tags:
 *       - Workflow Rules
 *     parameters:
 *       - in: path
 *         name: workflowRule_id
 *         required: true
 *         description: ID of the workflow rule to update
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
 *               is_active:
 *                 type: boolean
 *                 description: Whether the rule should be active
 *     responses:
 *       200:
 *         description: Workflow rule updated successfully
 *       404:
 *         description: Workflow rule not found
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ workflowRule_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { workflowRule_id } = resolvedParams;
    const body = await request.json();
    const { name, description, trigger_type, trigger_task_id, action_type, action_target_id, is_active } = body;

    // Validate enum values if provided
    if (trigger_type && !Object.values(WorkflowTriggerType).includes(trigger_type)) {
      return NextResponse.json(
        { error: 'Invalid trigger type' },
        { status: 400 }
      );
    }

    if (action_type && !Object.values(WorkflowActionType).includes(action_type)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    const rule = await prisma.workflowRule.update({
      where: { rule_id: parseInt(workflowRule_id) },
      data: {
        name,
        description,
        trigger_type,
        trigger_task_id,
        action_type,
        action_target_id,
        is_active,
      },
      include: {
        trigger_task: true,
        action_task: true,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Workflow rule not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update workflow rule: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/workflowRule/{workflowRule_id}:
 *   delete:
 *     summary: Delete a workflow rule
 *     description: Deletes a workflow rule by ID
 *     tags:
 *       - Workflow Rules
 *     parameters:
 *       - in: path
 *         name: workflowRule_id
 *         required: true
 *         description: ID of the workflow rule to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workflow rule deleted successfully
 *       404:
 *         description: Workflow rule not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ workflowRule_id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { workflowRule_id } = resolvedParams;
    await prisma.workflowRule.delete({
      where: { rule_id: parseInt(workflowRule_id) },
    });

    return NextResponse.json(
      { message: 'Workflow rule deleted successfully' }
    );
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Workflow rule not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete workflow rule: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 