import { lazy, Suspense, useMemo, useState } from 'react';
import { X, Play, FlaskConical, Loader2, ChevronRight, ChevronDown, GripVertical, Inbox, ArrowUpRight, Wand2, Lock, Database, Settings2, GitBranch } from 'lucide-react';
import type { PulseManifestEntry, PulseFieldDescriptor, TriggerInputResult } from './workflowService';
import TriggerInputPanel, { ago } from './TriggerInputPanel';
// The JavaScript editor (CodeMirror) loads only when a Run JavaScript step is opened.
const CodeEditor = lazy(() => import('./CodeEditor'));
import { formatUsage } from './workflowService';
import type { DataStep } from './pulse-data';
import { previewValue } from './pulse-data';
import KeyValueMapper from './KeyValueMapper';
import ApiEndpointField, { endpointPickPatch } from './ApiEndpointField';
import ConnectorField from './ConnectorField';
import ConditionBuilder from './ConditionBuilder';
import TokenInput from './TokenInput';
import PulseRecipientField from './PulseRecipientField';
import RecordPickerField from './RecordPickerField';
import WorkflowPickerField from './WorkflowPickerField';
import WorkflowInputsField from './WorkflowInputsField';
import WorkflowInputListField from './WorkflowInputListField';
import ScheduleField, { TimezoneField } from './ScheduleField';
import WebhookPathField, { WebhookSecretField } from './WebhookField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Radix Select cannot hold an empty value; this stands for "no entity chosen". */
const NONE = '__none__';
import EmailPreview from './EmailPreview';
import ListEditor, { listColumnsFor } from './ListEditor';
import { isConfigValueMissing } from './validateWorkflow';
import { WaitClock } from './CustomNodes';
import LoopOutput from './LoopOutput';
import { branchesFor, hasErrorEdge } from './branches';
import { Mail, CalendarClock } from 'lucide-react';

/** Per-node engine settings, stored under config._runtime (read by the engine's run-pulse wrapper). */
interface NodeRuntime {
  retry?: { max: number; delayMs?: number };
  timeoutMs?: number;
  onError?: 'fail' | 'route' | 'continue';
  condition?: string;
}

interface Props {
  node: { id: string; data?: Record<string, unknown> };
  pulse: PulseManifestEntry;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  /** Upstream steps' outputs (from the last test run). */
  steps: DataStep[];
  /** Node id of the directly-previous node — the input panel's default. */
  directPrevId?: string;
  testOutput?: unknown;
  /** For Each / While: every record of this step in the last run (one per pass, then Done). */
  loopRuns?: unknown[];
  onTestNode: () => void;
  /** n8n's "Execute previous nodes": run the steps that lead here, stopping before this one. */
  onRunPrevious?: () => void;
  runningPrevious?: boolean;
  testing?: boolean;
  /** Test step on a Wait: it waits as long as live — shown with a countdown and Skip. */
  testWait?: { until?: number; label?: string } | null;
  /** True when this node is a trigger — enables the "Simulate" control. */
  isTrigger?: boolean;
  onSimulate?: () => void;
  simulating?: boolean;
  /** The workflow's target entity (chosen in the header). Shown locked on triggers. */
  targetEntity?: string;
  /** Where the OUTPUT data came from: a real DB row, a schema-generated sample, the last real
   *  run's input, or the sample the designer typed. */
  outputSource?: 'real' | 'generated' | 'lastRun' | 'sample' | null;
  /** When the last real run happened (outputSource 'lastRun'). */
  outputAt?: string;
  /** The saved workflow and whether it is active: a trigger's real input comes from its runs. */
  workflowId?: string;
  workflowActive?: boolean;
  /** A trigger's input was chosen in its Input pane (last real run, or the typed sample). */
  onUseTriggerInput?: (res: TriggerInputResult) => void;
  /** Test step: what the code wrote with console.log, and why it failed (Run JavaScript). */
  testConsole?: Array<{ level: string; text: string }>;
  testError?: string | null;
  /** Viewing a saved version: every setting is shown, none can be changed or tested. */
  readOnly?: boolean;
}

import { useWorkflowCatalog } from './useWorkflowCatalog';

const inputCls =
  'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-primary/50 focus:outline-none';

/**
 * n8n-style Node Detail modal: three panes — INPUT (previous step's data, chosen
 * from a node selector, shown as a draggable JSON tree), PARAMETERS (the pulse's
 * config, whose text fields accept dropped/clicked data references), and OUTPUT
 * (this node's last test result).
 */
export default function PulseNodeModal({
  node,
  pulse,
  onUpdate,
  onClose,
  steps,
  directPrevId,
  testOutput,
  loopRuns,
  onTestNode,
  onRunPrevious,
  runningPrevious,
  testing,
  testWait,
  isTrigger,
  onSimulate,
  simulating,
  targetEntity,
  outputSource,
  outputAt,
  workflowId,
  workflowActive = false,
  onUseTriggerInput,
  testConsole,
  testError,
  readOnly = false,
}: Props) {
  const isCode = pulse.meta.type === 'data.runCode';
  const loopKind = pulse.meta.type === 'control.forEach' ? 'forEach' : pulse.meta.type === 'control.whileLoop' ? 'while' : null;
  // Entity fields are populated from the live catalogue, so the options can
  // never drift from the models this app actually has.
  const { data: catalog } = useWorkflowCatalog();
  const entityNames = (catalog?.entities ?? []).map((e) => e.name);
  const targetFields = (catalog?.entities ?? []).find((e) => e.name === targetEntity)?.fields ?? [];
  const catalogEntry = (catalog?.pulses ?? []).find((p) => p.type === pulse.meta.type) ?? { type: pulse.meta.type, category: pulse.meta.category, config: pulse.config };

  const d = (node.data ?? {}) as Record<string, unknown>;
  const config = (d.config ?? {}) as Record<string, unknown>;
  const runtime = ((config._runtime ?? {}) as NodeRuntime) || {};
  const [tab, setTab] = useState<'parameters' | 'settings'>('parameters');
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [inputStepId, setInputStepId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const isEmail = pulse.meta.type === 'integration.sendEmail';
  // A trigger that does not start from a record (webhook, schedule, sign-up) gets its input from
  // its own panel: a real run's, or a typed sample. Never a table row.
  const triggerInput = isTrigger && pulse.meta.triggerInput && pulse.meta.triggerInput.source !== 'record' ? pulse.meta.triggerInput : null;
  // Wave D — an AI step's output carries its token usage; show it as one line above the JSON.
  const usageLine = formatUsage(
    testOutput && typeof testOutput === 'object' ? (testOutput as { usage?: Parameters<typeof formatUsage>[0] }).usage : undefined,
  );

  // A saved version is shown, never changed: every write goes through these two, so nothing (a
  // field the <fieldset> cannot reach, a drag from the Input pane) can edit it.
  const setConfig = (patch: Record<string, unknown>) => {
    if (readOnly) return;
    onUpdate(node.id, { ...d, config: { ...config, ...patch } });
  };
  const setLabel = (label: string) => {
    if (readOnly) return;
    onUpdate(node.id, { ...d, label });
  };
  // Engine settings live beside the pulse's own config under `_runtime`; the interpreter splits
  // them off before the pulse runs. Cleared keys are dropped so an untouched node stays untouched.
  const setRuntime = (patch: Partial<NodeRuntime>) => {
    const next: Record<string, unknown> = { ...runtime, ...patch };
    for (const k of Object.keys(next)) if (next[k] === undefined || next[k] === '' || next[k] === null) delete next[k];
    setConfig({ _runtime: Object.keys(next).length ? next : undefined });
  };
  const outcomes = branchesFor(catalogEntry, config);
  const canRouteError = hasErrorEdge(catalogEntry);
  // A setting with showWhen belongs to one mode (a Wait's duration / date / record fields).
  const isShown = (f: PulseFieldDescriptor) => {
    if (!f.showWhen) return true;
    const ctl = pulse.config.find((c) => c.key === f.showWhen!.key);
    return f.showWhen.is.includes(String(config[f.showWhen.key] ?? ctl?.default ?? ''));
  };
  const asField = pulse.config.find((f) => f.key === 'as' && isShown(f));

  const defaultStepId = useMemo(() => {
    if (directPrevId && steps.some((s) => s.nodeId === directPrevId)) return directPrevId;
    return steps.length ? steps[steps.length - 1].nodeId : null;
  }, [directPrevId, steps]);

  const inputStep =
    steps.find((s) => s.nodeId === inputStepId) ??
    steps.find((s) => s.nodeId === defaultStepId) ??
    (steps.length ? steps[steps.length - 1] : null);

  const insertIntoFocused = (token: string) => {
    if (!focusedKey) return;
    setConfig({ [focusedKey]: String(config[focusedKey] ?? '') + token });
  };

  const renderField = (f: PulseFieldDescriptor) => {
    const value = config[f.key] ?? f.default ?? '';
    // The Connector step: connector → action → connection, from this app's own lists.
    if (f.widget === 'connector' || f.widget === 'connectorAction' || f.widget === 'connection') {
      return <ConnectorField kind={f.widget} value={String(value)} config={config} onChange={(patch) => setConfig(patch)} />;
    }
    if (f.widget === 'apiEndpoint') {
      return (
        <ApiEndpointField
          value={String(value)}
          onChange={(next) => setConfig({ [f.key]: next })}
          onPick={(ep) => setConfig(endpointPickPatch(ep, f.key, config))}
        />
      );
    }
    // Pick an agent / a person by name instead of typing an id. `runAs` in particular decides
    // whose permissions the agent works under, and a mistyped id there is both invisible and
    // consequential.
    if (f.widget === 'agentPicker' || f.widget === 'userPicker') {
      return (
        <RecordPickerField
          source={f.widget === 'agentPicker' ? 'agent' : 'user'}
          value={String(value)}
          onChange={(next) => setConfig({ [f.key]: next })}
        />
      );
    }
    // When a scheduled workflow runs: "repeat every…" or "at set times…", written to cron.
    if (f.widget === 'schedule') {
      return (
        <ScheduleField
          value={String(config[f.key] ?? f.default ?? '')}
          timezone={String(config.timezone ?? '') || undefined}
          onChange={(cron) => setConfig({ [f.key]: cron })}
        />
      );
    }
    // The webhook's address, method and secret, shown where the path is set.
    if (f.widget === 'webhookPath') {
      return (
        <WebhookPathField
          value={String(value)}
          method={String(config.method ?? 'POST')}
          secret={String(config.secret ?? '')}
          sampleBody={(config._sample as { payload?: unknown } | undefined)?.payload ?? config.sampleBody}
          onChange={(p) => setConfig({ [f.key]: p })}
        />
      );
    }
    if (f.widget === 'webhookSecret') {
      return <WebhookSecretField value={String(value)} onChange={(s) => setConfig({ [f.key]: s || undefined })} />;
    }
    if (f.widget === 'timezone') {
      return <TimezoneField value={String(value)} onChange={(tz) => setConfig({ [f.key]: tz })} />;
    }
    if (f.widget === 'conditions') {
      // A step that names its own table (a Wait on a record) suggests THAT table's fields.
      const ownEntity = typeof config.entity === 'string' && config.entity ? config.entity : null;
      const fields = ownEntity ? (catalog?.entities ?? []).find((e) => e.name === ownEntity)?.fields ?? [] : targetFields;
      return (
        <ConditionBuilder
          value={config[f.key] ?? f.default}
          onChange={(next) => setConfig({ [f.key]: next })}
          // A Wait re-reads the record as it is: "changed" (before vs after an update) has no meaning there.
          operators={ownEntity ? catalog?.conditionOperators?.filter((o) => o !== 'changed') : catalog?.conditionOperators}
          operatorLabels={catalog?.conditionOperatorLabels}
          fields={fields}
          emptyText={ownEntity ? 'Add at least one condition the record must meet.' : undefined}
        />
      );
    }
    // Call Workflow's inputs: one box per input the called workflow declares (n8n's Execute Workflow).
    if (f.widget === 'workflowInputs') {
      return (
        <WorkflowInputsField
          workflowName={String(config.workflowName ?? '')}
          value={config[f.key] ?? f.default}
          onChange={(next) => setConfig({ [f.key]: next })}
          steps={steps}
          readOnly={readOnly}
        />
      );
    }
    // A JSON example typed as text (the called-workflow trigger's "Define using JSON example").
    // A called workflow's inputs: one list, edited as fields or as a JSON example.
    if (f.widget === 'workflowInputList') {
      return <WorkflowInputListField value={config[f.key] ?? f.default} onChange={(rows) => setConfig({ [f.key]: rows })} readOnly={readOnly} />;
    }
    if (f.widget === 'workflowPicker') {
      return (
        <WorkflowPickerField
          value={String(value ?? '')}
          onChange={(name) => setConfig({ [f.key]: name })}
          currentWorkflowId={workflowId}
          readOnly={readOnly}
        />
      );
    }
    // A field of the table THIS step names (its `entity` setting), picked rather than typed: a
    // mistyped field name only fails when the step runs.
    if (f.widget === 'entityField') {
      const ownEntity = typeof config.entity === 'string' && config.entity ? config.entity : null;
      const fields = ownEntity ? (catalog?.entities ?? []).find((e) => e.name === ownEntity)?.fields ?? [] : [];
      const current = String(value ?? '');
      // A saved name the table no longer has is still shown, so it is visible rather than silently lost.
      const options = current && !fields.includes(current) ? [current, ...fields] : fields;
      return (
        <Select
          value={current || NONE}
          onValueChange={(v) => setConfig({ [f.key]: v === NONE ? undefined : v })}
          disabled={!ownEntity || readOnly}
        >
          <SelectTrigger className="h-9 w-full text-[13px]">
            <SelectValue placeholder={ownEntity ? 'Choose a field…' : 'Choose the table first'} />
          </SelectTrigger>
          <SelectContent className="z-[70] max-h-72">
            {!ownEntity ? <SelectItem value={NONE}>Choose the table first</SelectItem> : null}
            {options.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
                {!fields.includes(name) ? ' (not on this table)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    // A moment: picked on a calendar, or a date dragged in from an earlier step.
    if (f.widget === 'dateTime') {
      const text = String(value ?? '');
      const at = text && !/\{\{/.test(text) ? new Date(text) : null;
      const valid = !!at && !Number.isNaN(at.getTime());
      const local = valid ? new Date(at!.getTime() - at!.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '';
      return (
        <div className="space-y-1.5">
          <TokenInput
            value={text}
            onChange={(v) => setConfig({ [f.key]: v || undefined })}
            steps={steps}
            onFocus={() => setFocusedKey(f.key)}
            placeholder="pick below, or drag a date in"
            readOnly={readOnly}
          />
          {readOnly ? null : (
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="shrink-0">Pick:</span>
              <input
                type="datetime-local"
                value={local}
                onChange={(e) => setConfig({ [f.key]: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-primary/50 focus:outline-none"
              />
            </label>
          )}
          {valid ? (
            <p className="text-[11px] text-muted-foreground">
              Waits until <span className="font-medium text-foreground">{at!.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span> (your time).
            </p>
          ) : text && !/\{\{/.test(text) ? (
            <p className="text-[11px] font-medium text-destructive">Not a date — pick one, or drag a date in.</p>
          ) : null}
        </div>
      );
    }
    if (f.type === 'recipient') {
      return <PulseRecipientField value={String(value)} onChange={(v) => setConfig({ [f.key]: v })} steps={steps} />;
    }
    switch (f.type) {
      case 'json': {
        // A list-shaped value (a gateway's cases, transitions, a task form) gets the row editor;
        // the key/value mapper is for objects and would flatten a list to {} (H5).
        const current = config[f.key] ?? f.default;
        const columns = listColumnsFor(f.key, pulse.meta.type);
        if (Array.isArray(current) || Array.isArray(f.default) || columns) {
          return (
            <ListEditor
              value={current}
              onChange={(next) => setConfig({ [f.key]: next })}
              columns={columns}
              steps={steps}
              readOnly={readOnly}
              hint={LIST_HINTS[pulse.meta.type + '.' + f.key]}
            />
          );
        }
        return <KeyValueMapper value={current} onChange={(next) => setConfig({ [f.key]: next })} steps={steps} readOnly={readOnly} />;
      }
      case 'boolean':
        return (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={Boolean(config[f.key] ?? f.default)} onChange={(e) => setConfig({ [f.key]: e.target.checked })} />
            {f.label}
          </label>
        );
      case 'number': {
        // A number, or data from an earlier step (a lone {{record.version}} keeps its type when the
        // engine fills it in). A plain number box could not hold that, and showed it as blank.
        const text = value === undefined || value === null ? '' : String(value);
        const bad = text.trim() !== '' && !/^-?\d+(\.\d+)?$/.test(text.trim()) && !/\{\{\s*[\w.]+\s*\}\}/.test(text);
        return (
          <>
            <TokenInput
              value={text}
              onChange={(v) => {
                const t = v.trim();
                setConfig({ [f.key]: t === '' ? undefined : /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : v });
              }}
              steps={steps}
              onFocus={() => setFocusedKey(f.key)}
              placeholder={f.default !== undefined ? String(f.default) : 'a number, or drag data in'}
              readOnly={readOnly}
            />
            {bad ? <p className="mt-1 text-[11px] font-medium text-destructive">Enter a number, or drag data in from the left.</p> : null}
          </>
        );
      }
      // An entity field names a model in THIS app, so offer the catalogue rather
       // than a free-text box: typing a model that does not exist is the most
       // common way to author a workflow that silently never fires.
      case 'entity':
        return (
          <Select value={String(value ?? '') || NONE} onValueChange={(v) => setConfig({ [f.key]: v === NONE ? undefined : v })}>
            <SelectTrigger className="h-9 w-full text-[13px]">
              <SelectValue placeholder="Select an entity…" />
            </SelectTrigger>
            {/* Above the step panel (z-60), not behind it. */}
            <SelectContent className="z-[70]">
              <SelectItem value={NONE}>None</SelectItem>
              {entityNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'select':
        return (
          <Select value={String(value)} onValueChange={(v) => setConfig({ [f.key]: v })}>
            <SelectTrigger className="h-9 w-full text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[70]">
              {(f.options ?? []).map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'code':
        if (isCode) {
          return (
            <Suspense fallback={<div className="h-[260px] animate-pulse rounded-md border border-border bg-muted/30" />}>
              <CodeEditor
                value={typeof value === 'string' ? value : ''}
                onChange={(v) => setConfig({ [f.key]: v })}
                steps={steps}
                readOnly={readOnly}
                placeholder="return { total: vars.record.amount * 1.1 };"
              />
            </Suspense>
          );
        }
        // Other long text (an email's HTML body): the chip field, several lines tall.
        return (
          <TokenInput
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(v) => setConfig({ [f.key]: v })}
            steps={steps}
            onFocus={() => setFocusedKey(f.key)}
            placeholder="type, or drag data from the left"
            readOnly={readOnly}
            multiline
          />
        );
      default:
        // string / expression / entity / recipient — a token-pill field: dragged
        // data references render as chips labelled "<step> · <field>".
        return (
          <TokenInput
            value={String(value)}
            onChange={(v) => setConfig({ [f.key]: v })}
            steps={steps}
            onFocus={() => setFocusedKey(f.key)}
            placeholder={f.type === 'expression' ? 'e.g. {{amount}} > 1000  ·  drag data from the left' : 'type, or drag data from the left'}
            readOnly={readOnly}
          />
        );
    }
  };

  const previewVars = Object.assign(
    {},
    ...steps.map((s) => (s.output && typeof s.output === 'object' ? (s.output as Record<string, unknown>) : {})),
  );

  return (
    <>
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[86vh] w-full max-w-[1160px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{pulse.meta.label}</p>
            <p className="text-[11px] text-primary">{pulse.meta.type}</p>
          </div>
          <div className="flex items-center gap-2">
            {readOnly ? (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-medium text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden /> Read-only · saved version
              </span>
            ) : null}
            {isEmail ? (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                title="Preview the email (resolves variables)"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12.5px] font-medium hover:bg-accent"
              >
                <Mail className="h-3.5 w-3.5" /> Preview
              </button>
            ) : null}
            {isTrigger && onSimulate && !readOnly && !triggerInput ? (
              <button
                type="button"
                onClick={onSimulate}
                disabled={simulating}
                title="Load a real record as if the workflow had been triggered"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-3 text-[12.5px] font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
              >
                {simulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Simulate
              </button>
            ) : null}
            {testing && testWait ? <WaitClock until={testWait.until} label={testWait.label} skippable /> : null}
            {readOnly ? null : (
              <button
                type="button"
                onClick={onTestNode}
                disabled={testing}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Test step
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3 panes */}
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.15fr_1fr]">
          {/* INPUT */}
          <section className="flex min-h-0 flex-col border-r border-border bg-muted/20">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Inbox className="h-3.5 w-3.5" /> Input
              </span>
              {/* Re-run the steps before this one for fresh input (n8n's "Execute previous nodes"). */}
              {onRunPrevious && !isTrigger && !readOnly && steps.length > 0 ? (
                <button
                  type="button"
                  onClick={onRunPrevious}
                  disabled={runningPrevious}
                  title="Run the steps before this one again, for fresh input"
                  className="ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-primary/30 px-2 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
                >
                  {runningPrevious ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Execute previous
                </button>
              ) : null}
              {steps.length > 0 && !triggerInput ? (
                <Select value={inputStep?.nodeId ?? undefined} onValueChange={(v) => setInputStepId(v)}>
                  <SelectTrigger className="h-7 max-w-[55%] text-[11px]" aria-label="Show the data of step">
                    <SelectValue placeholder="Choose a step" />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    {steps.map((s) => (
                      <SelectItem key={s.nodeId} value={s.nodeId} className="text-[12px]">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2">
              {triggerInput ? (
                <div className="p-1.5">
                  <TriggerInputPanel
                    spec={triggerInput}
                    triggerType={pulse.meta.type}
                    config={config}
                    onConfigChange={readOnly ? undefined : setConfig}
                    workflowId={workflowId}
                    workflowActive={workflowActive}
                    readOnly={readOnly}
                    onUse={(res) => onUseTriggerInput?.(res)}
                    usedFrom={outputSource === 'lastRun' || outputSource === 'sample' ? outputSource : null}
                  />
                </div>
              ) : inputStep ? (
                <InputTree value={inputStep.output} path="" onInsert={insertIntoFocused} depth={0} />
              ) : isTrigger && onSimulate ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <Wand2 className="h-6 w-6 text-primary/70" />
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    Simulate this trigger to load a real record — as if the workflow had actually fired — then map its fields downstream.
                  </p>
                  <button
                    type="button"
                    onClick={onSimulate}
                    disabled={simulating}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {simulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Simulate trigger
                  </button>
                </div>
              ) : onRunPrevious && !isTrigger && !readOnly ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <Play className="h-6 w-6 text-primary/70" />
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    No data yet. Run the steps before this one to see what they pass in, then drag fields into a parameter.
                  </p>
                  <button
                    type="button"
                    onClick={onRunPrevious}
                    disabled={runningPrevious}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {runningPrevious ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Execute previous steps
                  </button>
                </div>
              ) : (
                <Empty text="Run Test flow to load the previous steps' data, then drag fields into a parameter." />
              )}
            </div>
          </section>

          {/* PARAMETERS / SETTINGS */}
          <section className="flex min-h-0 flex-col border-r border-border">
            <div className="flex items-center gap-1 border-b border-border px-3 py-1.5">
              {(['parameters', 'settings'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ' +
                    (tab === t ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')
                  }
                >
                  {t === 'settings' ? <Settings2 className="h-3 w-3" /> : null}
                  {t}
                </button>
              ))}
            </div>
            {/* A saved version is shown as it was: every control is disabled, nothing is written back. */}
            <fieldset disabled={readOnly} className="flex min-h-0 min-w-0 flex-1 flex-col">
            {tab === 'settings' ? (
              <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
                <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
                  How the engine runs this step: retries, a time limit, what happens when it fails, and an optional guard.
                </p>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-foreground">Retry attempts</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={runtime.retry?.max ?? ''}
                    onChange={(e) => setRuntime({ retry: e.target.value === '' ? undefined : { ...(runtime.retry ?? {}), max: Math.max(0, Number(e.target.value)) } })}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Extra attempts after a failure, with exponential backoff. Leave empty for none.</p>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-foreground">Timeout (ms)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={runtime.timeoutMs ?? ''}
                    onChange={(e) => setRuntime({ timeoutMs: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Steps that reach outside the app default to 30 000 ms.</p>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-foreground">On error</label>
                  <Select
                    value={runtime.onError ?? 'fail'}
                    onValueChange={(v) => setRuntime({ onError: v === 'fail' ? undefined : (v as NodeRuntime['onError']) })}
                  >
                    <SelectTrigger className="h-8 text-[13px]" aria-label="On error">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="fail">Fail the run</SelectItem>
                      <SelectItem value="route">Follow the error branch</SelectItem>
                      <SelectItem value="continue">Ignore and continue</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {canRouteError
                      ? 'Choose "Follow the error branch" and connect the red error handle on the node to the step that should handle a failure.'
                      : 'This step does not raise errors a branch could catch.'}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-foreground">Only run when</label>
                  <TokenInput
                    value={String(runtime.condition ?? '')}
                    onChange={(v) => setRuntime({ condition: v || undefined })}
                    steps={steps}
                    placeholder="e.g. {{record.amount}} > 1000 — empty runs always"
                    readOnly={readOnly}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">When false the step is skipped and the flow continues past it.</p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-[12px] font-medium text-foreground">
                    <GitBranch className="h-3.5 w-3.5" /> Outcomes
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {outcomes.map((b) => (
                      <span key={b.id} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                        {b.label}
                      </span>
                    ))}
                    {canRouteError ? <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">error</span> : null}
                    {outcomes.length === 0 && !canRouteError ? <span className="text-[11px] text-muted-foreground">Continues to the next step.</span> : null}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Each outcome is a handle on the node; the edge you draw from it carries the outcome's name.</p>
                </div>
              </div>
            ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
                {pulse.meta.description}
              </p>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">Label</label>
                <input className={inputCls} value={String(d.label ?? pulse.meta.label)} onChange={(e) => setLabel(e.target.value)} />
              </div>
              {/* Only a trigger that starts on a record of the table: a webhook, a schedule or a call
                  from another workflow does not "fire on" the table's records. */}
              {isTrigger && (!pulse.meta.triggerInput || pulse.meta.triggerInput.source === 'record') ? (
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-foreground">Target entity</label>
                  <div className="flex h-8 items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-2.5">
                    <span className="truncate font-mono text-[13px] text-foreground">
                      {targetEntity || <span className="text-muted-foreground">Not set</span>}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {targetEntity
                      ? `Set in the workflow header — this trigger fires on ${targetEntity} records.`
                      : 'Choose the workflow’s target entity in the header first.'}
                  </p>
                </div>
              ) : null}
              {pulse.config.filter(isShown).map((f) => {
                // Required means the ENGINE needs it: the save check refuses the graph without it.
                const missing = !!f.required && isConfigValueMissing(config[f.key]);
                return (
                  <div key={f.key} className={missing ? 'rounded-md border border-rose-500/50 p-2' : undefined}>
                    {f.type !== 'boolean' ? (
                      <label className="mb-1 block text-[12px] font-medium text-foreground">
                        {f.label}
                        {f.required ? <span className="text-rose-500"> *</span> : null}
                      </label>
                    ) : null}
                    {renderField(f)}
                    {missing ? <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">Required — the workflow cannot be saved without it.</p> : null}
                    {f.help && !(isCode && f.key === 'code') && !LIST_HINTS[pulse.meta.type + '.' + f.key] ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{friendlyHelp(f.help)}</p>
                    ) : null}
                  </div>
                );
              })}
              {pulse.io.inputs.length > 0 || pulse.io.outputs.length > 0 || asField ? (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data flow</p>
                  {pulse.io.inputs.length > 0 ? (
                    <p className="text-[11.5px] text-muted-foreground">
                      <span className="font-medium text-foreground">Reads:</span> {pulse.io.inputs.map((i) => i.label || i.key).join(', ')}
                    </p>
                  ) : null}
                  {pulse.io.outputs.length > 0 ? (
                    <p className="text-[11.5px] text-muted-foreground">
                      <span className="font-medium text-foreground">Produces:</span>{' '}
                      {pulse.io.outputs.map((o) => (
                        <code key={o.key} className="mr-1 rounded bg-muted px-1 font-mono text-[11px]">{o.key}</code>
                      ))}
                    </p>
                  ) : null}
                  {asField ? (
                    <p className="mt-1 text-[11.5px] text-muted-foreground">
                      "{asField.label}" becomes a variable: later steps read this result as{' '}
                      <code className="rounded bg-muted px-1 font-mono text-[11px]">{'{{' + String(config.as ?? asField.default ?? 'result') + '}}'}</code>.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            )}
            </fieldset>
          </section>

          {/* OUTPUT */}
          <section className="flex min-h-0 flex-col bg-muted/20">
            <div className="border-b border-border px-3 py-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ArrowUpRight className="h-3.5 w-3.5" /> Output
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2">
              {testOutput !== undefined || testError || (isCode && testConsole && testConsole.length) ? (
                <div className="space-y-2">
                  {/* A failed test says why HERE, where the eye already is — not only in a toast that
                      fades. Whatever the step still returned (an HTTP error's response) shows below. */}
                  {testError ? (
                    <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[12px] text-destructive">
                      <p className="font-semibold">{isCode ? 'The code failed' : 'The step failed'}</p>
                      <p className="mt-0.5 break-words font-mono text-[11.5px]">{testError}</p>
                    </div>
                  ) : null}
                  {isCode && !testError && testOutput && typeof testOutput === 'object' && Object.keys(testOutput as object).length ? (
                    <div className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adds variables</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {Object.keys(testOutput as object).map((k) => (
                          <code key={k} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11.5px] text-primary ring-1 ring-inset ring-primary/25">
                            {k}
                          </code>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">Later steps read these like any other data.</p>
                    </div>
                  ) : null}
                  {outputSource === 'real' ? (
                    <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      <Database className="h-3.5 w-3.5 shrink-0" /> Real record — loaded from the database
                    </div>
                  ) : outputSource === 'lastRun' ? (
                    <div className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary">
                      <Database className="h-3.5 w-3.5 shrink-0" /> From the last real run{outputAt ? ' · ' + ago(outputAt) : ''}
                    </div>
                  ) : outputSource === 'sample' ? (
                    <div className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Your sample — typed in the Input pane, not a real run.</span>
                    </div>
                  ) : outputSource === 'generated' ? (
                    <div className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Sample data — this entity has no records yet, so a schema-generated example is shown (not real data).</span>
                    </div>
                  ) : null}
                  {usageLine ? (
                    <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
                      {usageLine}
                    </div>
                  ) : null}
                  {testOutput !== undefined &&
                  !(isCode && testError) &&
                  !(testError && testOutput && typeof testOutput === 'object' && !Object.keys(testOutput as object).length) ? (
                    loopKind && !testError ? (
                      <LoopOutput
                        key={node.id + ':' + (loopRuns?.length ?? 0)}
                        kind={loopKind}
                        runs={loopRuns}
                        output={testOutput}
                        itemVar={String(config.item || pulse.config.find((f) => f.key === 'item')?.default || 'item')}
                        indexVar={String(config.index || pulse.config.find((f) => f.key === 'index')?.default || 'index')}
                        asVar={String(config.as || pulse.config.find((f) => f.key === 'as')?.default || 'results')}
                      />
                    ) : (
                    <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-background p-2 font-mono text-[11.5px] text-foreground">
                      {JSON.stringify(testOutput, null, 2)}
                    </pre>
                    )
                  ) : null}
                  {isCode && testConsole && testConsole.length ? (
                    <div className="rounded-md border border-border bg-background">
                      <p className="border-b border-border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Console
                      </p>
                      <ol className="max-h-48 overflow-auto py-1 font-mono text-[11.5px]">
                        {testConsole.map((l, i) => (
                          <li
                            key={i}
                            className={
                              'whitespace-pre-wrap break-words px-2.5 py-0.5 ' +
                              (l.level === 'error'
                                ? 'text-destructive'
                                : l.level === 'warn'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-foreground')
                            }
                          >
                            {l.text}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Empty text="Run Test step to see this node's output." />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
    {isEmail && previewOpen ? (
      <EmailPreview
        to={String((config.to as string) ?? '')}
        subject={String((config.subject as string) ?? '')}
        body={String((config.body as string) ?? '')}
        vars={previewVars}
        onClose={() => setPreviewOpen(false)}
      />
    ) : null}
    </>
  );
}

/**
 * A field's help as people read it. The catalogue's help also teaches the Workflow AI the {{path}}
 * syntax, so it says "supports {{variables}}"; here data is dragged in as chips, so that is what
 * the help says. Examples of what people TYPE (a condition such as {{amount}} > 1000) are kept.
 */
/** How each list of rows is used, said plainly (it replaces the catalogue's JSON-shaped help). */
const LIST_HINTS: Record<string, string> = {
  'control.exclusiveGateway.cases': 'Checked from the top: the first case that is true decides the path. None true → the default branch.',
  'control.inclusiveGateway.cases': 'Every case that is true sends the run down its path. None true → the default branch.',
  'control.switch.cases': 'The first case whose value equals the one above decides the path. No match → the default branch.',
  'data.transitionState.transitions': 'The moves allowed from one state to another. Anything else is refused.',
  'human.userTask.form': 'The fields the assignee fills in. Their answers become this step\'s output.',
};

export function friendlyHelp(help: string): string {
  return help
    // "Supports {{variables}}, e.g. "…{{record.id}}"" — the example only shows the syntax.
    .replace(/\s*Supports \{\{(?:variables|templates)\}\},\s*e\.g\.[^]*$/i, ' Drag data in from the Input pane.')
    .replace(/;\s*values may use \{\{(?:variables|templates)\}\}\s*\([^)]*\)/gi, '; drag data in from the Input pane')
    .replace(/\s*\((?:supports|values may use) \{\{(?:variables|templates)\}\}[^)]*\)/gi, ' (drag data in from the Input pane)')
    .replace(/;?\s*supports \{\{(?:variables|templates)\}\}\.?/gi, '. Drag data in from the Input pane.')
    .replace(/^\.\s*/, '')
    .replace(/\.\s*\./g, '.')
    .trim();
}

function Empty({ text }: { text: string }) {
  return <p className="px-3 py-8 text-center text-[12px] leading-relaxed text-muted-foreground">{text}</p>;
}

/** Recursive, draggable JSON tree for the input pane. */
function InputTree({
  value,
  path,
  onInsert,
  depth,
}: {
  value: unknown;
  path: string;
  onInsert: (token: string) => void;
  depth: number;
}) {
  if (value === null || typeof value !== 'object') {
    return <Leaf name={path.split('.').pop() || 'value'} path={path} value={value} onInsert={onInsert} depth={depth} />;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  return (
    <div>
      {entries.map(([k, v]) => {
        const p = path ? `${path}.${k}` : k;
        return v !== null && typeof v === 'object' ? (
          <Branch key={p} name={k} path={p} value={v} onInsert={onInsert} depth={depth} />
        ) : (
          <Leaf key={p} name={k} path={p} value={v} onInsert={onInsert} depth={depth} />
        );
      })}
    </div>
  );
}

function dragStart(e: React.DragEvent, path: string) {
  e.dataTransfer.setData('text/plain', `{{${path}}}`);
  e.dataTransfer.effectAllowed = 'copy';
}

function Leaf({ name, path, value, onInsert, depth }: { name: string; path: string; value: unknown; onInsert: (t: string) => void; depth: number }) {
  return (
    <div
      draggable
      onDragStart={(e) => dragStart(e, path)}
      onClick={() => onInsert(`{{${path}}}`)}
      title="Drag into a field, or click to insert into the focused field"
      style={{ paddingLeft: `${depth * 14 + 4}px` }}
      className="group flex cursor-grab items-center justify-between gap-2 rounded py-1 pr-2 hover:bg-accent active:cursor-grabbing"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
        <span className="truncate font-mono text-[12px] text-foreground">{name}</span>
      </span>
      <span className="shrink-0 truncate text-[11px] text-muted-foreground">{previewValue(value)}</span>
    </div>
  );
}

function Branch({ name, path, value, onInsert, depth }: { name: string; path: string; value: unknown; onInsert: (t: string) => void; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const entries = Object.entries(value as Record<string, unknown>);
  const badge = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;
  return (
    <div>
      <div style={{ paddingLeft: `${depth * 14 + 4}px` }} className="flex items-center gap-1 rounded py-1 pr-2 hover:bg-accent/60">
        <button type="button" onClick={() => setOpen((o) => !o)} className="grid h-4 w-4 shrink-0 place-items-center text-muted-foreground">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <div
          draggable
          onDragStart={(e) => dragStart(e, path)}
          onClick={() => onInsert(`{{${path}}}`)}
          title="Drag into a field, or click to insert"
          className="flex min-w-0 flex-1 cursor-grab items-center justify-between gap-2 active:cursor-grabbing"
        >
          <span className="truncate font-mono text-[12px] font-medium text-foreground">{name}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{badge}</span>
        </div>
      </div>
      {open ? <InputTree value={value} path={path} onInsert={onInsert} depth={depth + 1} /> : null}
    </div>
  );
}
