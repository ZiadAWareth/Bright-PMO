# On Record Deleted (`trigger.recordDeleted`)

Starts when a record of the chosen entity is deleted — the pulse-engine equivalent
of the legacy "On Delete" trigger. A start marker seeded with the deleted `record`.

- **Config:** `entity` (required).
- **Outputs:** `record`.
