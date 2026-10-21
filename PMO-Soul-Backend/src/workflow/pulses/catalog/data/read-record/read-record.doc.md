# Read Record (`data.readRecord`)

Loads a single record of an entity by `id` (or a `where` filter). Emits `NotFound`
when nothing matches. Arguably Query with limit 1 — kept as its own palette entry
for clarity.

- **Config:** `entity` (required), `id` or `where`.
- **Outputs:** `record`.
