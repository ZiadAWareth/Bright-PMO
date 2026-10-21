# PMO-Client: rules for working in this codebase

The frontend of Bright PMO: Next.js 15 (App Router, Turbopack), React 18,
Tailwind v4. Port **7060**. It is a pure frontend: it has no database access,
no server code of its own, and is not connected to any backend yet. See the root `README.md` for how the three apps
fit together.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:7060 |
| `npm run typecheck` | TypeScript check; must report 0 errors before a commit |
| `npm run lint` | ESLint; must report 0 errors (warnings are known debt) |
| `npm run build` | Production build (also runs lint) |

## Where things go

```
src/
  app/          Routes only: page.tsx, layout.tsx. No shared code lives here.
  features/     Domain code, one folder per domain:
    <domain>/
      components/   Screens' sections, modals, cards
      hooks/        Data and state hooks
      types.ts      The domain's types
  components/
    ui/         Shared primitives (see below). Build screens from these.
    layout/     AppShell, DashboardLayout, nav-sections
    form/       Generic form helpers (AddEntityModal, SearchableDropdown, …)
    brand/      Logo
  hooks/        Generic hooks only (useDebounce, useOutsideClick, …)
  lib/          Framework-level helpers: utils, notConnected()
  types/        enums.ts: client-side copies of the backend's enums
```

Current domains: analytics, approvals, auth, eps, marketing, notifications,
portfolios, projects, risks, scheduler, team, users, work-items,
waterfall/{wbs,schedule}. `features/agile/` is reserved for the Scrum/Kanban
screens (see its README).

## Rules

1. **Pages stay thin.** A `page.tsx` reads route params, renders the feature's
   view inside `DashboardLayout`, and little else. Logic, state and markup go in
   `features/<domain>`. Many existing pages are still large; slim each one when
   it is integrated with the backend, and do not add new logic to them meanwhile.
2. **Domain code lives in `features/`.** Code used by one domain goes in that
   domain's folder. Only genuinely generic code goes in `components/`, `hooks/`
   or `lib/`. Nothing outside `src/app` may import from `@/app/...` (lint error).
3. **Build UI from `components/ui`.** Before writing markup, use what exists:
   - Page: `DashboardLayout` (wraps `PageHeader`), `EmptyState`, `LoadingState`
   - Sections and details: `FormSection`, `InfoGrid`, `DetailPanel`, `StatCard`
   - Forms: `Field`, `FieldGrid`, `FormFooter`, `SubmitButton`, `CancelButton`,
     `FormError`, `inputClass`, `textareaClass`, `FormSteps`
   - Lists: `FilterBar`, `ListCard`/`ListHead`/`ListRow`, `ListPagination`,
     `ViewToggle`, `EntityCard`, `RowActions`/`RowAction`, `ListSkeleton`
   - Status and people: `StatusBadge` (pick a `tone`), `UserAvatar`, `PersonCell`
   - Actions: `actionPrimary` (one per view), `actionSecondary`, `actionDanger`,
     `NewButton`
   - Overlays: `Modal`, `useConfirm()` for confirmations, `toast` from `sonner`
4. **Colours come from theme tokens only.** Use the semantic classes defined in
   `src/app/globals.css`: `bg-surface`, `bg-surface-2`, `text-ink`, `text-muted`,
   `text-faint`, `border-line`, `bg-bright` (brand/primary), and
   `success|warning|danger|info` with their `-soft` backgrounds. Raw palette
   classes (`bg-red-500`) and hex values (`text-[#f00]`) are lint errors: they
   break dark mode. Brand orange is for the primary action and active navigation
   only; status colour is for status, not for buttons.
5. **Interactive elements carry `data-testid`.** Buttons, links, inputs and rows
   get a stable id derived from their purpose, using `testId()` from
   `components/ui/form-shell` (e.g. `data-testid={\`row-action-${testId(label)}\`}`).
   Never select elements in tests by text or class.
6. **No server code in the client.** Never import `@prisma/client`,
   or other server-only packages (lint errors). Enums the UI
   needs live in `src/types/enums.ts`, mirrored from the backend schema.
7. **No backend calls yet.** The client is not connected to a backend.
   - Screens start with empty data (`EmptyState`); loaders keep their names
     with a `// notConnected: loads …` comment saying what they will load.
   - Actions that would save something call `notConnected("Doing X")` from
     `lib/not-connected.ts`, which shows a toast. Pure UI state (modals,
     filters, navigation) still works.
   - `axios`, `fetch`, `XMLHttpRequest`, `EventSource` and `WebSocket` are
     lint errors. The backend integration adds its own API layer and lifts
     these rules for it.
8. **Access is open.** There is no sign-in, route guard or role check yet: the
   sign-in form only reports that it is not connected, every page and sidebar
   item is visible, and permission checks (`canEdit…`) return `true`. Access
   control comes back with the integration, enforced by the backend.
9. **File size.** Split a file once it passes the soft cap; never pass the hard
   cap. See `docs/REFACTOR_CONVENTIONS.md`.

## Before you finish a change

- `npm run typecheck` reports 0 errors and `npm run lint` reports 0 errors.
- Open every screen you touched, in light and dark mode.
- Keep line endings as they are (the repo's files use CRLF on Windows).
