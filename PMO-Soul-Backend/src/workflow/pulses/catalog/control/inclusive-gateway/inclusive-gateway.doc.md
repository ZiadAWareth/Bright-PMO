# Inclusive Gateway / OR (`control.inclusiveGateway`)

Activates **every** branch whose condition is true — zero, one, or many — by
emitting `branches[]`. Takes the optional default only when nothing matches.

> Reconverging an inclusive split needs an inclusive join that knows how many
> branches fired (**deferred**). For now, let OR branches end independently or
> merge at a plain node — not a strict AND join, which would wait forever.

- **Config:** `cases` (`[{ when, branch }]`), `default`.
- **Signal:** `branches` — all matching labels.
