import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/riskMitigations:
 *   get:
 *     summary: Get all risk mitigations
 *     description: Retrieves a list of all risk mitigations
 *     tags:
 *       - Risk Mitigations
 *     responses:
 *       200:
 *         description: List of risk mitigations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   mitigation_id:
 *                     type: integer
 *                   risk_id:
 *                     type: integer
 *                   description:
 *                     type: string
 *                   action_plan:
 *                     type: string
 *                   start_date:
 *                     type: string
 *                     format: date
 *                   due_date:
 *                     type: string
 *                     format: date
 *                   status:
 *                     type: string
 *                   responsible_id:
 *                     type: integer
 *                   assigned_to:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
    try {
      const mitigations = await prisma.riskMitigation.findMany();
      return NextResponse.json(mitigations);
    } catch (error) {
      console.error("GET error:", error);
      return NextResponse.json({ error: "Failed to fetch risk mitigations" }, { status: 500 });
    }
  }

/**
 * @swagger
 * /api/riskMitigations:
 *   post:
 *     summary: Create a new risk mitigation
 *     description: Creates a new risk mitigation plan for a specific risk
 *     tags:
 *       - Risk Mitigations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - risk_id
 *               - description
 *               - action_plan
 *               - start_date
 *               - due_date
 *               - status
 *               - responsible_id
 *             properties:
 *               risk_id:
 *                 type: integer
 *                 description: ID of the risk this mitigation addresses
 *               description:
 *                 type: string
 *                 description: Description of the mitigation plan
 *               action_plan:
 *                 type: string
 *                 description: Detailed action plan for mitigation
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Start date of the mitigation plan
 *               due_date:
 *                 type: string
 *                 format: date
 *                 description: Due date for mitigation completion
 *               status:
 *                 type: string
 *                 description: Current status of the mitigation
 *               responsible_id:
 *                 type: integer
 *                 description: ID of the user responsible for this mitigation
 *               assigned_to:
 *                 type: integer
 *                 description: ID of the user assigned to this mitigation
 *     responses:
 *       201:
 *         description: Risk mitigation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mitigation_id:
 *                   type: integer
 *                 risk_id:
 *                   type: integer
 *                 description:
 *                   type: string
 *       400:
 *         description: Failed to create risk mitigation
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
      const { userId, role } = await getUserFromHeaders();
      const data = await req.json();
      const newMitigation = await prisma.riskMitigation.create({
        data: {
            user_id: userId,
            risk_id: data.risk_id,
            task_id: data.task_id,
            description: data.description,
            action_plan: data.action_plan,
            start_date: new Date(data.start_date),
            due_date: new Date(data.due_date),
            status: data.status,
            assigned_to: data.assigned_to,
        },
      });
      // Notify risk owner, project manager, and team of new mitigation plan
     const riskInfo = await prisma.risk.findUnique({
       where: { risk_id: data.risk_id },
       select: { name: true, owner_id: true, project_id: true }
     });
     const projectInfo = await prisma.project.findUnique({
       where: { project_id: riskInfo!.project_id },
       select: { manager_id: true, team_members: { select: { user_id: true } } }
     });
     const recipients = Array.from(new Set([
       riskInfo!.owner_id,
       projectInfo!.manager_id,
       ...projectInfo!.team_members.map(tm => tm.user_id)
     ]));
     await Promise.all(recipients.map(uid =>
       prisma.notification.create({
         data: {
           user_id: uid,
           type: 'RISK_ALERT',
           title: 'New Mitigation Plan',
           message: `Mitigation plan created for risk "${riskInfo!.name}"`,
           priority: 'MEDIUM',
           created_by_id: 1,
           metadata: { mitigation_id: newMitigation.mitigation_id, risk_id: data.risk_id, project_id: riskInfo!.project_id }
         }
       })
     ));
      return NextResponse.json(newMitigation, { status: 201 });
    } catch (error) {
      console.error("POST error:", error);
      return NextResponse.json({ error: "Failed to create risk mitigation" }, { status: 400 });
    }
  }
