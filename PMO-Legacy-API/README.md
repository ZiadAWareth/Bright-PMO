# PMO-Legacy-API

The old Bright PMO backend: Next.js API routes and Prisma on PostgreSQL, on
port **7061**. It has no pages; `PMO-Client` forwards `/api/...` here.

It stays in place until every screen has moved to the new backend
(`PMO-Soul-Backend`), and is then deleted. Fix bugs and security issues here, but do
not add features: new endpoints belong in `PMO-Soul-Backend`.

```
npm run dev                 # http://localhost:7061
npm run typecheck
npm run cron                # scheduled jobs (recurring tasks, timesheets)
npm run create-timesheets   # one-off weekly timesheet creation
```

- `src/app/api/`: the route handlers
- `src/legacy-server/`: shared server code (Prisma client, auth, services)
- `prisma/`: the V1 schema and seeds; the source for the V2 data migration
- `.env.example`: every setting it reads

The shared Prisma client omits `password_hash` from every user read; only
sign-in and the password change route ask for it explicitly.
