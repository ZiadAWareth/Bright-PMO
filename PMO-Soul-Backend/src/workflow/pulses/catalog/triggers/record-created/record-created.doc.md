# On Record Created (`trigger.recordCreated`)

Starts the workflow when a record of the chosen entity is created — the pulse-engine
equivalent of the legacy "On Create" trigger. A start marker: the trigger subsystem
seeds the instance with the new `record`.

- **Config:** `entity` (required).
- **Outputs:** `record`.
