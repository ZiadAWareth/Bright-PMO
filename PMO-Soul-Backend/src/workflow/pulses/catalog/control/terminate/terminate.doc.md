# Terminate All (`control.terminate`)

Ends the entire workflow instance immediately, stopping every active branch — not
just the current path. Can end as **Success** or **Error** (with a name). The
interpreter returns from the token walk on the `end` signal, abandoning any queued
branches.

- **Config:** `status` (success/error), `errorName` (when ending as error).
- **Signal:** `end`.
