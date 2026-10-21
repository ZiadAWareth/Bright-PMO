# For Each — sequential (`control.forEach`)

Iterates a collection, running the body once per item and exposing `item` and
`index` each pass. Wire it with a `body` edge (to the loop body) and a `done` edge
(after the loop); the body's last node loops back to this node. Handled at the
interpreter level (`meta.loop = 'forEach'`); iteration state survives a
pause/resume.

- **Config:** `collection` (required), `item`, `index`, `as` (default `results`),
  `onItemError` (`fail` | `skip` | `stop`, default `fail`).
- **Edges:** `body` (each iteration) and `done` (when exhausted, or on `stop`).

## Body scope

`item` and `index` (or the names you configure) belong to the body. Whatever those
names held before the loop is restored when the loop reaches `done`, so two nested
loops on the default names do not clobber each other: after the inner loop finishes,
the outer `item` is intact again. Name the variables (`item: 'line'`) when the body
of the inner loop needs the outer item too.

## Results

When the loop finishes, `<as>` (default `results`) holds one entry per iteration,
in order:

```
{ index: 0, item: <the element>, output: <outputs of the last step that ran in the body> }
{ index: 1, item: <the element>, error: { name, message } }   // a failed item under skip/stop
```

`output` is the outputs object of the last step that completed in that pass, keyed
the way that pulse names its outputs (an `ai.agent` with `as: 'hello'` gives
`{ hello: { answer, result, toolsUsed } }`); it is `undefined` if the body ended in
a pause. The collection is read once when the loop starts. `{{results.length}}` is the iteration count. Nested loops that
both leave `as` at the default overwrite the same `results`; give each a name.

## When an item fails (`onItemError`)

Applies to a step in the body that fails without an error edge of its own (a
drawn error edge on the step always wins).

- `fail` (default): the run fails, as before.
- `skip`: the step is recorded as FAILED, `{ index, item, error }` is pushed into
  `<as>`, `{{error}}` is set, and the loop continues with the next item.
- `stop`: the same record is pushed and the loop ends immediately via `done`.
