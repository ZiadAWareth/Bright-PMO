# PMO-Soul-Admin-Panel

Soul's generated admin panel (Vite + React): the platform administration view
for Bright PMO. The super admin manages tenants (organisations), their admins,
users, the role matrix and workflows here. `PMO-Client` stays the app for
everyone else.

It talks to `PMO-Soul-Backend`, never to the legacy API.

## Running locally

Needs `PMO-Soul-Backend` running on http://localhost:7062.

```
cd PMO-Soul-Admin-Panel
npm install          # once
npm run dev          # http://localhost:7063
```

Sign in with the seeded super admin (`admin@anothertestpmo.com`) or
organisation admin (`orgadmin@anothertestpmo.com`); the password is printed by
the backend's seed. Migrated legacy users with the ADMIN role can sign in too.

`.env` holds Soul's deployed settings. `.env.local` (git-ignored, overrides
`.env`) points local runs at the local backend:

```
VITE_API_URL=                          # empty: call /api on this origin
DEV_PORT=7063
DEV_API_TARGET=http://localhost:7062   # where Vite forwards /api and /socket.io
```

What needs Soul's platform and does not work locally: running workflows,
email, file uploads, reports and the UI builder.

## Local changes to generated files

Re-apply after a regeneration:

- `vite.config.ts` reads `DEV_PORT` and `DEV_API_TARGET`, and also forwards
  `/socket.io` (live notifications and workflow runs).
- `src/resources/Resource/index.tsx` imports the generic components under other
  names. Our model is called `Resource`, so the generated `ResourceList` and
  `ResourceShow` clashed with the generic components of the same name, and the
  whole panel failed to load (`../PMO-Soul-Backend/SOUL-ISSUES.md`, issue 16).
- `src/components/layout/sidebar.tsx` groups the 75 tables into 14 PMO modules
  (Organization & Access, Portfolio Management, Projects, Work Management,
  Schedule & Baselines, Agile, Resources & Time, Finance, Risk, Procurement,
  Sites & Equipment, Approvals, Quality & Closure, Documents & Monitoring) and
  fixes a few labels (EPS, WBS, EVM, RFQ, API). Better done in Soul itself:
  assign each table to a module in Soul's schema editor (Project Conflicts
  already has one, "Project"), so a regeneration keeps the grouping.
