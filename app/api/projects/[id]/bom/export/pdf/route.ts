import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "@/lib/prisma";

const MARGIN = 20;
const FOOTER_Y = 280;
const FOOTER_Y2 = 285;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { project_id: projectId },
    select: { project_id: true, project_code: true, name: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const tasks = await prisma.task.findMany({
    where: { wbs: { project_id: projectId } },
    include: { resourceAssignments: { include: { resource: true, task: true } } },
  });
  const assignments = tasks.flatMap((task) =>
    task.resourceAssignments.map((ra) => ({ ...ra, task }))
  );

  type Entry = {
    name: string;
    type: string;
    role: string | null;
    rate: number;
    hours: number;
    total: number;
    task: string;
    unit?: string;
  };

  const categories: { labor: Entry[]; equipment: Entry[]; material: Entry[] } = {
    labor: [],
    equipment: [],
    material: [],
  };

  let laborTotal = 0, equipmentTotal = 0, materialTotal = 0;

  for (const a of assignments) {
    const res = a.resource;
    if (!res) continue;
    const type = (res.type || "").toLowerCase();
    const quantity = a.actual_hours || a.planned_hours || 1;
    const cost = (res.rate || 0) * quantity;
    const base: Entry = {
      name: res.name,
      type: res.type,
      role: res.role,
      rate: res.rate,
      hours: quantity,
      total: cost,
      task: a.task?.name || "-",
      unit: res.unit ?? undefined,
    };
    if (type === "labor") { categories.labor.push(base); laborTotal += cost; }
    else if (type === "equipment") { categories.equipment.push(base); equipmentTotal += cost; }
    else { categories.material.push(base); materialTotal += cost; }
  }

  const grandTotal = laborTotal + equipmentTotal + materialTotal;
  const generatedDate = new Date();
  const generatedStr = `Generated on: ${generatedDate.toLocaleDateString()} at ${generatedDate.toLocaleTimeString()}`;

  const doc = new jsPDF();

  // --- Header (match lib/reporting/pdfGenerator.ts) ---
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Bill of Materials", MARGIN, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(generatedStr, MARGIN, 35);
  doc.text(`Project: ${project.name}`, MARGIN, 42);
  doc.text(`Code: ${project.project_code}`, MARGIN, 49);

  // --- Summary (match reporting style) ---
  let startY = 58;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", MARGIN, startY);
  startY += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Labor Total: OMR ${laborTotal.toLocaleString()}`, MARGIN, startY); startY += 6;
  doc.text(`Equipment Total: OMR ${equipmentTotal.toLocaleString()}`, MARGIN, startY); startY += 6;
  doc.text(`Material Total: OMR ${materialTotal.toLocaleString()}`, MARGIN, startY); startY += 6;
  doc.text(`Grand Total: OMR ${grandTotal.toLocaleString()}`, MARGIN, startY); startY += 14;

  // --- Tables with jspdf-autotable (match projects export: orange header, borders) ---
  const tableOpts = {
    startY,
    margin: { left: MARGIN },
    styles: { fontSize: 9 },
    headStyles: { fillColor: [255, 165, 0] as [number, number, number] },
  };

  if (categories.labor.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Labor Resources", MARGIN, startY);
    startY += 6;
    autoTable(doc, {
      ...tableOpts,
      startY,
      head: [["Name", "Rate (OMR)", "Hours", "Unit", "Total (OMR)", "Task"]],
      body: categories.labor.map((e) => [
        e.name || "-",
        String(e.rate ?? 0),
        String(e.hours ?? 0),
        e.unit ?? "",
        String(e.total ?? 0),
        e.task || "-",
      ]),
    });
    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (categories.equipment.length > 0) {
    if (startY > 250) { doc.addPage(); startY = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Equipment Resources", MARGIN, startY);
    startY += 6;
    autoTable(doc, {
      ...tableOpts,
      startY,
      head: [["Name", "Rate (OMR)", "Days", "Unit", "Total (OMR)", "Task"]],
      body: categories.equipment.map((e) => [
        e.name || "-",
        String(e.rate ?? 0),
        String(e.hours ?? 0),
        e.unit ?? "",
        String(e.total ?? 0),
        e.task || "-",
      ]),
    });
    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (categories.material.length > 0) {
    if (startY > 250) { doc.addPage(); startY = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Material Resources", MARGIN, startY);
    startY += 6;
    autoTable(doc, {
      ...tableOpts,
      startY,
      head: [["Name", "Rate (OMR)", "Qty", "Unit", "Total (OMR)", "Task"]],
      body: categories.material.map((e) => [
        e.name || "-",
        String(e.rate ?? 0),
        String(e.hours ?? 0),
        e.unit ?? "",
        String(e.total ?? 0),
        e.task || "-",
      ]),
    });
  }

  // --- Footer on every page (match pdfGenerator) ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${pageCount}`, MARGIN, FOOTER_Y);
    doc.text(generatedStr, 70, FOOTER_Y);
    doc.text(`Bill of Materials - ${project.name}`, MARGIN, FOOTER_Y2);
  }

  const pdfBuffer = doc.output("arraybuffer");
  return new NextResponse(Buffer.from(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=BOM_${project.project_code}.pdf`,
    },
  });
}
