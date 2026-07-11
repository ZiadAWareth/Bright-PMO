import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Portfolio, Project, Account } from '@prisma/client';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { ActivityLogger } from '@/lib/activity-logger';

/**
 * @swagger
 * /api/portfolios:
 *   get:
 *     summary: Get all portfolios
 *     description: Retrieves a list of all portfolios
 *     tags:
 *       - Portfolios
 *     responses:
 *       200:
 *         description: List of portfolios retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   portfolio_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   manager_id:
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

interface PortfolioWithRelations extends Portfolio {
  manager: Account;
  projects: {
    project_id: number;
    budget_amount: number;
    actual_cost: number;
    progress_percentage: number;
    status: string;
  }[];
}

export async function GET() {
  try {
    const portfolios = await prisma.portfolio.findMany({
      include: {
        manager: true,
        projects: {
          select: {
            project_id: true,
            name: true,
            budget_amount: true,
            actual_cost: true,
            progress_percentage: true,
            status: true
          }
        }
      }
    }) as PortfolioWithRelations[];

    // Calculate additional metrics for each portfolio
    const portfoliosWithMetrics = portfolios.map(portfolio => {
      const totalBudgetFromProjects = portfolio.projects.reduce((sum: number, project) => sum + project.budget_amount, 0);
      // Use budget_capacity if set, otherwise use sum of project budgets
      const totalBudget = portfolio.budget_capacity && portfolio.budget_capacity > 0 
        ? portfolio.budget_capacity 
        : totalBudgetFromProjects;
      const totalActualCost = portfolio.projects.reduce((sum: number, project) => sum + project.actual_cost, 0);
      const avgProgress = portfolio.projects.length > 0 
        ? portfolio.projects.reduce((sum: number, project) => sum + project.progress_percentage, 0) / portfolio.projects.length 
        : 0;

      return {
        ...portfolio,
        total_budget: totalBudget,
        total_actual_cost: totalActualCost,
        avg_progress: avgProgress,
        project_count: portfolio.projects.length
      };
    });

    return NextResponse.json(portfoliosWithMetrics);
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return NextResponse.json(
      { error: "Failed to fetch portfolios: " + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/portfolios:
 *   post:
 *     summary: Create a new portfolio
 *     description: Creates a new portfolio with the provided details
 *     tags:
 *       - Portfolios
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - manager_id
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the portfolio
 *               description:
 *                 type: string
 *                 description: Description of the portfolio
 *               manager_id:
 *                 type: integer
 *                 description: ID of the portfolio manager
 *     responses:
 *       201:
 *         description: Portfolio created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 portfolio_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 manager_id:
 *                   type: integer
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
    try {
        const {userId, role} = await getUserFromHeaders();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // if (role != "PJM") {
        //     return NextResponse.json({ error: "Only PJM roles can create portfolios" }, { status: 403 });
        // }
        const data = await request.json();
        // Validate required fields
        const requiredFields = ['name', 'description', 'strategic_objective', 'priority'];
        const missingFields = requiredFields.filter(field => !data[field]);
        if (missingFields.length > 0) {
            return NextResponse.json({ error: `Missing required fields: ${missingFields.join(', ')}` }, { status: 400 });
        }
        // Include the user's ID as manager_id
        const portfolioData = {
            ...data,
            status: 'active', // Default status
            manager_id: userId,
            budget_capacity: data.budget_capacity ? parseFloat(data.budget_capacity) : 0,
        };
        const newPortfolio = await prisma.portfolio.create({
            data: portfolioData,
            include: {
                manager: true,
                projects: {
                    select: {
                        project_id: true,
                        budget_amount: true,
                        actual_cost: true,
                        progress_percentage: true,
                        status: true
                    }
                }
            }
        }) as PortfolioWithRelations;

        // Log activity for portfolio creation
        await ActivityLogger.log({
            user_id: userId,
            action: 'create',
            entity_type: 'portfolio',
            entity_id: newPortfolio.portfolio_id,
            title: `Created portfolio "${newPortfolio.name}"`,
            description: `Created new portfolio: ${newPortfolio.name}`,
            metadata: {
                entity_name: newPortfolio.name,
                additional_info: {
                    manager_id: newPortfolio.manager_id,
                    strategic_objective: newPortfolio.strategic_objective,
                    priority: newPortfolio.priority,
                    status: newPortfolio.status
                }
            }
        });

        return NextResponse.json(newPortfolio, { status: 201 });
    } catch (error) {
        console.error('Error creating portfolio:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


