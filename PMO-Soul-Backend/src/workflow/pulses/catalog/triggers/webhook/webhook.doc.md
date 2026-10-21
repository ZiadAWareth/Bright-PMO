# On Webhook (`trigger.webhook`)

Starts the workflow from an inbound HTTP call to `/api/webhooks/<path>`, served by
`webhook.controller.ts`. The endpoint is **public** (no login): the caller proves itself with
the trigger's `secret`, sent as the `x-webhook-secret` header (or `?secret=` when headers
cannot be set) and compared in constant time. A wrong secret is 401; an unknown path is 404; a
different method than configured is 405. The run starts under the workflow's own tenant and the
response (`202 { runId, status }`) is sent once the run has finished or parked.

- **Config:** `path` (required, one URL segment: letters, digits, dots, dashes, underscores —
  unique among ACTIVE workflows, enforced at activation), `method` (POST default, GET or PUT),
  `secret` (optional but recommended; without it the URL is open to anyone who knows it).
- **Outputs / variables:** `payload` (parsed body), `headers` (lower-cased; `authorization`,
  `cookie` and the secret header removed), `query` (minus `secret`), `method`.
- **Limits:** the body is subject to the app's body parser limit (Express default 100 kb).
- **Identity:** no person starts a webhook run — an AI Agent step needs "Run as" set or it
  fails with `NoActingUser`.
