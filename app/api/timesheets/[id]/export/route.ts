import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { jsPDF } from 'jspdf';

/**
 * @swagger
 * /api/timesheets/{id}/export:
 *   get:
 *     summary: Export timesheet to PDF
 *     description: Export a specific timesheet to PDF format
 *     tags:
 *       - Timesheets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PDF file of the timesheet
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        console.log('Starting timesheet export for ID:', resolvedParams.id);
        
        const { userId, role } = await getUserFromHeaders();
        if (!userId || !role) {
            console.error('Missing user information');
            return NextResponse.json(
                { error: "Unauthorized. Missing user information." },
                { status: 401 }
            );
        }
        if(role != "PJM"){
            console.error('Unauthorized role:', role);
            return NextResponse.json(
                { error: "Unauthorized role. Only PJM can export timesheets." },
                { status: 403 }
            );
        }

        const timesheetId = parseInt(resolvedParams.id);
        console.log('Fetching timesheet data for ID:', timesheetId);

        // Get timesheet with all related data
        const timesheet = await prisma.timesheet.findFirst({
            where: {
                timesheet_id: timesheetId,
                user_id: userId
            },
            include: {
                user: {
                    include: {
                        account: true
                    }
                },
                project: true,
                time_entries: {
                    include: {
                        task: true
                    },
                    orderBy: {
                        date: 'asc'
                    }
                }
            }
        });

        if (!timesheet) {
            console.error('Timesheet not found:', timesheetId);
            return NextResponse.json(
                { error: 'Timesheet not found' },
                { status: 404 }
            );
        }

        console.log('Creating PDF document');
        // Create PDF
        const doc = new jsPDF();
        
        try {
            // Add content to PDF
            doc.setFontSize(20);
            doc.text('Timesheet Report', 105, 20, { align: 'center' });

            // Add timesheet details
            doc.setFontSize(12);
            doc.text(`Project: ${timesheet.project.name}`, 20, 40);
            doc.text(`Period: ${timesheet.start_date.toLocaleDateString()} - ${timesheet.end_date.toLocaleDateString()}`, 20, 50);
            doc.text(`Status: ${timesheet.status}`, 20, 60);
            doc.text(`Total Hours: ${timesheet.total_hours}`, 20, 70);

            // Add time entries table
            doc.setFontSize(12);
            doc.text('Time Entries', 20, 90);
            doc.line(20, 95, 190, 95);

            // Table headers
            doc.text('Date', 20, 105);
            doc.text('Task', 60, 105);
            doc.text('Hours', 120, 105);
            doc.text('Description', 140, 105);

            // Table rows
            let y = 115;
            timesheet.time_entries.forEach((entry) => {
                if (y > 270) { // Check if we need a new page
                    doc.addPage();
                    y = 20;
                }
                doc.text(entry.date.toLocaleDateString(), 20, y);
                doc.text(entry.task.name, 60, y);
                doc.text(entry.hours_spent.toString(), 120, y);
                doc.text(entry.description || '', 140, y);
                y += 10;
            });

            // Add footer
            doc.setFontSize(10);
            doc.text(
                `Generated on ${new Date().toLocaleDateString()}`,
                20,
                doc.internal.pageSize.height - 20
            );

            console.log('Generating PDF buffer');
            const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

            console.log('Returning PDF file');
            // Return PDF file
            return new NextResponse(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="timesheet-${timesheetId}.pdf"`
                }
            });
        } catch (pdfError) {
            console.error('Error generating PDF:', pdfError);
            throw pdfError;
        }
    } catch (error: any) {
        console.error('Error exporting timesheet:', error);
        return NextResponse.json(
            { error: `Failed to export timesheet: ${error.message}` },
            { status: 500 }
        );
    }
} 