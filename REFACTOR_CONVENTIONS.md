# Screen Decomposition Conventions

## File Size Guardrails

| File Type | Soft Cap | Hard Cap |
|-----------|----------|----------|
| Route `page.tsx` | 300 lines | 500 lines |
| Feature section component | 250 lines | 400 lines |
| Modal component | 200 lines | 350 lines |
| Custom hook | 150 lines | 250 lines |
| Types / constants file | No limit | -- |

## Folder Structure for Route Screens

Each route screen that exceeds the soft cap should be decomposed into co-located modules
using underscore-prefixed directories (Next.js App Router ignores these for routing):

```
app/projects/[id]/
  page.tsx                    # Thin orchestrator: imports, composes, passes props
  _components/
    types.ts                  # All interfaces/types for this screen
    constants.ts              # Enums, option arrays, color maps, config
    OverviewSection.tsx       # One file per logical tab/section
    TasksSection.tsx
    BudgetSection.tsx
    ...
  _hooks/
    useProjectData.ts         # Data fetching, state management
    useProjectPermissions.ts  # Role/access logic
    ...
  _modals/
    EditProjectModal.tsx      # One file per dialog/modal
    ApprovalModal.tsx
    ...
```

## Naming Conventions

- Section components: `{TabName}Section.tsx` (e.g., `OverviewSection.tsx`)
- Modal components: `{Feature}Modal.tsx` (e.g., `EditProjectModal.tsx`)
- Hooks: `use{Domain}{Action}.ts` (e.g., `useProjectData.ts`)
- Types: `types.ts` (one per screen, or shared in `@/types/`)
- Constants: `constants.ts` (one per screen)

## Extraction Rules

1. **Types first**: Move all interfaces/types to `_components/types.ts`.
2. **Constants next**: Move enum option arrays, color maps, static config to `_components/constants.ts`.
3. **Hooks**: Extract `useEffect` chains and related state into domain hooks under `_hooks/`.
4. **Modals**: Move each inline modal component to its own file under `_modals/`.
5. **Sections**: Move each tab/section render block to its own component under `_components/`.
6. **Page last**: Rewrite `page.tsx` as a thin orchestrator that imports and composes.

## Shared Component Reuse

Before creating new UI:
- Check `components/ui/` for Shadcn primitives (Dialog, Table, Tabs, Form, etc.)
- Check `components/form/` for form abstractions (FormFieldWrapper, DynamicInput, SearchableDropdown)
- Check `hooks/` for existing data hooks (useTaskManagement, usePermissions, etc.)
- Check `lib/services/` for business logic (critical-path, project-health, etc.)

## Duplicate Prevention

When building a new component that resembles an existing one:
- Create a shared base with configuration props instead of copying
- Use the adapter pattern: base component + domain-specific wrapper
- Example: `TemplateManagerBase` + `TaskTemplateManager` wrapper
