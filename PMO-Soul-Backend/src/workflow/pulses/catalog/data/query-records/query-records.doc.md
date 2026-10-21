# Query Records (`data.queryRecords`)

Returns a filtered, sorted, paginated **collection** of records plus the total
matching count. This is the prerequisite for the loop pulses in Wave 3.

- **Config:** `entity` (required), `where`, `orderBy`, `page`, `pageSize` (0 = all).
- **Outputs:** `records`, `total`, `page`, `pageSize`.
