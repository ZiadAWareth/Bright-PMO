# Throw Error (`control.throwError`)

Unconditionally raises a **named** business error — routable to the node's `error`
edge, or (once boundary events land) caught by an error boundary. Unlike Validate,
it does not assert a condition first; it always throws.

- **Config:** `errorName` (required), `message`.
- **Signal:** `error { name, message }`.
