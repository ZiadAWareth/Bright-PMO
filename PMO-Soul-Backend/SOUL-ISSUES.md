# Generator issues found in a Soul-generated backend

Found on 2026-10-18 by reading the NestJS backend Soul generated from our Prisma
schema (78 models; NestJS 11, Prisma 5.22). File paths are relative to the
generated `backend/` folder. The issues come from the generator's templates, so
they likely affect every generated app, not just ours.

## Security

### 1. Password hashes are returned by the API

`GET /api/user`, `GET /api/user/:id`, `POST /api/auth/login` and
`POST /api/auth/refresh` return the full user row, including the bcrypt hash in
`password`. Nothing removes it before the response:

- `src/shared/auth-logic.ts`: `login()` and `refresh()` return `{ accessToken, user }`
  with the raw user.
- `src/shared/user-logic.ts`: `getAll()` and `getById()` return raw rows.

Any user allowed to list users can collect every hash in their organisation and
attack them offline.

**Expected:** never select or return `password` (e.g. Prisma `omit` on the client,
or an explicit `select`).

### 2. The user search matches against password hashes

`src/shared/user-logic.ts`: `password` is in `FILTER_SPEC.stringFields` and in
the `q` search fields. So `GET /api/user?q=$2b$10$ab` or
`?password_contains=...` lets a caller probe hashes character by character,
even if issue 1 is fixed.

**Expected:** `password` is never searchable or filterable.

### 3. `createdById` (and similar audit fields) come from the client

`src/project/dto/create-project.dto.ts` requires `createdById: number` in the
request body. Any caller can record any user as the creator. The controller
already knows the signed-in user (`userId` is passed to the service) but does
not use it.

**Expected:** fields that point at the creator are set from the token and refused
from the body.

### 4. A duplicate create returns the existing record

`src/shared/*-logic.ts`, `create()`: on a unique-constraint error (P2002) the
code looks up the existing row with the same unique values and returns it as if
the create succeeded. A caller who guesses a unique value (an email, a code)
receives the existing record, including fields they never supplied (with issue 1,
the user's password hash). A real client also cannot tell "created" from
"already existed".

**Expected:** 409 Conflict naming the duplicate field.

### 5. The seed deletes all users and roles

`prisma/seed.ts` starts with `prisma.user.deleteMany({})` and
`prisma.rolesAndPermissions.deleteMany({})`. Running it against a live database
wipes every account.

**Expected:** the seed is idempotent (upserts) or refuses to run on a database
that already has users.

## Schema fidelity

The schema imports without errors, but the generated Prisma schema and DTOs
silently drop the following.

### 6. Composite unique constraints are dropped

All 30 `@@unique([a, b])` rules in our schema are missing from
`prisma/schema.prisma`, e.g. `@@unique([projectId, key])` on work items,
`@@unique([organizationId, code])` on projects,
`@@unique([predecessorId, successorId])` on dependencies,
`@@unique([userId, projectId, periodStart])` on timesheets. Duplicates that the
data model forbids become possible.

**Expected:** keep `@@unique` (and `@@index`) as written.

### 7. Field defaults are dropped, so the create DTO requires them

Only `id` and `createdAt` defaults survive. Fields such as `Project.status`
(`@default(DRAFT)`), `workItemSeq` (`@default(0)`), `progressPct`,
`healthScore` and the cost fields become required in the create DTO.

This also clashes with workflow-controlled fields: once an active workflow owns
`Project.status`, `src/workflow/workflow-controlled-fields.ts` refuses any
request that contains `status`, but the create DTO requires it, so **no project
can be created**.

**Expected:** keep `@default(...)` in the schema and make defaulted fields optional
in the create DTO.

### 8. Cascade deletes are dropped

Our schema has 55 `onDelete: Cascade` relations; the generated schema keeps only
Soul's own 7. Deleting a project, sprint or comment that has children fails with
a foreign-key error instead of removing the children.

**Expected:** keep `onDelete` / `onUpdate` as written.

### 9. Required relations become optional

Every relation and its foreign key become optional (`Int?`), so e.g. a work item
without a project is accepted.

**Expected:** keep required relations required (apart from the `organizationId`
Soul adds for tenancy, if it must be optional).

### 10. `@map` / `@@map` and `@db.Decimal(p, s)` are dropped

Tables and columns are created with the model and field names instead of the
mapped snake_case names, and decimals lose their precision. Lower impact, but it
breaks any SQL, report or migration written against the mapped names.

**Expected:** keep them.

## Found while running it locally

### 11. `src/shared/preview-worker.ts` does not compile

`nest build` / `nest start` fail with 6 TypeScript errors in this file, e.g.
`const userRepo = userRepo;` (line 641, a variable declared in terms of itself)
and `import('bcryptjs')`, which is not a dependency. Nothing in the server
imports the file, so we leave it out of `tsconfig.build.json` to build.

**Expected:** the generated backend builds with `nest build` as exported.

### 12. Bad input returns 500 instead of 400

- Creating a record with a foreign key that does not exist
  (`POST /api/portfolio` with `managerId: 12345`) returns
  `500 Internal server error`.
- A list filter with an invalid enum value (`GET /api/portfolio?status_eq=ACTIVE`
  when the values are lowercase) returns 500.

**Expected:** 400 with a message naming the field (Prisma P2003 for foreign keys;
validate filter values against the enum).

### 13. The generated `.gitignore` does not ignore anything

Every line in the backend's `.gitignore` is indented with four spaces. Git
does not trim leading spaces, so `    .env` does not match `.env` and
`    node_modules/` does not match `node_modules/`. A repository that holds
only this backend would commit its `.env` (database password, JWT secret,
storage keys).

**Expected:** no indentation.

### 14. Two filters on the same field: only the last one applies

`src/shared/query-filters.ts`, `applyFilterClause()` assigns `where[field] = { gte: ... }`
and then `where[field] = { lte: ... }`, so
`GET /api/portfolio?budgetCapacity_gte=1000&budgetCapacity_lte=5000` returns
everything up to 5000. Date ranges (`dueDate_gte` + `dueDate_lte`) have the same
problem, and they are the most common filter in our screens. An unknown operator
(`status_eq`) also silently becomes equality instead of being refused.

**Expected:** merge operators on one field (`{ gte, lte }`); 400 on an unknown
operator.

### 15. The `q` search returns 500 on any table with a `String[]` column

The search builds `{ [field]: { contains, mode: 'insensitive' } }` for every
string field, including list fields, which Prisma rejects ("Unknown argument
`contains`"). Any `q` search on Portfolio, Project, WorkItem and Resource
(`tags`, `skills`), and on Soul's own Agent and ApiKey, fails with 500.

**Expected:** leave list fields out of the text search, or search them with
`has`.

### 16. Role names are unique across the whole Soul application
Role names are unique across the whole Soul application, so two tenants can't both have a role called "ADMIN". 

## Admin panel

### 16. A model named `Resource` stops the whole admin panel from loading

The generated `src/resources/Resource/index.tsx` imports the generic
`ResourceList` and `ResourceShow` components and then declares page components
with the same names (`export function ResourceList() { return <ResourceList config={config} /> }`).
That is a duplicate declaration ("Duplicate declaration ResourceList"), and since
`App.tsx` imports the file, the panel shows only an error. `tsc --noEmit` reports
it (TS2440), so `npm run build` fails too.

**Expected:** import the generic components under internal names (or prefix
generated page names), so any model name works.

## Questions

1. Where should hand-written code (custom endpoints, services) live so that
   regenerating the app does not overwrite it?
2. Can we get a database connection reachable from outside Soul's network, or an
   import route, for migrating existing data?
3. Can `RolesAndPermissions` express "own rows only" for an action, or is it yes/no
   only?
4. Is SSO (OIDC/SAML) sign-in on the roadmap?
