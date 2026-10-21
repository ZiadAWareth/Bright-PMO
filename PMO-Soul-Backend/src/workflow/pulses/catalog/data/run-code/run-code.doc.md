# Run JavaScript (`data.runCode`)

Runs the body of a function over the run's variables (`vars`) and writes each key of the object it
returns as a workflow variable. For what no other step does: a calculation, a reshaping, a rule.

```js
const rate = vars.product === 'MORTGAGE' ? 0.06 : 0.11;
return { monthly: Math.round((vars.amount * (1 + rate)) / vars.tenorMonths) };
```

- **Sandboxed:** its own worker thread (64 MB), an empty context — no require, process, timers,
  network or files; eval / new Function off; data in and out as JSON only.
- **Limits:** 1 s, 20,000 characters of code, 64 KB returned. Synchronous only (no await).
- **Errors:** MissingCode, CodeTooLong, CodeFailed (with the message), Timeout, OutOfMemory,
  AsyncNotSupported, NotAnObject, OutputTooLarge.
