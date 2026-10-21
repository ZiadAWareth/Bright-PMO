# Update Record (`data.updateRecord`)

Updates a record by id. When `expectedVersion` is provided it enforces optimistic
concurrency — emitting `OptimisticLockConflict` if the record changed underneath —
and bumps `version`. Without it, a plain update.

- **Config:** `entity`, `id` (required), `data`, `expectedVersion` (optional).
- **Outputs:** `record`.
