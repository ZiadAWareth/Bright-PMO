# Call App API (`integration.appApi`)

Calls one of **this app's own** endpoints — e.g. `POST /api/opportunity` to create
an opportunity with its real business logic (guards, workflow triggers), unlike the
raw `data.*` pulses which write straight to the repo. The endpoint is picked from
the **OpenAPI catalog** (`/workflow/pulses/api-catalog`), so the designer offers a
searchable list of every callable route; the body is mapped from previous steps.

- **Config:** `endpoint` (picked, stored as "METHOD /path"), `body`, `query`, `as`.
- **Outputs:** `status`, response under `as`. **Errors:** `ApiError` (non-2xx).
