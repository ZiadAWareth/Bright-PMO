# Delete Record

Removes a record from an entity.

**Hard delete** removes the row. **Soft delete** sets `deletedAt` instead, keeping
the row for audit or recovery — the entity must have a `deletedAt` field.

Set **If not found** to *Continue* for cleanup flows that may run twice, and to
*Fail the step* where the record's absence is itself a problem.

Outputs `deleted` — the record as it was before removal.
