/**
 * POST /api/users/from-hr-employee
 * Ensure an SSO user exists in PMO DB from HR employee data (e.g. when assigning as PM or team member).
 * If user exists (by idp_user_id or email), return them; otherwise create with given role (or PJM default) and SSO_USER.
 * Body may include optional role (name) or role_id to use app roles enum.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

async function getRoleIdByName(name: string): Promise<number> {
  const role = await prisma.role.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
  });
  return role?.role_id ?? 0;
}

async function getDefaultRoleId(): Promise<number> {
  const role = await prisma.role.findFirst({
    where: { name: { equals: "PJM", mode: "insensitive" } },
  });
  if (role) return role.role_id;
  const fallback = await prisma.role.findFirst({
    orderBy: { role_id: "asc" },
  });
  return fallback?.role_id ?? 1;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const decoded = await verifyToken(token);
    if (!decoded?.userId && !decoded?.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const idpUserId = (body.idp_user_id ?? body._id ?? body.id)?.toString();
    const email = body.email?.trim();
    const firstName = (body.first_name ?? body.firstName)?.trim() || "Unknown";
    const lastName = (body.last_name ?? body.lastName)?.trim() || "User";
    const department = (body.department ?? "").trim() || "General";
    const roleParam = body.role != null ? String(body.role).trim() : null;
    const roleIdParam = body.role_id != null ? Number(body.role_id) : null;

    if (!idpUserId || !email) {
      return NextResponse.json(
        { error: "idp_user_id (or id) and email are required" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ idp_user_id: idpUserId }, { email }],
      },
      include: { account: true, role: true },
    });

    if (user) {
      return NextResponse.json(user);
    }

    let roleId: number;
    if (roleIdParam && !isNaN(roleIdParam)) {
      const role = await prisma.role.findUnique({ where: { role_id: roleIdParam } });
      roleId = role?.role_id ?? (await getDefaultRoleId());
    } else if (roleParam) {
      roleId = (await getRoleIdByName(roleParam)) || (await getDefaultRoleId());
    } else {
      roleId = await getDefaultRoleId();
    }
    const baseUsername = email.split("@")[0];
    let username = baseUsername;
    const existingByUsername = await prisma.user.findUnique({
      where: { username: baseUsername },
    });
    if (existingByUsername) {
      username = `${baseUsername}_${Date.now()}`;
    }

    user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: "SSO_USER",
        role_id: roleId,
        status: "active",
        idp_user_id: idpUserId,
        account: {
          create: {
            first_name: firstName,
            last_name: lastName,
            department,
            phone_number: null,
            is_active: true,
          },
        },
      },
      include: { account: true, role: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("[from-hr-employee] Error:", error);
    return NextResponse.json(
      { error: "Failed to ensure user from HR employee" },
      { status: 500 }
    );
  }
}
