# Legacy data -> new backend

Scripts that copy data from the legacy database into the new backend's
database (`PMO-Soul-Backend`). They live here, outside the Soul folder, so
regenerating the backend never overwrites them.

The folder is self-contained: the legacy app (`PMO-Legacy-API`, still on the
`dev` branch) is not needed. `legacy/schema.prisma` is a read-only copy of the
legacy schema, and `npm run generate` creates a client for it in
`legacy/client/`. Writes use `PMO-Soul-Backend`'s generated client, so they
always match the new backend's schema.

Every script is **safe to re-run**: rows are matched (by email, name or unique
key) and updated, never duplicated. Each one has a dry run, which reports what
it would do and changes nothing. They print counts only, never personal data or
secrets.

## Set up (once)

1. Copy `.env.example` to `.env` and fill in both database addresses: the
   legacy database (`bright-pmo`) and the new backend's (`pmo_soul`, the same
   as `DATABASE_URL` in `PMO-Soul-Backend/.env`).
2. `npm install` here, then `npm run generate` (npm 11 may skip the install
   script that generates the legacy client).
3. `PMO-Soul-Backend` needs its dependencies installed and its Prisma client
   generated (see its README). It does not need to be running.

## Run

```
cd migration
npm run migrate:dry
npm run migrate
```

Users must sign in again afterwards: permissions are read into the token at
sign-in.

## What is migrated so far

| Legacy | New backend | Notes |
|---|---|---|
| (organisation #1) | `Organization` #1 renamed **Wujha** (slug `wujha`) + `OrganizationSettings` (active, UTC, EGP) | The organisation Soul's seed created. |
| `Account.department` | `BusinessUnit`, one per department | |
| `Role` (13) | `RolesAndPermissions`, same names | Permissions from `role-matrix.mjs`, not the legacy `permissions` JSON (coarse labels the app never checked). |
| `User` + `Account` | `User` + `UserProfile` | Email lowercased; first/last name; **the legacy bcrypt hash as the password**, so the same password works; role; business unit; organisation. Username, IdP id, phone and status go to `UserProfile`. |

The SYSTEM account has no real password in the legacy database (a placeholder).
It is migrated with no password, so it cannot sign in, as before.

Soul's own seeded accounts (`admin@…` super admin, `orgadmin@…` organisation
admin) and roles (`Super Admin`, `Organisation Admin`, `Member`) are left as
they are.

## The permission matrix

`role-matrix.mjs` groups the 78 entities (ADMIN and SYSTEM get everything,
including Soul's own platform entities, which no other role gets):

| Group | Write (create/update/delete) | Read |
|---|---|---|
| Organisation, business units, organisation settings | ADMIN | everyone |
| Users and profiles | PMO, HR, DIR | everyone |
| Roles | ADMIN | PMO, HR, DIR |
| API keys, integrations, sign-in internals | ADMIN | ADMIN |
| Templates and configuration (workflows, approval policies, lifecycle and closure templates, calendars, categories, benchmarks) | PMO | everyone |
| EPS, portfolios | PJM, PMO, DIR | everyone |
| Project set-up, schedule, Agile planning (projects, members, statuses, WBS, baselines, EVM, sprints, releases, progress reports) | PJM, PMO, DIR | everyone |
| Day-to-day work (work items, comments, documents, checklists, inspections, handovers, lessons, timesheets, approval requests, notifications, alerts, activity, saved reports) | everyone | everyone |
| Closure | PJM, PMO, DIR, QAQC | everyone |
| Resources | PJM, PMO, DIR, HR | everyone |
| Risks | PJM, PMO, DIR | everyone |
| Procurement (vendors, procurements, RFQ responses, contracts) | PROC, PJM, PMO, DIR | those + LEGAL, FIN |
| Budget and costs | FIN, PJM, PMO, DIR | everyone |
| Sites and equipment | SITE, ENG, PJM, PMO, DIR | everyone |

It is derived from the legacy page access (`PMO-Client/src/lib/route-access.ts`)
and the few routes the legacy API restricted (procurement, schedules, roles),
so it is already stricter than the legacy API, which let any signed-in user
call almost everything. **Review it with the business** before real users rely
on it; change it in `role-matrix.mjs` and re-run, so the file stays the source
of truth (changes made in Soul's admin panel are overwritten by the next run).

Soul's permissions are yes/no per entity and action. Rules about *which rows*
("a PJM edits only projects they manage", "users edit only their own
timesheets") are not expressible here and need custom backend code.

## Next

Remaining tables, in dependency order: calendars, EPS and portfolios, projects
and members, work items, then everything that hangs off projects. Each step
maps legacy ids to new ids through a natural key (email for users, code for
projects).
