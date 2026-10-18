import { PrismaClient } from '@prisma/client';

/**
 * The shared Prisma client.
 *
 * `password_hash` is omitted from every user read by default. Many routes
 * return users directly or embed them through `include` (project managers,
 * risk owners, schedule creators, …), and each of those used to send every
 * user's hash to the browser. Omitting it here covers all of them, including
 * relations added later. The few places that genuinely need the hash ask for
 * it explicitly: sign-in passes `omit: { password_hash: false }` and the
 * password change route selects it.
 */
const createPrismaClient = () =>
  new PrismaClient({
    omit: { user: { password_hash: true } },
  });

type SharedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: SharedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
