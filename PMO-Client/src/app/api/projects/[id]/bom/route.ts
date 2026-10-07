import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const projectId = Number(id);
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // Fetch project details
  const project = await prisma.project.findUnique({
    where: { project_id: projectId },
    select: {
      project_id: true,
      project_code: true,
      name: true,
      description: true,
      status: true,
      start_date: true,
      planned_end_date: true,
      actual_end_date: true,
      budget_amount: true,
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch tasks and associated resource assignments for the project
  const tasks = await prisma.task.findMany({
    where: { wbs: { project_id: projectId } },
    include: { resourceAssignments: { include: { resource: true } } },
  });
  // Flatten all resource assignments, including task info
  const assignments = tasks.flatMap((task) =>
    task.resourceAssignments.map((ra) => ({ ...ra, task }))
  );

  // Aggregate resource assignments by unique resource to avoid duplicates
  const maps = {
    labor: new Map<number, any>(),
    equipment: new Map<number, any>(),
    material: new Map<number, any>(),
  };
  // Process each assignment
  assignments.forEach((a) => {
    const res = a.resource;
    if (!res) return;
    const qty = a.actual_hours || a.planned_hours || 1;
    const cost = res.rate * qty;
    const typeKey = res.type.toLowerCase();
    const map = maps[typeKey as keyof typeof maps];
    if (!map) return;
    // Existing entry?
    if (map.has(res.resource_id)) {
      const e = map.get(res.resource_id);
      if (typeKey === "labor") e.hours_worked = (e.hours_worked ?? 0) + qty;
      if (typeKey === "equipment") e.days_used = (e.days_used ?? 0) + qty;
      if (typeKey === "material") e.quantity_used = (e.quantity_used ?? 0) + qty;
      e.total_cost += cost;
      e.assignments.push({ taskName: a.task?.name || "-", quantity: qty, cost });
    } else {
      map.set(res.resource_id, {
        id: res.resource_id,
        name: res.name,
        type: res.type,
        role: res.role,
        rate: res.rate,
        hours_worked: typeKey === "labor" ? qty : undefined,
        days_used: typeKey === "equipment" ? qty : undefined,
        quantity_used: typeKey === "material" ? qty : undefined,
        unit: res.unit ?? undefined,
        total_cost: cost,
        assignments: [{ taskName: a.task?.name || "-", quantity: qty, cost }],
      });
    }
  });
  // Convert maps to arrays and calculate totals
  const categories = {
    labor: Array.from(maps.labor.values()),
    equipment: Array.from(maps.equipment.values()),
    material: Array.from(maps.material.values()),
  };
  const laborTotal = categories.labor.reduce((sum, e) => sum + e.total_cost, 0);
  const equipmentTotal = categories.equipment.reduce((sum, e) => sum + e.total_cost, 0);
  const materialTotal = categories.material.reduce((sum, e) => sum + e.total_cost, 0);

  const now = new Date();
  const bom = {
    project: {
      name: project.name,
      project_code: project.project_code,
      description: project.description,
      status: project.status,
      start_date: project.start_date,
      end_date: project.actual_end_date || project.planned_end_date,
    },
    generated_date: now.toISOString(),
    reporting_period: {
      from: project.start_date,
      to: project.actual_end_date || project.planned_end_date,
    },
    categories,
    totals: {
      labor_total: laborTotal,
      equipment_total: equipmentTotal,
      material_total: materialTotal,
      grand_total: laborTotal + equipmentTotal + materialTotal,
    },
    summary: {
      total_resources:
        categories.labor.length +
        categories.equipment.length +
        categories.material.length,
      budget_utilization:
        project.budget_amount
          ? ((laborTotal + equipmentTotal + materialTotal) / project.budget_amount) * 100
          : 0,
      cost_variance: project.budget_amount
        ? project.budget_amount - (laborTotal + equipmentTotal + materialTotal)
        : 0,
    },
  };
  // Return full BOM object to match front-end usage
  return NextResponse.json(bom);
}
