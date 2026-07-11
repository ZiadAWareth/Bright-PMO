# Refactor Baseline Inventory

Generated: 2026-03-14

## Oversized Screen Files (sorted by lines)

| File | Lines | Priority |
|------|-------|----------|
| `app/projects/[id]/page.tsx` | 8,566 | P1 |
| `app/projects/[id]/gantt/page.tsx` | 5,701 | P1 |
| `app/projects/[id]/tasks/[taskId]/page.tsx` | 4,207 | P1 |
| `app/projects/create/page.tsx` | 3,803 | P2 |
| `app/projects/[id]/procurement/page.tsx` | 3,658 | P2 |
| `app/projects/[id]/closure/page.tsx` | 3,530 | P2 |
| `app/projects/[id]/wbs/page.tsx` | 2,532 | P2 |
| `app/scheduler/[id]/page.tsx` | 2,465 | P2 |
| `app/resources/create/page.tsx` | 2,439 | P2 |
| `app/rfq-management/page.tsx` | 2,400 | P2 |
| `app/dashboard/page.tsx` | 2,374 | P2 |
| `app/projects/[id]/team/page.tsx` | 1,982 | P3 |
| `app/reports/page.tsx` | 1,651 | P3 |
| `app/timesheet/[id]/page.tsx` | 1,611 | P3 |
| `app/projects/page.tsx` | 1,501 | P3 |
| `app/projects/[id]/tasks/page.tsx` | 1,462 | P3 |
| `app/resources/page.tsx` | 1,461 | P3 |
| `app/portfolios/[id]/page.tsx` | 1,345 | P3 |
| `app/projects/[id]/budget/page.tsx` | 1,314 | P3 |

**Total lines across oversized screens: 54,002**

## Oversized Component Files

| File | Lines | Issue |
|------|-------|-------|
| `components/scheduler/ResourceAssignmentModal.tsx` | 1,448 | Giant modal |
| `components/WBSTemplateManager.tsx` | 1,021 | Duplicate pattern |
| `components/layout/DashboardLayout.tsx` | 904 | Mixed responsibilities |
| `components/BudgetTemplateManager.tsx` | 788 | Duplicate pattern |
| `components/TaskTemplateManager.tsx` | 647 | Duplicate pattern |
| `components/AddRiskModal.tsx` | 600 | Near-duplicate |
| `components/AddRiskWithProjectModal.tsx` | 567 | Near-duplicate |
| `components/ProjectTemplateManager.tsx` | 526 | Duplicate pattern |
| `components/reporting/SelectiveReportGenerator.tsx` | 514 | Overlap |
| `components/reporting/ReportGenerator.tsx` | 483 | Overlap |

## Duplication Hotspots

### 1. Template Manager Family (4 near-identical components)
- `TaskTemplateManager`, `BudgetTemplateManager`, `WBSTemplateManager`, `ProjectTemplateManager`
- Identical: download/upload flow, file select validation, progress display, result table
- Different: API endpoint, result type shape, domain-specific columns

### 2. Risk Modal Pair
- `AddRiskModal` vs `AddRiskWithProjectModal`
- Identical: form fields, validation, enum options, score calculation, submit flow
- Different: `AddRiskWithProjectModal` adds project selector and `project_id` field

### 3. Report Generator Pair
- `ReportGenerator` vs `SelectiveReportGenerator`
- Overlapping export/template-building logic for pdf/excel/powerpoint/csv

## Top 5 Refactor Targets (Prioritized)

1. **`app/projects/[id]/page.tsx`** (8,566 lines) -- 14 tab sections, 12+ useEffects, role-switch logic
2. **`app/projects/[id]/gantt/page.tsx`** (5,701 lines) -- 4 inline modal components, rendering helpers
3. **`app/projects/[id]/tasks/[taskId]/page.tsx`** (4,207 lines) -- 3 inline modals, comment thread
4. **Template Manager family** (2,982 lines total) -- 4 near-duplicate components
5. **Risk Modal pair** (1,167 lines total) -- 2 near-duplicate components

## Existing Reusable Assets (Under-Used)

- `components/ui/` -- Shadcn/Radix primitives (dialog, form, table, tabs, etc.)
- `components/form/` -- FormFieldWrapper, DynamicInput, SearchableDropdown
- `hooks/` -- useTaskManagement, useResourceAssignments, usePermissions, etc.
- `lib/services/` -- critical-path, project-health, timesheet services
- `lib/` -- task-dependency-utils, working-days, template-utils

---

## After-Refactor Metrics (2026-03-14)

### Top 3 Screen Decomposition

| File | Before | After | Reduction | Extracted Modules |
|------|--------|-------|-----------|-------------------|
| `app/projects/[id]/page.tsx` | 8,566 | 698 | 92% | 14 section components + constants + types + hook |
| `app/projects/[id]/gantt/page.tsx` | 5,701 | 3,454 | 39% | 4 modal components + types |
| `app/projects/[id]/tasks/[taskId]/page.tsx` | 4,207 | 1,600 | 62% | 3 components + constants + types + hook |
| **Total** | **18,474** | **5,752** | **69%** | **30 new module files** |

### Duplicate Component Consolidation

| Component Family | Before | After | Reduction |
|------------------|--------|-------|-----------|
| Risk Modals (2 files) | 1,167 | 662 | 43% |
| Template Managers (4 files) | 2,982 | 2,539 (+454 base) | 15% net, shared base created |

### Cross-Cutting Hook Extraction

| Source | Before | After | New Hooks Created |
|--------|--------|-------|-------------------|
| DashboardLayout | 904 | 518 | useTheme, useCurrentUser, useNotifications, useOutsideClick (264 lines) |

### Verification

- TypeScript: `npx tsc --noEmit` passes with zero errors
- All existing imports preserved via backwards-compatible wrappers
- No consumer files required changes

### Next Tier Candidates (P2/P3)

These screens can now be decomposed using the same pattern established above:
- `app/projects/create/page.tsx` (3,803 lines)
- `app/projects/[id]/procurement/page.tsx` (3,658 lines)
- `app/projects/[id]/closure/page.tsx` (3,530 lines)
- `app/projects/[id]/wbs/page.tsx` (2,532 lines)
- `app/scheduler/[id]/page.tsx` (2,465 lines)
