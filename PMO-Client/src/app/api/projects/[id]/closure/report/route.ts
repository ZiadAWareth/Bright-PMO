import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromHeaders } from "@/lib/auth-helpers";
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

// Generate comprehensive project closure report PDF
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const { userId } = await getUserFromHeaders();

        // Fetch comprehensive project data
        const project = await prisma.project.findUnique({
            where: { project_id: parseInt(projectId) },
            include: {
                creator: {
                    include: {
                        account: true
                    }
                },
                manager: {
                    include: {
                        account: true
                    }
                },
                eps: true,
                portfolio: true,
                team_members: {
                    include: {
                        user: {
                            include: {
                                account: true
                            }
                        }
                    }
                },
                wbs: {
                    include: {
                        tasks: {
                            include: {
                                assigned_users: {
                                    include: {
                                        user: {
                                            include: {
                                                account: true
                                            }
                                        }
                                    }
                                },
                                time_entries: true
                            }
                        },
                        wbsItems: true
                    }
                },
                budgets: true,
                evms: {
                    orderBy: {
                        reporting_date: 'desc'
                    },
                    take: 1
                },
                risks: {
                    include: {
                        owner: {
                            include: {
                                account: true
                            }
                        },
                        mitigations: true
                    }
                },
                final_inspection: {
                    include: {
                        inspector: {
                            include: {
                                account: true
                            }
                        },
                        approver: {
                            include: {
                                account: true
                            }
                        }
                    }
                },
                handover: {
                    include: {
                        handover_user: {
                            include: {
                                account: true
                            }
                        },
                        handover_receipt: true,
                        approver: {
                            include: {
                                account: true
                            }
                        }
                    }
                },
                closure_checklists: {
                    include: {
                        completedBy: {
                            include: {
                                account: true
                            }
                        }
                    }
                },
                punch_list_items: {
                    include: {
                        assignee: {
                            include: {
                                account: true
                            }
                        }
                    }
                },
                closure_documents: {
                    include: {
                        document: true
                    }
                },
                documents: {
                    where: {
                        name: {
                            contains: 'closure'
                        }
                    }
                },
                lessons: {
                    include: {
                        submitter: true
                    }
                },
                closure_approved_user: {
                    include: {
                        account: true
                    }
                }
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Calculate metrics
        const latestEVM = project.evms[0];
        const totalBudget = project.budget_amount;
        const actualCost = project.actual_cost;
        const progress = project.progress_percentage;

        // Calculate health metrics
        const scheduleHealth = latestEVM ? Math.min(100, latestEVM.schedule_performance_index * 100) : progress;
        const budgetHealth = totalBudget > 0 ? Math.min(100, ((totalBudget - actualCost) / totalBudget) * 100) : 100;
        const overallHealth = project.healthScore;

        // Calculate team statistics
        const totalTasks = project.wbs.reduce((sum, wbs) => sum + wbs.tasks.length, 0);
        const completedTasks = project.wbs.reduce((sum, wbs) => 
            sum + wbs.tasks.filter(task => task.status === 'completed').length, 0);
        const totalHours = project.wbs.reduce((sum, wbs) => 
            sum + wbs.tasks.reduce((taskSum, task) => 
                taskSum + task.time_entries.reduce((entrySum, entry) => entrySum + entry.hours_spent, 0), 0), 0);

        // Generate HTML content for the PDF
        const htmlContent = generateReportHTML(project, {
            latestEVM,
            totalBudget,
            actualCost,
            progress,
            scheduleHealth,
            budgetHealth,
            overallHealth,
            totalTasks,
            completedTasks,
            totalHours
        });

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        await browser.close();

        // Return PDF as response
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Project_Closure_Report_${project.project_code}_${new Date().toISOString().split('T')[0]}.pdf"`
            }
        });

    } catch (error) {
        console.error("Error generating closure report:", error);
        return NextResponse.json(
            { error: "Failed to generate closure report" },
            { status: 500 }
        );
    }
}

function generateReportHTML(project: any, metrics: any) {
    const currentDate = new Date().toLocaleDateString();
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Project Closure Report - ${project.name}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                margin-bottom: 30px;
            }
            
            .header h1 {
                font-size: 28px;
                margin-bottom: 10px;
            }
            
            .header .subtitle {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            .section {
                margin-bottom: 40px;
                padding: 20px;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                background: #fafafa;
            }
            
            .section h2 {
                color: #667eea;
                border-bottom: 2px solid #667eea;
                padding-bottom: 10px;
                margin-bottom: 20px;
                font-size: 20px;
            }
            
            .section h3 {
                color: #764ba2;
                margin-bottom: 15px;
                font-size: 16px;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .info-item {
                background: white;
                padding: 15px;
                border-radius: 6px;
                border-left: 4px solid #667eea;
            }
            
            .info-item .label {
                font-weight: bold;
                color: #666;
                font-size: 12px;
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            
            .info-item .value {
                font-size: 16px;
                color: #333;
            }
            
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .metric-card {
                background: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .metric-value {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .metric-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
            }
            
            .status-good { color: #27ae60; }
            .status-warning { color: #f39c12; }
            .status-danger { color: #e74c3c; }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                background: white;
            }
            
            th, td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            
            th {
                background: #667eea;
                color: white;
                font-weight: bold;
            }
            
            tr:nth-child(even) {
                background: #f9f9f9;
            }
            
            .progress-bar {
                width: 100%;
                height: 20px;
                background: #e0e0e0;
                border-radius: 10px;
                overflow: hidden;
                margin-top: 5px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #27ae60, #2ecc71);
                transition: width 0.3s ease;
            }
            
            .team-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
            }
            
            .team-card {
                background: white;
                padding: 15px;
                border-radius: 6px;
                border-left: 4px solid #764ba2;
            }
            
            .footer {
                text-align: center;
                padding: 30px;
                background: #f8f9fa;
                color: #666;
                margin-top: 40px;
                border-top: 1px solid #e0e0e0;
            }
            
            .signature-section {
                margin-top: 40px;
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 40px;
            }
            
            .signature-box {
                text-align: center;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 6px;
            }
            
            .signature-line {
                border-top: 1px solid #333;
                margin: 40px auto 10px;
                width: 200px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Project Closure Report</h1>
            <div class="subtitle">
                ${project.name} (${project.project_code})<br>
                Generated on ${currentDate}
            </div>
        </div>

        <div class="container">
            <!-- Project Overview -->
            <div class="section">
                <h2>🏗️ Project Overview</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Project Name</div>
                        <div class="value">${project.name}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Project Code</div>
                        <div class="value">${project.project_code}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Project Type</div>
                        <div class="value">${project.type.replace('_', ' ').toUpperCase()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Status</div>
                        <div class="value status-good">${project.status.toUpperCase()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Start Date</div>
                        <div class="value">${new Date(project.start_date).toLocaleDateString()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">End Date</div>
                        <div class="value">${project.actual_end_date ? new Date(project.actual_end_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Project Manager</div>
                        <div class="value">${project.manager.account.first_name} ${project.manager.account.last_name}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Client</div>
                        <div class="value">${project.client || 'N/A'}</div>
                    </div>
                </div>
                <div class="info-item">
                    <div class="label">Description</div>
                    <div class="value">${project.description || 'No description provided'}</div>
                </div>
            </div>

            <!-- Performance Metrics -->
            <div class="section">
                <h2>📊 Performance Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value ${metrics.latestEVM?.cost_performance_index >= 1 ? 'status-good' : 'status-warning'}">
                            ${metrics.latestEVM?.cost_performance_index?.toFixed(2) || 'N/A'}
                        </div>
                        <div class="metric-label">Cost Performance Index (CPI)</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value ${metrics.latestEVM?.schedule_performance_index >= 1 ? 'status-good' : 'status-warning'}">
                            ${metrics.latestEVM?.schedule_performance_index?.toFixed(2) || 'N/A'}
                        </div>
                        <div class="metric-label">Schedule Performance Index (SPI)</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value ${metrics.overallHealth >= 70 ? 'status-good' : metrics.overallHealth >= 50 ? 'status-warning' : 'status-danger'}">
                            ${metrics.overallHealth.toFixed(0)}%
                        </div>
                        <div class="metric-label">Overall Health Index</div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Planned Value (PV)</div>
                        <div class="value">OMR ${metrics.latestEVM?.planned_value?.toLocaleString() || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Earned Value (EV)</div>
                        <div class="value">OMR ${metrics.latestEVM?.earned_value?.toLocaleString() || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Actual Cost (AC)</div>
                        <div class="value">OMR ${metrics.actualCost.toLocaleString()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Budget at Completion</div>
                        <div class="value">OMR ${metrics.totalBudget.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <!-- Progress Summary -->
            <div class="section">
                <h2>📈 Progress Summary</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Overall Progress</div>
                        <div class="value">${metrics.progress.toFixed(1)}%</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${metrics.progress}%"></div>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="label">Tasks Completed</div>
                        <div class="value">${metrics.completedTasks} / ${metrics.totalTasks}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(metrics.completedTasks / metrics.totalTasks) * 100}%"></div>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="label">Total Hours Logged</div>
                        <div class="value">${metrics.totalHours.toFixed(1)} hours</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Team Size</div>
                        <div class="value">${project.team_members.length} members</div>
                    </div>
                </div>
            </div>

            <!-- WBS Summary -->
            <div class="section">
                <h2>📋 Work Breakdown Structure Summary</h2>
                <table>
                    <thead>
                        <tr>
                            <th>WBS Code</th>
                            <th>Name</th>
                            <th>Progress</th>
                            <th>Tasks</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${project.wbs.map((wbs: any) => `
                        <tr>
                            <td>${wbs.wbs_code}</td>
                            <td>${wbs.name}</td>
                            <td>${wbs.progress_percentage.toFixed(1)}%</td>
                            <td>${wbs.tasks.length}</td>
                            <td><span class="status-${wbs.progress_percentage === 100 ? 'good' : 'warning'}">${wbs.status.replace('_', ' ').toUpperCase()}</span></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Team Information -->
            <div class="section">
                <h2>👥 Project Team</h2>
                <div class="team-grid">
                    ${project.team_members.map((member: any) => `
                    <div class="team-card">
                        <strong>${member.user.account.first_name} ${member.user.account.last_name}</strong><br>
                        <small>${member.role} • ${member.department}</small><br>
                        ${member.is_lead ? '<span style="color: #667eea;">Team Lead</span>' : ''}
                    </div>
                    `).join('')}
                </div>
            </div>

            <!-- Risk Summary -->
            <div class="section">
                <h2>⚠️ Risk Summary</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Total Risks Identified</div>
                        <div class="value">${project.risks.length}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Risks Closed</div>
                        <div class="value">${project.risks.filter((r: any) => r.status === 'closed').length}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">High Priority Risks</div>
                        <div class="value">${project.risks.filter((r: any) => r.impact === 'high').length}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Risk Score</div>
                        <div class="value">${project.riskScore.toFixed(1)}</div>
                    </div>
                </div>
            </div>

            <!-- Final Inspection -->
            ${project.final_inspection ? `
            <div class="section">
                <h2>🔍 Final Inspection</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Inspector</div>
                        <div class="value">${project.final_inspection.inspector?.account?.first_name || 'N/A'} ${project.final_inspection.inspector?.account?.last_name || ''}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Inspection Date</div>
                        <div class="value">${new Date(project.final_inspection.scheduled_date).toLocaleDateString()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Status</div>
                        <div class="value status-${project.final_inspection.approved ? 'good' : 'warning'}">${project.final_inspection.approved ? 'APPROVED' : project.final_inspection.status.toUpperCase()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Approved By</div>
                        <div class="value">${project.final_inspection.approver?.account?.first_name || 'Pending'} ${project.final_inspection.approver?.account?.last_name || ''}</div>
                    </div>
                </div>
                ${project.final_inspection.notes ? `
                <div class="info-item">
                    <div class="label">Inspection Notes</div>
                    <div class="value">${project.final_inspection.notes}</div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Handover Details -->
            ${project.handover ? `
            <div class="section">
                <h2>🤝 Project Handover</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Handover Date</div>
                        <div class="value">${new Date(project.handover.handover_date).toLocaleDateString()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Handover Time</div>
                        <div class="value">${project.handover.handover_time}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Handed Over By</div>
                        <div class="value">${project.handover.handover_user?.account?.first_name} ${project.handover.handover_user?.account?.last_name}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Handed Over To</div>
                        <div class="value">${project.handover.handed_over_to || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Status</div>
                        <div class="value status-${project.handover.approved_at ? 'good' : 'warning'}">${project.handover.approved_at ? 'APPROVED' : project.handover.status.toUpperCase()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Receipt Document</div>
                        <div class="value">${project.handover.handover_receipt ? 'Available' : 'Not Uploaded'}</div>
                    </div>
                </div>
                ${project.handover.notes ? `
                <div class="info-item">
                    <div class="label">Handover Notes</div>
                    <div class="value">${project.handover.notes}</div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Closure Checklist -->
            <div class="section">
                <h2>✅ Closure Checklist Status</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Completed By</th>
                            <th>Completed Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${project.closure_checklists.map((item: any) => `
                        <tr>
                            <td>${item.title}</td>
                            <td>${item.type.replace('_', ' ').toUpperCase()}</td>
                            <td><span class="status-${item.status === 'complete' ? 'good' : 'warning'}">${item.status.toUpperCase()}</span></td>
                            <td>${item.completedBy?.account?.first_name || 'N/A'} ${item.completedBy?.account?.last_name || ''}</td>
                            <td>${item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Punch List Summary -->
            ${project.punch_list_items.length > 0 ? `
            <div class="section">
                <h2>🔧 Punch List Summary</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Total Items</div>
                        <div class="value">${project.punch_list_items.length}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Resolved Items</div>
                        <div class="value">${project.punch_list_items.filter((item: any) => item.status === 'resolved').length}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Open Items</div>
                        <div class="value">${project.punch_list_items.filter((item: any) => item.status === 'open').length}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">In Progress</div>
                        <div class="value">${project.punch_list_items.filter((item: any) => item.status === 'in_progress').length}</div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Lessons Learned -->
            ${project.lessons.length > 0 ? `
            <div class="section">
                <h2>📚 Lessons Learned</h2>
                ${project.lessons.map((lesson: any) => `
                <div class="info-item" style="margin-bottom: 15px;">
                    <div class="label">${lesson.title} (${lesson.category})</div>
                    <div class="value">${lesson.description}</div>
                    <small>Recommendations: ${lesson.recommendations}</small>
                </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- Closure Approval -->
            <div class="section">
                <h2>✍️ Project Closure Approval</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Closure Status</div>
                        <div class="value status-${project.closure_approved_at ? 'good' : 'warning'}">${project.closure_approved_at ? 'OFFICIALLY CLOSED' : 'PENDING CLOSURE'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Approved By</div>
                        <div class="value">${project.closure_approved_user?.account?.first_name || 'Pending'} ${project.closure_approved_user?.account?.last_name || ''}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Closure Date</div>
                        <div class="value">${project.closure_approved_at ? new Date(project.closure_approved_at).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Final Status</div>
                        <div class="value status-good">${project.status.toUpperCase()}</div>
                    </div>
                </div>
                ${project.closure_notes ? `
                <div class="info-item">
                    <div class="label">Closure Notes</div>
                    <div class="value">${project.closure_notes}</div>
                </div>
                ` : ''}
            </div>

            <!-- Signatures -->
            <div class="signature-section">
                <div class="signature-box">
                    <h3>Project Manager</h3>
                    <div class="signature-line"></div>
                    <p>${project.manager.account.first_name} ${project.manager.account.last_name}</p>
                    <p>Date: _____________</p>
                </div>
                <div class="signature-box">
                    <h3>Closure Approved By</h3>
                    <div class="signature-line"></div>
                    <p>${project.closure_approved_user?.account?.first_name || '______________'} ${project.closure_approved_user?.account?.last_name || ''}</p>
                    <p>Date: ${project.closure_approved_at ? new Date(project.closure_approved_at).toLocaleDateString() : '_____________'}</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>This report was automatically generated on ${currentDate}</p>
            <p>Project Management System - ${project.name} (${project.project_code})</p>
        </div>
    </body>
    </html>
    `;
}
