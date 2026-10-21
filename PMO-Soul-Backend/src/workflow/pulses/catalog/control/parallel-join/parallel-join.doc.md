# Parallel Join / AND (`control.parallelJoin`)

Waits for a token on **every** incoming edge, then continues **once** — the join
half of a fork/join. Handled at the interpreter level (`meta.join = 'and'`); the
arrival count survives a pause/resume. Pair with a **Parallel Split (AND)**.

- **Config:** none.
- **Behaviour:** fires once when all incoming branches have arrived.
