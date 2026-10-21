# HTTP Request (`integration.httpRequest`)

Calls an external HTTP endpoint with templated headers and body and captures the
response. Goes through the injected `http` service port, so the executor stays
free of a concrete client and is unit-testable. A 2xx status returns the response;
any other status raises a catchable `HttpError`. Always async (a network I/O
persistence point).

- **Config:** `method`, `url` (required), `headers`, `body`, `as`.
- **Outputs:** `status`, and the response body under `as`.
- **Errors:** `HttpError` (non-2xx), `HttpUnavailable`, `MissingUrl`. An `HttpError` still
  writes `status` and the server's answer under `as`, so Test step shows why it failed and an
  error branch can read it (e.g. `{{response.message}}`).
