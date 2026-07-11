/**
 * IdP Webhook - receives user.created (and other) events from Holding IdP.
 *
 * Setup:
 * 1. Add IDP_WEBHOOK_SECRET to your .env (must match webhookSecret in IdP Admin → Company Apps)
 * 2. Configure IdP: Admin → Company Apps → set webhookUrl to https://your-app.com/api/webhooks/idp-events
 *
 * Payload fields may be pre-mapped by IdP (e.g. firstName → first_name). Use payload as-is or
 * adapt to your schema in processInboxEvent().
 *
 * Role: payload.role is stored as role_id (integer) - references Role.role_id.
 * - If payload.role is a number, it is used as role_id directly (must exist in Role table).
 * - If payload.role is a string (e.g. "PJM"), it is looked up by Role.name.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const WEBHOOK_SECRET = process.env.IDP_WEBHOOK_SECRET || "";

type IdpInboxDelegate = {
  findUnique: (args: { where: { idempotency_key: string } }) => Promise<any>;
  create: (args: {
    data: {
      idempotency_key: string;
      event: string;
      payload: object;
      status: string;
    };
  }) => Promise<any>;
  update: (args: {
    where: { idempotency_key: string };
    data: { status: string; processed_at?: Date; last_error?: string };
  }) => Promise<any>;
};

interface IdpWebhookPayload {
  event: string;
  timestamp: string;
  idempotencyKey: string;
  payload: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    role?: string | number;
    employeeId?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    membership?: {
      membershipId: string;
      companyId: string;
      officeIds: string[];
      apps: { appId: string; role: string | number; employeeId?: string }[];
    };
  };
}

async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET || !signatureHeader) return true; // Skip if not configured
  const expected = signatureHeader.startsWith("sha256=")
    ? signatureHeader
    : `sha256=${signatureHeader}`;
  const crypto = await import("crypto");
  const computed = `sha256=${crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex")}`;
  if (expected.length !== computed.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(computed, "utf8")
  );
}

/** Resolve role_id from payload.role (number = role_id, string = role name) */
async function resolveRoleId(role: string | number | undefined): Promise<number | null> {
  if (role === undefined || role === null) return null;

  if (typeof role === "number") {
    const existing = await prisma.role.findUnique({ where: { role_id: role } });
    return existing ? role : null;
  }

  const byName = await prisma.role.findFirst({
    where: { name: String(role).toUpperCase() },
  });
  return byName?.role_id ?? null;
}

async function processInboxEvent(doc: {
  idempotencyKey: string;
  event: string;
  payload: IdpWebhookPayload["payload"];
}) {
  const payload = doc.payload;
  if (doc.event !== "user.created" && doc.event !== "user.updated") return;

  const email = (payload.email || "").toLowerCase().trim();
  if (!email) return;

  const idpUserId = payload.id;
  const firstName = payload.first_name ?? payload.firstName ?? "";
  const lastName = payload.last_name ?? payload.lastName ?? "";
  const fullName = payload.full_name ?? `${firstName} ${lastName}`.trim();
  const isActive = payload.isActive !== false;
  const employeeId = payload.employeeId;

  // Resolve role_id: integer = role_id, string = role name lookup
  const roleId = await resolveRoleId(payload.role);
  const defaultRole = await prisma.role.findFirst({
    where: { name: { in: ["USER", "PJM"] } },
  });
  const finalRoleId = roleId ?? defaultRole?.role_id;
  if (!finalRoleId) {
    throw new Error("No valid role_id: payload.role must be a valid role_id or role name, and a default role (USER or PJM) must exist");
  }

  const username = email.split("@")[0] + (idpUserId ? `_${idpUserId.slice(0, 8)}` : "");
  const placeholderPassword = await bcrypt.hash("password123", 10);

  const updateData = {
    password_hash: placeholderPassword,
    role_id: finalRoleId,
    status: isActive ? "active" : "inactive",
    updated_at: new Date(),
    ...(idpUserId && { idp_user_id: idpUserId }),
  };

  const accountUpdateData = {
    first_name: firstName || "Unknown",
    last_name: lastName || "User",
    department: "General",
    is_active: isActive,
    ...(employeeId && { phone_number: employeeId }), // reuse phone_number for employeeId if needed, or add employee_id to schema later
  };

  if (idpUserId) {
    const existingById = await prisma.user.findUnique({
      where: { idp_user_id: idpUserId },
      include: { account: true },
    });
    if (existingById) {
      await prisma.user.update({
        where: { user_id: existingById.user_id },
        data: updateData,
      });
      if (existingById.account) {
        await prisma.account.update({
          where: { account_id: existingById.account.account_id },
          data: accountUpdateData,
        });
      } else {
        await prisma.account.create({
          data: {
            user_id: existingById.user_id,
            ...accountUpdateData,
          },
        });
      }
    } else {
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
        include: { account: true },
      });
      if (existingByEmail) {
        await prisma.user.update({
          where: { user_id: existingByEmail.user_id },
          data: { ...updateData, idp_user_id: idpUserId },
        });
        if (existingByEmail.account) {
          await prisma.account.update({
            where: { account_id: existingByEmail.account.account_id },
            data: accountUpdateData,
          });
        } else {
          await prisma.account.create({
            data: {
              user_id: existingByEmail.user_id,
              ...accountUpdateData,
            },
          });
        }
      } else {
        const uniqueUsername = await ensureUniqueUsername(username);
        await prisma.user.create({
          data: {
            username: uniqueUsername,
            email,
            password_hash: placeholderPassword,
            role_id: finalRoleId,
            idp_user_id: idpUserId,
            status: isActive ? "active" : "inactive",
            account: {
              create: {
                first_name: firstName || "Unknown",
                last_name: lastName || "User",
                department: "General",
                is_active: isActive,
                ...(employeeId && { phone_number: employeeId }),
              },
            },
          },
        });
      }
    }
  } else {
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      include: { account: true },
    });
    if (existingByEmail) {
      await prisma.user.update({
        where: { user_id: existingByEmail.user_id },
        data: updateData,
      });
      if (existingByEmail.account) {
        await prisma.account.update({
          where: { account_id: existingByEmail.account.account_id },
          data: accountUpdateData,
        });
      } else {
        await prisma.account.create({
          data: {
            user_id: existingByEmail.user_id,
            ...accountUpdateData,
          },
        });
      }
    } else {
      const uniqueUsername = await ensureUniqueUsername(username);
      await prisma.user.create({
        data: {
          username: uniqueUsername,
          email,
          password_hash: placeholderPassword,
          role_id: finalRoleId,
          status: isActive ? "active" : "inactive",
          account: {
            create: {
              first_name: firstName || "Unknown",
              last_name: lastName || "User",
              department: "General",
              is_active: isActive,
              ...(employeeId && { phone_number: employeeId }),
            },
          },
        },
      });
    }
  }
}

async function ensureUniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let suffix = 0;
  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!existing) return candidate;
    candidate = `${base}_${++suffix}`;
  }
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const signatureHeader = request.headers.get("X-IdP-Signature");
  if (WEBHOOK_SECRET && signatureHeader && !(await verifySignature(rawBody, signatureHeader))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: IdpWebhookPayload;
  try {
    body = JSON.parse(rawBody) as IdpWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, idempotencyKey, payload } = body;
  if (!event || !idempotencyKey) {
    return NextResponse.json(
      { error: "event and idempotencyKey required" },
      { status: 400 }
    );
  }

  const idpInbox = (prisma as unknown as { idpInbox?: IdpInboxDelegate }).idpInbox;
  if (!idpInbox) {
    return NextResponse.json(
      { error: "IdP inbox model not available in Prisma client" },
      { status: 500 }
    );
  }

  const existing = await idpInbox.findUnique({
    where: { idempotency_key: idempotencyKey },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await idpInbox.create({
    data: {
      idempotency_key: idempotencyKey,
      event,
      payload: payload as object,
      status: "received",
    },
  });

  processInboxEvent({ idempotencyKey, event, payload })
    .then(async () => {
      await idpInbox.update({
        where: { idempotency_key: idempotencyKey },
        data: { status: "processed", processed_at: new Date() },
      });
    })
    .catch(async (err) => {
      console.error("[IdP Webhook] Process error:", err);
      await idpInbox.update({
        where: { idempotency_key: idempotencyKey },
        data: { status: "failed", last_error: String(err) },
      });
    });

  return NextResponse.json({ received: true });
}
