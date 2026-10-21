# Validate (`control.validate`)

Asserts a condition and raises a **named, catchable** business error when it fails
— routable to an error boundary event (Wave 4). A passing validation leaves
variables untouched. **Replaces the legacy Validate stub**, which did nothing.

- **Config:** `condition` (required), `errorName`, `message`.
- **Signal:** on failure, `error { name, message }`; on pass, nothing changes.
