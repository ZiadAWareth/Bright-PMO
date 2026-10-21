# PMO-Client

The Bright PMO frontend: Next.js 15, React 18, Tailwind v4, on port **7060**.

- How it fits with the other apps: the root `README.md`
- Rules for working in this codebase: `AGENTS.md`
- Splitting screens and file size limits: `../docs/REFACTOR_CONVENTIONS.md`

```
npm run dev         # http://localhost:7060
npm run typecheck
npm run lint
```

It is a pure frontend, not connected to any backend yet. Every screen renders
with empty data, access is open (no sign-in, no roles), and actions that would
save something show a "not connected" message (`src/lib/not-connected.ts`).

