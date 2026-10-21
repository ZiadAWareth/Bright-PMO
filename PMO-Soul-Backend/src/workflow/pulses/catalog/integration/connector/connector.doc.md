# Connector (`integration.connector`)

Runs one action of an enabled connector — Gmail, Google Sheets, Oracle Database, Oracle Fusion Cloud
ERP, SAP Ariba, NetSuite, SQL Server — with one of the app's connections (Connections page).

- **Config:** `connector`, `action`, `connection` (an id, never a secret), `props` (inputs; templates
  allowed), `saveAs` (default `connectorResult`).
- **Enabled per app** in Soul → Generation → Connectors; a connector that is not enabled is refused by name.
- **Test step / Test flow** run the action for real, like a live run (as in n8n / Activepieces).
- **Errors:** NotAvailable, MissingConfig, NotEnabled, NotInstalled, UnknownAction, MissingValue,
  WrongConnection, NotFound, NotSupported (the action needs files / store), Timeout (60 s), OutputTooLarge.
