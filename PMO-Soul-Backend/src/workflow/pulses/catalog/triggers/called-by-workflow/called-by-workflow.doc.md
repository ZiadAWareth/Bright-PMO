# When Called by Another Workflow (`trigger.calledByWorkflow`)

The start of a workflow that other workflows call — n8n's "When Executed by Another Workflow".
It never fires on its own: a **Call Workflow** step in another workflow runs it and gets its result
back. Put shared logic here ("notify the owner and log an audit entry") once, and call it from
every workflow that needs it.

## Workflow inputs

The one setting: the inputs callers fill, each with a name and a type — `any`, `string`, `number`,
`boolean`, `array` or `object`. Edit them as **Fields** (a row per input) or as **JSON** (an example
object: each key is an input, typed from its value — `1` number, `"x"` string, `true` boolean, `[]`
array, `{}` object, `null` any). Both views are the same list, and the Input pane's sample follows it.

The workflow receives **exactly** these inputs: anything else the caller passes is dropped, and an
input it leaves out arrives as `null`. A value of the wrong type stops the call with a message
naming the input — unless the calling step turned on **Attempt to convert types** (`"42"` → `42`,
`"true"` → `true`, JSON text → list or object).

## What the steps read

Everything arrives under `input`: `{{input.loanId}}`, `{{input.reason}}`.

## Calling it

In the calling workflow, a **Call Workflow** step picks this workflow and shows one box per
declared input. A called workflow does **not** need to be active. Its result returns to the caller
under the step's "Store result as" name (`{{subWorkflow.status}}`, and the called workflow's data).

## Testing it on its own

The Input pane offers the last real call's input, or a sample you type (starting with an empty
value of each declared input, updated as the inputs change), exactly like a webhook's example body.
