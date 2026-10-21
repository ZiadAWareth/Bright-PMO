# User Task

Assigns work to a person and waits for them to finish it.

Use this when a human has to *do* something and the flow continues afterwards —
data entry, a review, a triage decision, a fulfilment step. Use **Request
Approval** instead when the only outcome is approve or reject.

The run pauses durably, so it survives a restart. When the assignee completes the
task the flow continues down the `completed` branch, and anything they submitted
becomes `formData`.

Set **Due in (hours)** with **If overdue → Take the "overdue" branch** to model an
SLA: the flow takes a different path when nobody acts in time.

In a test run the task auto-completes, so "Test flow" does not hang.
