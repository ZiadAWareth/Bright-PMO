# Set Variable (`data.setVariable`)

Assigns a value to a named workflow variable. The value may be a literal or a
`{{variable}}` reference (resolved by the wrapper before the executor runs). Raises
`MissingVariableName` if no name is configured.

- **Config:** `name` (required), `value`.
- **Outputs:** the value, written under `name`.
