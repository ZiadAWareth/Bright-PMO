# Wait / Delay (`time.wait`)

Pauses the workflow, then resumes it. Three modes; the designer shows only the chosen mode's
settings:

- **For an amount of time** — `amount` + `unit` (seconds … weeks).
- **Until a date and time** — `until`: picked on a calendar, or a date dragged in from an earlier
  step (e.g. `{{record.dueDate}}`). A time already past continues at once.
- **Until a record meets conditions** — `entity` + `recordId` (default: the record the run
  started with) + `rules` / `logic` (the same field · operator · value rows as the record
  triggers). About every 30 s the clock re-reads that record **from the database**, inside the
  run's organization, and continues when the conditions hold — so a change made by a person,
  another workflow or the API is seen. The record as it is then is written under `as`
  (default `watchedRecord`), e.g. `{{watchedRecord.status}}`.
  A deadline is mandatory: `giveUpAfter` + `giveUpUnit` (default 1 day). When it passes,
  `onTimeout` decides: stop the run (default — it shows in Runs & Incidents), take a `timeout`
  path (opt-in, for a reminder / escalation / closing the request; only then does the step get
  that outlet), or carry on as if met. A record that is deleted while waited on fails the run
  with that reason.

The pause is durable: the interpreter writes a `WorkflowTimer` row and parks the run; the
workflow clock (a database sweep every 30 s, `WORKFLOW_CLOCK_SWEEP_MS`) fires it. A restart or
a second replica changes nothing — the row is claimed with a compare-and-set before the run is
resumed, and the resume runs under the run's own tenant. Resolution is the sweep interval, so
"wait 10 seconds" resumes within ~30 s.

- **Test step / Test flow:** the wait runs exactly as live, in-process instead of parked — the full
  time; or, on a record, re-read every `TEST_POLL_MS` (5 s) until it meets the conditions, is
  deleted, or the deadline passes (then the timeout path / carry on / fail, as configured). The step
  shows as waiting with a countdown and a **Skip** button (carry on now, as if the wait were done);
  **Stop** — or leaving the editor — ends the test there.
- **Older workflows:** a condition saved as a `{{expression}}` (`condition`, `timeoutHours`)
  keeps running as before; it is no longer offered.
- **Identity:** nobody resumes a timer, so the continuation has no acting user. An AI Agent step
  after a wait needs "Run as" set, or it fails with `NoActingUser`.
