# Frontend Conventions (PMO-Client)

How screens are structured and split. The day-to-day rules (theme tokens,
`data-testid`, which backend to call) are in `PMO-Client/AGENTS.md`.

## File Size Guardrails

| File Type | Soft Cap | Hard Cap |
|-----------|----------|----------|
| Route `page.tsx` | 150 lines | 300 lines |
| Feature view / section component | 250 lines | 400 lines |
| Modal component | 200 lines | 350 lines |
| Hook | 150 lines | 250 lines |
| `api.ts` | 200 lines | 350 lines |
| Types / constants file | No limit | -- |

Many pages written before the restructure exceed these caps. Bring each one
under the cap when it is rewired to the new backend.

## Folder Structure

Routes live in `src/app`; everything a screen is made of lives in its feature:

```
src/app/(app)/projects/[id]/page.tsx     # thin: params -> <ProjectDetailsView />

src/features/projects/
  types.ts                  # the domain's types (what the UI works with)
  api.ts                    # backend calls; maps responses into types.ts
  constants.ts              # option arrays, status -> tone maps, config
  components/
    details/
      ProjectDetailsView.tsx  # composes the sections below
      OverviewSection.tsx     # one file per tab/section
      BudgetSection.tsx
    EditProjectModal.tsx      # one file per dialog
  hooks/
    useProjectData.ts         # data loading and state
    useProjectPermissions.ts  # role/access logic
```

Sub-domains nest the same way: `features/waterfall/wbs/`,
`features/waterfall/schedule/`, and later `features/agile/board/`, etc.

Do not create `_components` or `_hooks` folders under `src/app`.

## Naming Conventions

- Views: `{Screen}View.tsx` (e.g. `ProjectDetailsView.tsx`)
- Sections: `{TabName}Section.tsx` (e.g. `OverviewSection.tsx`)
- Modals: `{Action}{Entity}Modal.tsx` (e.g. `EditProjectModal.tsx`)
- Hooks: `use{Domain}{Purpose}.ts` (e.g. `useProjectData.ts`)
- Types: `types.ts`, one per feature (sub-folders may have their own)
- Constants: `constants.ts`, one per feature

## Splitting a Large Screen

1. **Types first**: move interfaces into the feature's `types.ts`.
2. **Constants next**: option arrays, status maps and static config into
   `constants.ts`.
3. **API calls**: move fetches into `api.ts`, returning the feature's types.
4. **Hooks**: move `useEffect` chains and related state into `hooks/`.
5. **Modals**: one file each under `components/`.
6. **Sections**: one component per tab or section.
7. **Page last**: `page.tsx` becomes a thin route that renders the view.

## Reuse Before You Build

Before creating new UI or logic, check:
- `components/ui/` for primitives (the list is in `PMO-Client/AGENTS.md`)
- `components/form/` for generic form helpers (`AddEntityModal`,
  `SearchableDropdown`, `DynamicInput`)
- the feature's own `hooks/` and other features' public pieces
- `lib/` for framework helpers (`route-access`, `status-tone`, `working-days`)

## Duplicate Prevention

When a new component resembles an existing one:
- Make a shared base with configuration props instead of copying it.
- Use the adapter pattern: base component plus a domain-specific wrapper
  (e.g. `TemplateManagerBase` + `WBSTemplateManager`).
