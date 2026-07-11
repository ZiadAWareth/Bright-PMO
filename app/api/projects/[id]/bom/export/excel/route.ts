import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // Fetch project details
  const project = await prisma.project.findUnique({
    where: { project_id: projectId },
    select: { project_id: true, project_code: true, name: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Fetch tasks and resource assignments
  const tasks = await prisma.task.findMany({
    where: { wbs: { project_id: projectId } },
    include: { resourceAssignments: { include: { resource: true, task: true } } },
  });
  const assignments = tasks.flatMap((task) =>
    task.resourceAssignments.map((ra) => ({ ...ra, task }))
  );
  // Categorize resources
  type Entry = { name: string; type: string; role: string; rate: number; hours: number; total: number; task: string; unit?: string };
  const categories: { labor: Entry[]; equipment: Entry[]; material: Entry[] } = { labor: [], equipment: [], material: [] };
  let laborTotal = 0, equipmentTotal = 0, materialTotal = 0;
  for (const a of assignments) {
    const res = a.resource;
    const type = res.type.toLowerCase();
    const cost = res.rate * (a.actual_hours || a.planned_hours || 1);
    const entry = {
      name: res.name,
      type: res.type,
      role: res.role,
      rate: res.rate,
      hours: a.actual_hours || a.planned_hours || 1,
      total: cost,
      task: a.task?.name || "-",
      unit: res.unit ?? undefined,
    };
    if (type === "labor") { categories.labor.push(entry); laborTotal += cost; }
    else if (type === "equipment") { categories.equipment.push(entry); equipmentTotal += cost; }
    else { categories.material.push(entry); materialTotal += cost; }
  }

  // Generate Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("BOM");
  sheet.addRow([`Bill of Materials for ${project.name}`]);
  sheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
  sheet.addRow([""]);
  sheet.addRow(["Category", "Name", "Type", "Role", "Rate", "Hours/Qty", "Total", "Unit", "Task"]);
  for (const cat of ["labor", "equipment", "material"] as const) {
    for (const entry of categories[cat]) {
      sheet.addRow([
        cat,
        entry.name,
        entry.type,
        entry.role,
        entry.rate,
        entry.hours,
        entry.total,
        entry.unit ?? "",
        entry.task,
      ]);
    }
  }
  sheet.addRow([""]);
  sheet.addRow(["Labor Total", laborTotal]);
  sheet.addRow(["Equipment Total", equipmentTotal]);
  sheet.addRow(["Material Total", materialTotal]);
  sheet.addRow(["Grand Total", laborTotal + equipmentTotal + materialTotal]);
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=BOM_${project.project_code}.xlsx`,
    },
  });
}

// Alias GET to POST so downloading via GET works
export const GET = POST;
