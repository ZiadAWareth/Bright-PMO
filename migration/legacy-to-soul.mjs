/**
 * Legacy database -> new backend (Soul) database: organisation, business units,
 * roles and users. Safe to re-run: every row is matched and updated, never
 * duplicated.
 *
 *   npm run migrate:dry    # report only, change nothing
 *   npm run migrate        # apply, in one transaction
 *
 * Reads both database addresses from migration/.env. The legacy database is
 * read through the client generated from legacy/schema.prisma (npm install
 * generates it); the new one through PMO-Soul-Backend's generated client, so
 * writes match the backend's schema exactly. Prints counts, never personal
 * data or secrets.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LEGACY_ROLES, permissionsFor } from './role-matrix.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DRY_RUN = process.argv.includes('--dry-run');

const ORGANIZATION = {
  name: 'Wujha',
  slug: 'wujha',
  timezone: 'UTC',
  defaultCurrency: 'EGP',
};
/** The seeded template role whose shape (entities and actions) new roles copy. */
const TEMPLATE_ROLE = 'Organisation Admin';

function setting(name) {
  const env = readFileSync(path.join(HERE, '.env'), 'utf8');
  const match = env.match(new RegExp(String.raw`^${name}\s*=\s*"?([^"\r\n]+)"?`, 'm'));
  if (!match) throw new Error(`No ${name} in migration/.env (see .env.example)`);
  return match[1];
}

function legacyClient() {
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require('./legacy/client');
  return new PrismaClient({ datasources: { db: { url: setting('LEGACY_DATABASE_URL') } } });
}

function soulClient() {
  const require = createRequire(path.join(ROOT, 'PMO-Soul-Backend', 'package.json'));
  const { PrismaClient } = require('@prisma/client');
  return new PrismaClient({ datasources: { db: { url: setting('SOUL_DATABASE_URL') } } });
}

const legacy = legacyClient();
const soul = soulClient();

const USER_STATUS = { active: 'active', inactive: 'inactive', suspended: 'suspended' };
const isBcrypt = (hash) => /^\$2[aby]\$\d\d\$/.test(hash ?? '');

async function main() {
  // ---- Read the legacy side ------------------------------------------------
  const legacyUsers = await legacy.user.findMany({
    include: { account: true, role: true },
    orderBy: { user_id: 'asc' },
  });
  const legacyRoleNames = new Set(legacyUsers.map((u) => u.role.name));
  const unknownRoles = [...legacyRoleNames].filter((r) => !LEGACY_ROLES.includes(r));
  if (unknownRoles.length) throw new Error(`Roles missing from role-matrix.mjs: ${unknownRoles.join(', ')}`);

  const departments = [...new Set(legacyUsers.map((u) => u.account?.department?.trim() || 'General'))].sort();

  // ---- Find the Soul organisation ---------------------------------------------
  const organizations = await soul.organization.findMany({ where: { id: { not: 0 } }, orderBy: { id: 'asc' } });
  const organization = organizations.find((o) => o.slug === ORGANIZATION.slug) ?? organizations[0];
  if (!organization) throw new Error('No organisation in the Soul database. Run its seed first.');

  const template = await soul.rolesAndPermissions.findUnique({ where: { role: TEMPLATE_ROLE } });
  if (!template) throw new Error(`Role "${TEMPLATE_ROLE}" not found in the Soul database.`);

  const existingEmails = new Set(
    (await soul.user.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase()),
  );
  const toCreate = legacyUsers.filter((u) => !existingEmails.has(u.email.trim().toLowerCase())).length;

  console.log(`Organisation #${organization.id} "${organization.name}" -> "${ORGANIZATION.name}"`);
  console.log(`Business units: ${departments.length} (${departments.join(', ')})`);
  console.log(`Roles: ${LEGACY_ROLES.length}`);
  console.log(
    `Users: ${legacyUsers.length} (${toCreate} new, ${legacyUsers.length - toCreate} updated; ` +
      `${legacyUsers.filter((u) => !isBcrypt(u.password_hash)).length} without a usable password)`,
  );
  if (DRY_RUN) {
    console.log('\nDry run: nothing was changed.');
    return;
  }

  // ---- Write, all or nothing ----------------------------------------------
  await soul.$transaction(
    async (tx) => {
      const orgId = organization.id;
      await tx.organization.update({
        where: { id: orgId },
        data: { name: ORGANIZATION.name, slug: ORGANIZATION.slug, isActive: true },
      });
      await tx.organizationSettings.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          status: 'active',
          timezone: ORGANIZATION.timezone,
          defaultCurrency: ORGANIZATION.defaultCurrency,
        },
        update: { timezone: ORGANIZATION.timezone, defaultCurrency: ORGANIZATION.defaultCurrency },
      });

      const unitIds = {};
      for (const name of departments) {
        const existing = await tx.businessUnit.findFirst({ where: { organizationId: orgId, name } });
        unitIds[name] = existing
          ? existing.id
          : (await tx.businessUnit.create({ data: { organizationId: orgId, name } })).id;
      }

      const roleIds = {};
      for (const role of LEGACY_ROLES) {
        const entityPermissions = permissionsFor(role, template.entityPermissions);
        const row = await tx.rolesAndPermissions.upsert({
          where: { role },
          create: { role, entityPermissions, organizationId: orgId },
          update: { entityPermissions, organizationId: orgId },
        });
        roleIds[role] = row.id;
      }

      for (const u of legacyUsers) {
        const email = u.email.trim().toLowerCase();
        const data = {
          firstName: u.account?.first_name?.trim() || u.username,
          lastName: u.account?.last_name?.trim() || '',
          email,
          // The legacy bcrypt hash, so the same password works. Anything else
          // (the SYSTEM account's placeholder) becomes "no password": that
          // account cannot sign in.
          password: isBcrypt(u.password_hash) ? u.password_hash : null,
          roleId: roleIds[u.role.name],
          businessUnitId: unitIds[u.account?.department?.trim() || 'General'],
          organizationId: orgId,
          isPlatformAdmin: false,
        };
        const existing = await tx.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        });
        const user = existing
          ? await tx.user.update({ where: { id: existing.id }, data })
          : await tx.user.create({ data });

        const profile = {
          username: u.username,
          idpUserId: u.idp_user_id,
          phoneNumber: u.account?.phone_number ?? null,
          status: USER_STATUS[u.status] ?? 'inactive',
          organizationId: orgId,
        };
        await tx.userProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...profile },
          update: profile,
        });
      }
    },
    { timeout: 60_000 },
  );

  // ---- Verify ------------------------------------------------------------------
  const emails = legacyUsers.map((u) => u.email.trim().toLowerCase());
  const migrated = await soul.user.findMany({
    where: { email: { in: emails } },
    include: { userprofile: true },
  });
  const withProfile = migrated.filter((u) => u.userprofile).length;
  const withPassword = migrated.filter((u) => u.password).length;
  console.log(
    `\nDone. ${migrated.length}/${legacyUsers.length} users in Soul, ${withProfile} with a profile, ` +
      `${withPassword} can sign in with their legacy password.`,
  );
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([legacy.$disconnect(), soul.$disconnect()]));
