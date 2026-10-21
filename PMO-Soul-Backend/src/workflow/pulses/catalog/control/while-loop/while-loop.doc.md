# While / Until (`control.whileLoop`)

Repeats the body while a condition holds, exposing `index` each pass, bounded by a
**mandatory** `maxIterations` guard so it can never run unbounded. Wire it with a
`body` edge and a `done` edge; the body's last node loops back here. Handled at the
interpreter level (`meta.loop = 'while'`); iteration state survives a pause/resume.

- **Config:** `condition` (required), `maxIterations` (required), `index`, `as`
  (default `results`), `onItemError` (`fail` | `skip` | `stop`, default `fail`).
- **Edges:** `body` (while true & under the cap) and `done`.

The condition uses the expression language (`{{index}} < 10 && {{queue.length}} > 0`).

`index` is body-scoped: its previous value is restored on `done`. `<as>` collects
`{ index, output }` per pass (or `{ index, error }` for a pass that failed under
`skip`/`stop`), exactly as `control.forEach` does — see its doc for the shape and
the error policy.
