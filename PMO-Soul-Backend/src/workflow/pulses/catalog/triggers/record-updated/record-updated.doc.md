# On Record Updated (`trigger.recordUpdated`)

Starts when a record of the chosen entity is updated — the pulse-engine equivalent
of the legacy "On Update" trigger. Optionally narrowed to specific fields via
`watchFields` (blank = any change), mirroring the legacy watched-fields behaviour.

- **Config:** `entity` (required), `watchFields` (comma-separated, optional).
- **Outputs:** `record`, `changedFields`.
