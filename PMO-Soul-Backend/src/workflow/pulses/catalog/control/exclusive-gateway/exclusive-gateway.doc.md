# Exclusive Gateway / XOR (`control.exclusiveGateway`)

Evaluates branch conditions **in declared order** and activates the **first true**
branch only, emitting its label as the routing `branch`. If no condition is true,
it emits the **mandatory default** branch. Conditions are evaluated against the run's
variables at the gateway itself, so a value that is missing (an unanswered form field) simply
fails its comparison and the default branch is taken. A condition that is not a valid
expression at all is a design error and fails the run with a message naming it.

- **Config:** `cases` (ordered `[{ when, branch }]`), `default` (required).
- **Signal:** `branch` — the label of the outgoing edge to follow.
