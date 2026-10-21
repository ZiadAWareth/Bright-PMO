# Manual Start (`trigger.manualStart`)

Begins a workflow instance when a user launches it from a **record** or a **list
view**. It is a start marker: the interpreter starts the token here and the trigger
subsystem seeds the instance with the selected record (exposed as the `record`
variable). Its executor validates that a record is present when the start source is
a record, raising the `NoTriggerRecord` business error otherwise.

- **Config:** start source (record | list view), entity.
- **Outputs:** `record` — the triggering record.
