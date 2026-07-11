import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { dataSources, reportType, filters } = await request.json();
    
    console.log('API route called with:', { dataSources, reportType, filters });

    let data: any = {};

    // Fetch data based on data sources
    for (const source of dataSources) {
      console.log(`Fetching data for source: ${source}`);
      
      switch (source.toLowerCase()) {
        case 'projects':
          // Apply filters if provided
          const projectWhere: any = {};
          if (filters?.projectStatus) {
            projectWhere.status = filters.projectStatus;
          }
          
          console.log('Fetching projects with where clause:', projectWhere);
          
          data.projects = await prisma.project.findMany({
            where: projectWhere,
            include: {
              portfolio: true,
              eps: true,
              wbs: {
                include: {
                  wbsItems: true
                }
              }
            }
          });
          
          console.log(`Found ${data.projects?.length || 0} projects`);
          break;

        case 'portfolios':
          data.portfolios = await prisma.portfolio.findMany({
            include: {
              projects: {
                include: {
                  eps: true
                }
              }
            }
          });
          console.log(`Found ${data.portfolios?.length || 0} portfolios`);
          break;

        case 'resources':
          data.resources = await prisma.resource.findMany({
            include: {
              assignments: {
                include: {
                  task: true
                }
              }
            }
          });
          console.log(`Found ${data.resources?.length || 0} resources`);
          break;

        case 'tasks':
          data.tasks = await prisma.task.findMany({
            include: {
              wbs: {
                include: {
                  project: true
                }
              },
              resourceAssignments: {
                include: {
                  resource: true
                }
              }
            }
          });
          console.log(`Found ${data.tasks?.length || 0} tasks`);
          break;

        case 'budgets':
          data.budgets = await prisma.budget.findMany({
            include: {
              project: true
            }
          });
          console.log(`Found ${data.budgets?.length || 0} budgets`);
          break;

        case 'risks':
          data.risks = await prisma.risk.findMany({
            include: {
              project: true,
              mitigations: true
            }
          });
          console.log(`Found ${data.risks?.length || 0} risks`);
          break;

        case 'procurements':
          data.procurements = await prisma.procurement.findMany({
            include: {
              project: true
            }
          });
          console.log(`Found ${data.procurements?.length || 0} procurements`);
          break;

        case 'equipment':
          data.equipment = await prisma.resource.findMany({
            where: {
              type: 'equipment'
            },
            include: {
              equipment_logs: {
                include: {
                  site: true
                }
              },
              MaintenanceSchedule: true,
              MaintenanceLog: true
            }
          });
          console.log(`Found ${data.equipment?.length || 0} equipment`);
          break;

        case 'maintenance':
          data.maintenance = await prisma.maintenanceLog.findMany({
            include: {
              resource: true,
              schedule: true
            }
          });
          console.log(`Found ${data.maintenance?.length || 0} maintenance logs`);
          break;

        case 'sites':
          data.sites = await prisma.site.findMany({
            include: {
              project: true,
              equipment_logs: {
                include: {
                  resource: true
                }
              }
            }
          });
          console.log(`Found ${data.sites?.length || 0} sites`);
          break;

        case 'users':
          data.users = await prisma.user.findMany({
            include: {
              account: true,
              role: true
            }
          });
          console.log(`Found ${data.users?.length || 0} users`);
          break;

        case 'transactions':
          data.transactions = await prisma.transaction.findMany({
            include: {
              project: true
            }
          });
          console.log(`Found ${data.transactions?.length || 0} transactions`);
          break;

        case 'evms':
          data.evms = await prisma.eVM.findMany({
            include: {
              project: true
            }
          });
          console.log(`Found ${data.evms?.length || 0} EVMs`);
          break;

        case 'lessons':
          data.lessons = await prisma.lesson.findMany({
            include: {
              project: true
            }
          });
          console.log(`Found ${data.lessons?.length || 0} lessons`);
          break;

        case 'documents':
          data.documents = await prisma.document.findMany({
            include: {
              project: true
            }
          });
          console.log(`Found ${data.documents?.length || 0} documents`);
          break;

        default:
          console.warn(`Unknown data source: ${source}`);
      }
    }

    console.log('Raw data before processing:', data);

    // Process data based on report type
    let processedData: any = data;
    
    switch (reportType) {
      case 'project':
        processedData = data.projects?.map((project: any) => ({
          id: project.project_id,
          code: project.project_code,
          name: project.name,
          status: project.status,
          progress: project.progress_percentage,
          budget: project.budget_amount,
          actualCost: project.actual_cost,
          startDate: project.start_date,
          endDate: project.planned_end_date,
          portfolio: project.portfolio?.name,
          wbsCount: project.wbs.length,
          wbsItemsCount: project.wbs.reduce((acc: number, wbs: any) => acc + wbs.wbsItems.length, 0)
        })) || [];
        break;

      case 'resource':
        processedData = data.resources?.map((resource: any) => ({
          id: resource.resource_id,
          name: resource.name,
          type: resource.type,
          role: resource.role,
          rate: resource.rate,
          capacity: resource.capacity,
          availability: resource.availability_status,
          assignments: resource.assignments.map((assignment: any) => ({
            taskName: assignment.task.name,
            projectName: assignment.task.wbs.project.name,
            allocation: assignment.allocation_percentage,
            plannedHours: assignment.planned_hours,
            actualHours: assignment.actual_hours,
            startDate: assignment.start_date,
            endDate: assignment.end_date
          })),
          totalAllocation: resource.assignments.reduce((acc: number, assignment: any) => acc + assignment.allocation_percentage, 0),
          totalPlannedHours: resource.assignments.reduce((acc: number, assignment: any) => acc + assignment.planned_hours, 0),
          totalActualHours: resource.assignments.reduce((acc: number, assignment: any) => acc + assignment.actual_hours, 0)
        })) || [];
        break;

      case 'financial':
        const budgets = data.budgets || [];
        const transactions = data.transactions || [];
        processedData = {
          budgets: budgets.map((budget: any) => ({
            id: budget.budget_id,
            projectName: budget.project.name,
            category: budget.cost_type,
            plannedAmount: budget.planned_amount,
            actualAmount: budget.actual_amount,
            variance: budget.actual_amount - budget.planned_amount,
            variancePercentage: ((budget.actual_amount - budget.planned_amount) / budget.planned_amount) * 100
          })),
          transactions: transactions.map((transaction: any) => ({
            id: transaction.id,
            projectName: transaction.project.name,
            type: transaction.category,
            amount: transaction.amount,
            date: transaction.date,
            description: transaction.description
          })),
          summary: {
            totalPlanned: budgets.reduce((acc: number, budget: any) => acc + budget.planned_amount, 0),
            totalActual: budgets.reduce((acc: number, budget: any) => acc + budget.actual_amount, 0),
            totalVariance: budgets.reduce((acc: number, budget: any) => acc + (budget.actual_amount - budget.planned_amount), 0),
            totalTransactions: transactions.length
          }
        };
        break;

      case 'risk':
        processedData = data.risks?.map((risk: any) => ({
          id: risk.risk_id,
          projectName: risk.project.name,
          title: risk.name,
          description: risk.description,
          impact: risk.impact,
          probability: risk.probability,
          status: risk.status,
          mitigationCount: risk.mitigations.length,
          mitigations: risk.mitigations.map((mitigation: any) => ({
            id: mitigation.mitigation_id,
            strategy: mitigation.description,
            status: mitigation.status,
            cost: 0
          }))
        })) || [];
        break;

      case 'document':
        processedData = data.documents?.map((document: any) => ({
          id: document.document_id,
          name: document.name,
          type: document.type,
          version: document.version,
          status: document.status,
          uploadDate: document.upload_date,
          lastModified: document.last_modified,
          fileSize: document.file_size,
          projectId: document.project?.project_id,
          projectName: document.project?.name
        })) || [];
        break;

      default:
        // Use raw data for other categories
        break;
    }

    console.log('Processed data:', processedData);

    return NextResponse.json({ success: true, data: processedData });
  } catch (error) {
    console.error('Error fetching report data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
} 