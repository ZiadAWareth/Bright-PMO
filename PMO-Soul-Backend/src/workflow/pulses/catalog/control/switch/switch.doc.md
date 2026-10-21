# Switch / Router (`control.switch`)

Routes to the branch of the first case whose `equals` matches the configured
`value`; if none match, routes to the mandatory `default`. Same evaluator family
as the exclusive gateway — different config shape (value + case map vs. ordered
conditions).

- **Config:** `value` (required), `cases` (`[{ equals, branch }]`), `default` (required).
- **Signal:** `branch`.
