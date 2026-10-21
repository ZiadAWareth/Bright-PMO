# AI Agent (`ai.agent`)

Asks one of this app's configured agents a question, and puts its answer on the workflow as a
variable a later step can branch on.

## What an agent is

A row on the **Agents** page, not a piece of code: a name, a job description, the entities and
tools it may use, a model, and — importantly — an **output schema**. This one node runs any of
them. Adding an agent never needs a new node type.

## Permissions — the part worth reading

An agent can only ever see **less** than one named person can. It never gets its own access.

| How the workflow started | Who the agent acts as |
|---|---|
| A record was created / updated / deleted | The person who made that change |
| A schedule or a webhook | The user named in **Run as** |
| A schedule or a webhook, with **Run as** blank | **The step fails** (`NoActingUser`) |

The last row is deliberate. The agent's own entity list is a *ceiling* — "never more than this" —
and using it as the answer to "what may this run read?" would silently turn it into a *grant*.
A scheduled agent would then read things nobody approved, and nothing would say so. Failing is
the honest outcome, and the fix is one field.

## Reading and writing

The agent is **read-only**. It can look at data and reason about it; it cannot change anything.
When a workflow should act on what the agent found, the *workflow* acts: branch on the agent's
result and use the Create / Update / Send Email steps, which are already audited and already
obey the same permissions.

## Output

One variable (named by **Store result as**, default `agent`):

```
{
  answer:    "Three tickets are overdue, all from the Acme account.",
  result:    { "severity": "high", "count": 3 },   // when the agent declares an output schema
  toolsUsed: ["describe_app", "query_data"]
}
```

**Answer shape (this step)** — an optional JSON schema on the step. When set, it replaces the
agent's own output schema for this call only, so one agent can answer a triage step with
`{ severity }` and a summary step with `{ headline, bullets }`. Leave it empty to use the schema
from the Agents page. The answer is checked against whichever schema applied (`AgentOutputInvalid`
otherwise).

The step also leaves `usage` on its output — `{ calls, inputTokens, outputTokens }` — which the
Test dialog and the run detail sum into one AI cost line per run.

Branch on `result`, never on `answer`. `answer` is a sentence, and the next model version will
word it differently; `result` is a typed object the agent was required to produce.

**On parallel branches, give every agent its own Store result as name.** A run keeps one flat set of
variables — there is no per-branch scope — so two agents both left on the default `agent` write the
same variable and only the last to finish survives. Nothing fails: the run completes, and a later
step reads one branch's answer believing it has all of them. Saving is blocked when this is
detected, because the moment of editing is the only place the clash is visible.

## Errors you can branch on

`AgentUnavailable`, `AgentNotConfigured`, `AgentNotFound`, `AgentHasNoTools`, `NoActingUser`,
`AgentOutputInvalid`, `AgentBudgetExhausted`, `MissingAgent`, `MissingTask`.

Draw an `error` edge from the step to catch them. On that branch the run carries
`{{error.name}}`, `{{error.message}}` and `{{error.nodeId}}`, so one gateway can send
`AgentBudgetExhausted` to a person and `AgentNotConfigured` to an operator.

A provider timeout or a database fault is **not** in this list. Those are real faults. They still
take the `error` edge when one is drawn (with the fault's own name), and fail the run when none is;
the step's retry policy runs first, because a transient outage should not look like a decision
the agent made.

## Cost

Every run spends tokens, and an agent inside a **For Each** spends them once per item.

**Per call**, three ceilings apply and the smallest wins: this step's *Max model calls*, the
agent's own limit, and a hard engine cap of 8. Set the step's limit when the task is simple —
most questions are answered in two or three calls.

**Per run**, there is one more ceiling, and it is the one that actually bounds the bill: a single
allowance shared by every agent step in the run, including those inside loops and inside
sub-workflows. It defaults to **25 agent calls** and **200,000 tokens**, and an operator can change
it with `AGENT_RUN_MAX_CALLS` / `AGENT_RUN_MAX_TOKENS`.

When it runs out, the step fails with `AgentBudgetExhausted` and no request is sent. Retrying that
step cannot help — the allowance belongs to the run, not the step — so the branch worth drawing is
one that hands the remaining work to a person.

Why both: the per-call caps limit how *deeply* one agent thinks, and nothing about them limits how
*often* it is asked. An agent in a loop over 500 records is 500 calls, each of them individually
within every per-call limit.
