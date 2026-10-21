# Evaluate Expression (`control.evaluate`)

Evaluates a boolean expression against the workflow variables and stores the
boolean result under a chosen variable (default `result`). A malformed expression
throws (it is a misconfiguration, never a silent `true`).

- **Config:** `expression` (required), `as` (output variable name).
- **Outputs:** `result` — the boolean.

## Expression language

The same evaluator drives gateways, `wait` conditions and `whileLoop`.

- **Leaves:** a bare `{{variable}}` (truthiness), `true` / `false`, or one comparison
  `<operand> <op> <operand>` with `==`, `!=`, `===`, `!==`, `>`, `>=`, `<`, `<=`.
- **Connectives:** `&&` / `and`, `||` / `or` (case-insensitive), evaluated left to
  right with short-circuit; `and` binds tighter than `or`.
- **Negation:** `!` or `not` before a `{{variable}}` or a parenthesised group.
- **Grouping:** parentheses — `({{a}} == 1 || {{b}} == 2) && {{active}}`.
- **Operands:** `{{path}}`, numbers, quoted strings, `true`/`false`/`null`, or a bare
  path. Quote any string that contains the words `and` / `or`.
- **Comparison rules:** `==`/`!=` compare numerically when both sides are numbers
  (so `"9" == 9` and `"250000" > 100000` hold), otherwise as trimmed strings.
  Ordering operators compare numbers, then ISO dates (`2026-09-22...`), then text.
  `null`/`undefined` equal `null`, differ from everything else, and are never
  greater or smaller than anything. Empty expression → `true` (no gate).
