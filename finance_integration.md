
Here’s a concise handoff you can send to the financial module team.

---

# PM system ↔ Finance module — API integration

## Authentication (all finance routes)

| Item | Value |
|------|--------|
| Header | `X-API-Key: <key>` |
| Key source | PM system provides `FINANCE_API_ACCESS_KEY` (must match on both sides) |

Requests without a valid key receive **401** with `{"error":"Invalid or missing API key"}`.

---

## Endpoints overview

| Method | Path | Purpose |
|--------|------|--------|
| **GET** | `/api/projects/finance` | List projects (finance-shaped fields) |
| **GET** | `/api/projects/finance/{projectCode}` | Single project by code (read-only) |
| **PUT** | `/api/projects/finance` | **Push updates** from finance into PM (budget, spend, status) |

**Note:** Updates are **not** sent to `/api/projects/finance/{projectCode}`. That path is **GET only**. To write data, use **PUT** on `/api/projects/finance`.

---

## GET `/api/projects/finance` — sync / bulk read

**Query parameters (optional):**

- `include_archived=true` — include archived projects  
- `archived_only=true` — only archived  
- `status=<internal status>` — e.g. `approved`, `execution` (PM internal status string)

**Response (conceptual):** `projects[]`, `count`, `timestamp`, `source: "PM_SYSTEM"`.

Each project includes fields such as: `companyId`, `projectCode`, `projectName`, `externalSystemId` (`PM_<id>`), `status` (finance enum), dates, `totalBudget`, `allocatedBudget`, `actualSpent`, `projectManager`, `department`, `isActive`.

---

## GET `/api/projects/finance/{projectCode}` — single project read

**Path:** `projectCode` = PM’s unique project code (e.g. `PROJ-2026-001`).

**Response:** `project` object (finance format), `timestamp`, `source: "PM_SYSTEM"`.

**404** if the code does not exist.

---

## PUT `/api/projects/finance` — financial module updates PM

Use this to **update** PM project records from the finance system.

**Headers:** `Content-Type: application/json`, `X-API-Key: <key>`

**Body (JSON):**

| Field | Required | Description |
|--------|----------|-------------|
| `projectCode` | **Yes** | PM project identifier |
| `totalBudget` | No | Maps to PM **planned budget** |
| `allocatedBudget` | No | Maps to PM **allocated cost** |
| `actualSpent` | No | Maps to PM **actual cost** |
| `status` | No | Finance lifecycle status (see enum below) |

Omitted optional fields are left unchanged. Numbers must be **≥ 0**.

**Finance `status` values (when sending):**  
`PLANNING` | `EXECUTION` | `COMPLETED` | `ON_HOLD`

**Success (200):** Message, `project` summary (including mapped `status`), `updatedAt`, `source: "FINANCE_SYSTEM"`.

**Errors:** `400` (validation, bad status), `404` (unknown `projectCode`), `500` (server error).

---

## Status mapping (finance → PM internal)

When you **PUT** a `status`, PM stores internal values roughly as:

| Finance (request) | PM internal |
|-------------------|-------------|
| `PLANNING` | `planning` |
| `EXECUTION` | `execution` |
| `COMPLETED` | `completed` |
| `ON_HOLD` | `on_hold` |

When you **GET**, PM maps internal statuses **to** the same four finance labels for display in your payloads.

---

## Field mapping summary (PUT)

| Finance body field | PM database field |
|--------------------|-------------------|
| `totalBudget` | Planned budget amount |
| `allocatedBudget` | Allocated cost |
| `actualSpent` | Actual cost |

---

## Operational notes

1. **Id / correlation:** `externalSystemId` in responses is `PM_<project_id>` — useful to tie systems together.  
2. **Company ID:** Responses may include a fixed `companyId` string for your integration contract.  
3. **Read vs write:** Use **GET** routes to pull PM state; use **PUT** `/api/projects/finance` **only** to push budget/spend/status updates into PM.

---