# Call Workflow

Runs another workflow as a step of this one.

Use it to keep shared logic in one place. If several processes all need to
"notify the owner, then write an audit entry", build that once and call it —
rather than copying the same three nodes into every workflow and having to change
them all later.

**Pass through** hands values down to the called workflow. Leave it empty to pass
everything this workflow currently has.

**If it fails** decides whether a failure downstream stops this workflow too.
Choose *Carry on* for optional side-work such as notifications.

The result is stored under **Store result as**, so later steps can read
`{{subWorkflow.status}}`.

Nesting is limited to 5 levels; beyond that the step fails with a clear error
rather than looping.
