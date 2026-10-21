# Parallel Split / AND (`control.parallelSplit`)

Activates **every** outgoing branch at once — the fork half of a fork/join. Emits
no routing signal, so the interpreter follows all outgoing edges. Reconverge the
branches with a **Parallel Join (AND)**.

- **Config:** none.
- **Signal:** none (all outgoing edges are followed).

## Branches share one set of variables

There is no per-branch scope. Every step in a run writes into the same variables, so **two steps on
different branches must not use the same "Store result as" name** — both write the same key, only the
last to finish survives, and the run still reports success. A later step then reads one branch's
result believing it has all of them.

The default names are where this happens by accident: three **AI Agent** steps all arrive as
`agent`, two **Read Record** steps both as `record`. Nobody typed a name, so there is nothing on
screen to suggest a clash. Saving is blocked when it is detected.
