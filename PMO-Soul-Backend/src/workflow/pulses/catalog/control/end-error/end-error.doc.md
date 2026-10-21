# End (Error) (`control.endError`)

Terminates the workflow instance with a **named** error that propagates to the
caller (and, later, is catchable by a Call-Sub-Workflow pulse). The interpreter
marks the run `FAILED` and records the error name.

- **Config:** `errorName` (required), `message`.
- **Signal:** `end` with status `error` and the error name.
