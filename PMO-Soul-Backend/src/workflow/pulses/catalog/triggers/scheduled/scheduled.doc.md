# Scheduled (`trigger.scheduled`)

Starts the workflow on a cron schedule. Hosted by the workflow clock
(`workflow-clock.service.ts`): every sweep it reconciles a `WorkflowSchedule` row per ACTIVE
workflow carrying this trigger, and starts the ones whose `nextRunAt` has passed. The claim is
a compare-and-set on `nextRunAt`, so several replicas never fire the same occurrence twice, and
a missed window (the app was down) fires once when it comes back, not once per missed tick.

- **Config:** `cron` (required, 5 fields: minute hour day-of-month month day-of-week; lists,
  ranges, steps and jan/mon names accepted), `timezone` (IANA name, default UTC).
- **Validated at activation:** a cron that does not parse, an unknown time zone, or an
  expression that never fires is refused with the reason. The schedule takes effect within one
  sweep (30 s) of activation and stops within one sweep of deactivation.
- **Outputs:** `firedAt` (ISO), `cron`, `timezone`.
- **Identity:** no person starts a scheduled run. It runs under the workflow's own tenant
  (`organizationId`), so every row it writes is scoped, but it has no acting user: an AI Agent
  step in it fails with `NoActingUser` unless "Run as" is set on that step. App API calls fall
  back to the tenant's admin principal as before.
- **Not entity-bound:** the trigger does not use the workflow's entity; the run's variables
  are just the three outputs above (also under `record`).
