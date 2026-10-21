# Log / Audit Entry (`control.log`)

Writes a message (with `{{variables}}` resolved) to the workflow's log/audit sink
at a chosen level. It is the primary debugging tool for a flow and the sink every
later wave's execution listeners also use. Side-effecting but replay-safe.

- **Config:** `level` (debug/info/warn/error), `message` (required).
- **Outputs:** none.
