# Pulses — the workflow engine node library

**Pulses** is the successor to the legacy workflow "nodes". It is being built
**make-before-break**: it runs on its **own parallel interpreter** and touches
none of the legacy engine (`src/workflow/interpreter`, `src/workflow/actions`).
Existing workflows keep running on the old engine; we migrate onto Pulses later,
upon success.

## Why

The legacy engine has three problems this library fixes:

1. **Leaked business logic** — generic primitives and CRM domain ops share one
   giant `switch` in `action-executor-logic.ts` (`convertLead`, `createSalesOrder`
   sit next to `mutateData`). In Pulses, generic primitives stay business-agnostic
   and CRM behaviour lives in dedicated `domain/*` pulses.
2. **Monolithic configurator** — one big `NodeInspector` renders every node's
   properties. In Pulses, each pulse declares its config as data, and the designer
   renders it generically.
3. **No I/O contract & no shared wrapper** — nodes declared no inputs/outputs, and
   retry/timeout/onError were reinvented per node. Pulses declare I/O, and all
   cross-cutting concerns live in one wrapper.

## The Pulse contract

Each pulse = **declarative properties** + a **dedicated pure executor**:

- `meta` — namespaced `type` (e.g. `data.createRecord`), category, async policy…
- `config` — `PulseFieldDescriptor[]`: the configurator (also drives the designer)
- `io` — declared inputs/outputs (visible in the designer)
- `execute(inputs, ctx) -> PulseResult` — **pure**: no retry, no logging, no
  variable mutation. It returns outputs and control **signals**
  (`branch` / `wait` / `error` / `end`).
- `meta.branches` / `meta.dynamicBranches` — the labels the node routes on, so the
  designer draws one handle per outcome and the save validator checks each is wired
  (`core/branches.ts`). Any node may also have an `error` edge: a business error or a
  technical failure follows it with `{{error.name}}`, `{{error.message}}` and
  `{{error.nodeId}}` set; with no `error` edge the run fails.

Cross-cutting concerns (condition gate, input/output mapping, retry, timeout,
onError, idempotency) live in `run-pulse.ts`, never in a pulse.

## Folder layout

```
pulses/
├── core/                    # engine foundation (this commit) — written once
│   ├── pulse.contract.ts    # Pulse, PulseContext, PulseResult, services, I/O, meta
│   ├── graph.ts             # the {nodes, edges} shape the engine walks (parallel-owned)
│   ├── define-pulse.ts      # definePulse() — validates + freezes a pulse
│   ├── pulse-registry.ts    # register / lookup by type / serialize designer manifest
│   ├── run-pulse.ts         # the wrapper (cross-cutting concerns)
│   ├── pulse-interpreter.ts # the parallel token-walker (trigger → walk → pause/resume)
│   ├── run-store.ts         # persistence port + in-memory impl (Prisma impl at migration)
│   ├── expression.ts        # minimal, pluggable expression/template evaluator
│   ├── scope.ts             # scope model for boundary attachment (Decision 2)
│   └── *.spec.ts            # engine-level tests (walking skeleton, wrapper edge cases)
└── catalog/                 # the pulses themselves (Wave 1+), 5 files each:
    └── <category>/<pulse-name>/
        ├── <pulse-name>.pulse.ts      # meta + config + io (declarative)
        ├── <pulse-name>.executor.ts   # execute(inputs, ctx) → outputs (dedicated)
        ├── <pulse-name>.doc.md        # one-paragraph explanation
        ├── <pulse-name>.spec.ts       # unit + edge-case tests
        └── index.ts                   # definePulse({ ...pulse, execute })
```

## Status

- **Foundation (this commit):** contract, wrapper, registry, parallel interpreter,
  run-store port, expression helper, scope model — all unit-tested and DB-free.
  Nothing is wired into live workflow execution yet; the library is inert.
- **Next — Wave 1 (walking skeleton pulses):** manual-start, set-variable,
  expression-evaluate, exclusive-gateway (XOR), log, end-success, end-error.
- Then Waves 2–7 per the build plan.

## Step 0 decisions (locked)

1. **Async default:** off by default; force-on for integration/comms/script/human,
   modelled as `meta.async` and enforced by the wrapper/host.
2. **Boundary scope:** scopes modelled from day one (`scopeId`); designer exposes
   node-level attachment only.
3. **Queue substrate:** **BullMQ** (already in the stack) — no RabbitMQ.
