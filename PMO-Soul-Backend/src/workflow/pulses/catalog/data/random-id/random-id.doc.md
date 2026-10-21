# Generate Random ID (`data.generateId`)

Makes a unique id on the spot — the equivalent of n8n's Crypto "Generate" action. No table, no
counter, nothing to set up, so it works in every app straight away.

- **Config:**
  - `format`: `short` (default, letters and digits without look-alikes 0/O, 1/I/L — e.g.
    `7K3QX9MZ`), `uuid` (e.g. `3f2c8a1e-9b0d-4c1f-8e2a-6d5b7c9e0f12`), `number` (digits only, never
    starting with 0), or `timestamp` (UTC date-time plus a random part, e.g. `20261012-153045-K7Q2`).
  - `length`: characters in the random part, 4 to 32 (default 8). Not used for `uuid`.
  - `prefix`: put in front, e.g. `INV-` gives `INV-7K3QX9MZ`.
  - `as`: the variable later steps read (default `id`).
- **Outputs:** the id under `as`.
- **How unique:** a UUID or a long code is unique for any practical purpose. An 8-character short
  code has about 850 billion values — fine for references people read, but not a guarantee. When
  the id must never repeat, use `uuid`, or the record's own id.
- **Running numbers** (INV-0001, INV-0002…) are not made here: the record's own id already is one —
  `INV-{{record.id}}` in Map Fields or Set Variable, after Create Record. Workflows saved when this
  step was "Generate ID / Sequence" keep working and now get a random id.
