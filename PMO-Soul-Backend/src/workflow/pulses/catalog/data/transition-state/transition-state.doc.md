# Transition State (`data.transitionState`)

Moves a record's state field (default `status`) to a target value, enforcing the
configured legal transitions. Emits `IllegalTransition` for a disallowed move and
`NotFound` if the record is missing. With no transitions configured, any move is
permitted.

- **Config:** `entity`, `id`, `to` (required), `stateField`, `transitions`.
- **Outputs:** `record`.
