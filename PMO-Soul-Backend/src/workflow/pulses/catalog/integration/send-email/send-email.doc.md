# Send Email (`integration.sendEmail`)

Sends an email through the injected mail service. Acts as an **email connector**:
you may supply your own SMTP connection (host/port/user/password/TLS), and any field
you leave blank **falls back to the system SMTP** (the app's `.env` variables). A
per-send override never changes the global config.

- **Config:** `to` (required), `subject` (required), `body` (HTML), `cc`, `bcc`,
  `from`, and the optional SMTP connector fields.
- **Outputs:** `sent`, `to`. **Errors:** `MissingRecipient`, `MailUnavailable`.
