import { Worker } from 'node:worker_threads';
import type { PulseExecutor } from '../../../core';

/**
 * Run JavaScript — a designer's function body, sandboxed.
 *
 * node:vm alone is NOT a security boundary: an object handed in from outside leads back to the
 * host's Function, and from there to `process`. So the layers are:
 *   1. a separate worker thread with a memory cap, killed outright past the time limit — a runaway
 *      allocation or loop ends the worker, never the app;
 *   2. inside it, an EMPTY vm context: no require, no process, no timers, no network, with string
 *      code generation (eval, new Function) switched off;
 *   3. the variables enter as JSON TEXT and are parsed INSIDE the sandbox, so every object the code
 *      can touch belongs to the sandbox — there is no host object to climb out through;
 *   4. the answer leaves as JSON text too, size-checked, and must be a plain object.
 */
export const LIMITS = {
  timeoutMs: 1000,
  killAfterMs: 1500,
  maxCodeChars: 20000,
  maxOutputChars: 64 * 1024,
  memoryMb: 64,
  // console.log is kept for the designer (Test step) and the server log: bounded, like everything else.
  maxLogLines: 50,
  maxLogChars: 500,
};

/** One console line the code wrote. */
export interface ConsoleLine {
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
}

type Outcome =
  | { ok: true; outputs: Record<string, unknown>; console: ConsoleLine[] }
  | { ok: false; error: { name: string; message: string; line?: number }; console: ConsoleLine[] };

const fail = (name: string, message: string, extra: { line?: number; console?: ConsoleLine[] } = {}): Outcome => ({
  ok: false,
  error: extra.line ? { name, message, line: extra.line } : { name, message },
  console: extra.console ?? [],
});

// Runs in the worker (CommonJS, eval'd). The program is assembled from TEXT only.
const WORKER = `
const { parentPort, workerData } = require('node:worker_threads');
const vm = require('node:vm');
const { code, json, timeoutMs, maxLogLines, maxLogChars } = workerData;
// The designer's line N is line N+1 of the program: the wrapper takes line 1 on its own.
const lineOf = (e) => {
  try {
    const m = /run-code\\.js:(\\d+)/.exec(String(e && e.stack || ''));
    const n = m ? Number(m[1]) - 1 : 0;
    return n > 0 ? n : undefined;
  } catch (_) { return undefined; }
};
let context;
try {
  context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false },
    microtaskMode: 'afterEvaluate',
  });
  // console lives INSIDE the sandbox (built from text, like everything there) and only collects
  // lines; they leave as JSON with the answer.
  const program = '"use strict";(function(){const __logs=[];'
    + 'const __fmt=function(v){if(typeof v==="string")return v;try{return JSON.stringify(v);}catch(_){return String(v);}};'
    + 'const __push=function(level){return function(){if(__logs.length>=' + maxLogLines + ')return;'
    + 'var t=Array.prototype.map.call(arguments,__fmt).join(" ");__logs.push({level:level,text:t.length>' + maxLogChars + '?t.slice(0,' + maxLogChars + ')+"…":t});};};'
    + 'const console=Object.freeze({log:__push("log"),info:__push("info"),warn:__push("warn"),error:__push("error")});'
    + 'globalThis.__logs=__logs;'
    + 'const vars=JSON.parse(' + JSON.stringify(json) + ');'
    + 'const out=(function(vars,console){\\n' + code + '\\n})(vars,console);'
    + 'if(out!==null&&typeof out==="object"&&typeof out.then==="function")throw new Error("__ASYNC__");'
    + 'return JSON.stringify({out:out===undefined?null:out,logs:__logs});})()';
  const text = new vm.Script(program, { filename: 'run-code.js' }).runInContext(context, { timeout: timeoutMs });
  parentPort.postMessage({ ok: true, text: typeof text === 'string' ? text : 'null' });
} catch (e) {
  let name = 'Error', message = 'The code failed.', logs = '[]';
  try { name = String(e && e.name || 'Error'); message = String(e && e.message || e); } catch (_) { /* a hostile error */ }
  try { logs = JSON.stringify(context && context.__logs || []); } catch (_) { logs = '[]'; }
  parentPort.postMessage({ ok: false, name, message, line: lineOf(e), logs });
}
`;

/** Run `code` (a function body over `vars`) against `variables`. Never throws. */
export function runSandboxed(code: unknown, variables: unknown, limits = LIMITS): Promise<Outcome> {
  if (typeof code !== 'string' || !code.trim()) return Promise.resolve(fail('MissingCode', 'Run JavaScript needs some code.'));
  if (code.length > limits.maxCodeChars) {
    return Promise.resolve(fail('CodeTooLong', 'The code is longer than ' + limits.maxCodeChars + ' characters.'));
  }
  let json: string;
  try {
    json = JSON.stringify(variables ?? {});
  } catch {
    return Promise.resolve(fail('VariablesNotSerialisable', 'The run\'s variables could not be handed to the code.'));
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = (outcome: Outcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(kill);
      worker.terminate().catch(() => undefined);
      resolve(outcome);
    };
    const worker = new Worker(WORKER, {
      eval: true,
      workerData: { code, json, timeoutMs: limits.timeoutMs, maxLogLines: limits.maxLogLines, maxLogChars: limits.maxLogChars },
      resourceLimits: { maxOldGenerationSizeMb: limits.memoryMb, maxYoungGenerationSizeMb: 16, codeRangeSizeMb: 16 },
    });
    // The vm timeout stops a busy loop; this stops everything else (a hostile getter, a hang).
    const kill = setTimeout(() => done(fail('Timeout', 'The code ran longer than ' + limits.timeoutMs + ' ms and was stopped.')), limits.killAfterMs);
    worker.once('message', (m: any) => {
      if (!m || !m.ok) {
        const message = String(m?.message ?? 'The code failed.');
        let logs: ConsoleLine[] = [];
        try { logs = cleanLogs(JSON.parse(String(m?.logs ?? '[]')), limits); } catch { logs = []; }
        const line = typeof m?.line === 'number' ? m.line : undefined;
        if (message === '__ASYNC__') return done(fail('AsyncNotSupported', 'Run JavaScript is synchronous: do not use async or await, return the object directly.', { console: logs }));
        if (/timed out/i.test(message)) return done(fail('Timeout', 'The code ran longer than ' + limits.timeoutMs + ' ms and was stopped.', { console: logs }));
        return done(fail('CodeFailed', String(m?.name ?? 'Error') + ': ' + message + (line ? ' (line ' + line + ')' : ''), { line, console: logs }));
      }
      const text = String(m.text ?? 'null');
      if (text.length > limits.maxOutputChars + limits.maxLogLines * (limits.maxLogChars + 40)) {
        return done(fail('OutputTooLarge', 'The code returned more than ' + Math.round(limits.maxOutputChars / 1024) + ' KB.'));
      }
      let wrapped: { out?: unknown; logs?: unknown };
      try { wrapped = JSON.parse(text); } catch { return done(fail('CodeFailed', 'The code returned something that is not data.')); }
      const logs = cleanLogs(wrapped?.logs, limits);
      const value = wrapped?.out;
      if (JSON.stringify(value ?? null).length > limits.maxOutputChars) {
        return done(fail('OutputTooLarge', 'The code returned more than ' + Math.round(limits.maxOutputChars / 1024) + ' KB.', { console: logs }));
      }
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return done(fail('NotAnObject', 'Return an object whose keys become variables, e.g. return { total: 1 };', { console: logs }));
      }
      done({ ok: true, outputs: value as Record<string, unknown>, console: logs });
    });
    worker.once('error', (err: any) => {
      done(err?.code === 'ERR_WORKER_OUT_OF_MEMORY'
        ? fail('OutOfMemory', 'The code used more than ' + limits.memoryMb + ' MB and was stopped.')
        : fail('CodeFailed', String(err?.message ?? err)));
    });
    worker.once('exit', () => done(fail('CodeFailed', 'The code stopped without an answer.')));
  });
}

/** Only well-formed, bounded lines come back from the worker. */
function cleanLogs(raw: unknown, limits = LIMITS): ConsoleLine[] {
  if (!Array.isArray(raw)) return [];
  const levels = ['log', 'info', 'warn', 'error'];
  return raw.slice(0, limits.maxLogLines).map((l: any) => ({
    level: levels.includes(l?.level) ? l.level : 'log',
    text: String(l?.text ?? '').slice(0, limits.maxLogChars + 1),
  }));
}

/** Console lines go to the run's log ("[console]"), which Test step shows in its Console. */
export const CONSOLE_PREFIX = '[console] ';

export const execute: PulseExecutor = async (inputs, ctx) => {
  const outcome = await runSandboxed(inputs.code, ctx.variables);
  for (const l of outcome.console) {
    const level = l.level === 'error' ? 'error' : l.level === 'warn' ? 'warn' : 'info';
    ctx.services?.log?.(level, CONSOLE_PREFIX + l.text);
  }
  return outcome.ok ? { outputs: outcome.outputs } : { error: outcome.error };
};
