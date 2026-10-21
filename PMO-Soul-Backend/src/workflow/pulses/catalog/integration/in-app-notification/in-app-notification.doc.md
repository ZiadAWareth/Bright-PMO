# Send In-App Notification (`integration.inAppNotification`)

Emits an in-app notification. This pulse is **only the emit side**: via the `notify`
service port it publishes the message onto the app's notification queue (BullMQ on Redis).
The app already owns the **websocket + the queue listener** that delivers it to the
recipient live — so nothing about delivery lives here.

- **Config:** `to` (user/role, blank = owner), `title` (required), `message`
  (required), `level`, `entity` + `entityId` (optional deep-link).
- **Outputs:** `queued`. **Errors:** `MissingTitle`, `NotifyUnavailable`.
