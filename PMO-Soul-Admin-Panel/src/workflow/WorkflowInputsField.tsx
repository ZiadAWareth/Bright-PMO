import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import workflowService from './workflowService';
import TokenInput from './TokenInput';
import KeyValueMapper from './KeyValueMapper';
import type { DataStep } from './pulse-data';
import { CALLED_BY_WORKFLOW, declaredWorkflowInputs, triggerOf, typedEntry, type WorkflowInputType } from './workflowInputs';

type Bag = Record<string, unknown>;

const TYPE_LABEL: Record<WorkflowInputType, string> = {
  any: 'any',
  string: 'text',
  number: 'number',
  boolean: 'true / false',
  array: 'list',
  object: 'object',
};

/**
 * Call Workflow's inputs, as n8n's Execute Workflow shows them: the called workflow declares its
 * inputs on its "When Called by Another Workflow" trigger, and this step gets one box per input,
 * labelled with its type. A called workflow that accepts all data (or starts the older way) gets
 * the free key / value list instead.
 */
export default function WorkflowInputsField({
  workflowName,
  value,
  onChange,
  steps,
  readOnly = false,
}: {
  workflowName: string;
  value: unknown;
  onChange: (next: Bag) => void;
  steps: DataStep[];
  readOnly?: boolean;
}) {
  const list = useQuery({
    queryKey: ['workflow', 'picker', 'list'],
    queryFn: () => workflowService.list(),
    staleTime: 30_000,
  });
  const target = (list.data ?? []).find((w) => w.name === workflowName);
  const detail = useQuery({
    queryKey: ['workflow', 'picker', 'detail', target?.id],
    queryFn: () => workflowService.getOne(String(target!.id)),
    enabled: !!target?.id,
    staleTime: 10_000,
  });
  const mapping: Bag = value && typeof value === 'object' && !Array.isArray(value) ? (value as Bag) : {};
  const trigger = triggerOf(detail.data?.definition);
  const declared = trigger?.type === CALLED_BY_WORKFLOW ? declaredWorkflowInputs(trigger.config) : null;
  const declaredKey = declared && declared.mode !== 'any' ? declared.fields.map((f) => f.name).join('|') : '';

  // Once the inputs are known, each is written (null until filled): the step passes exactly these.
  useEffect(() => {
    if (readOnly || !declared || declared.mode === 'any' || !declared.fields.length) return;
    if (declared.fields.every((f) => f.name in mapping)) return;
    const copy: Bag = { ...mapping };
    for (const f of declared.fields) if (!(f.name in copy)) copy[f.name] = null;
    onChange(copy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declaredKey]);

  if (!workflowName) {
    return <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-[12px] text-muted-foreground">Choose a workflow first.</p>;
  }
  if (list.isLoading || detail.isLoading) {
    return <p className="px-1 py-2 text-[12px] text-muted-foreground">Reading what the workflow accepts…</p>;
  }

  // Accept all data, or a workflow that starts some other way: a free list of values.
  if (!declared || declared.mode === 'any') {
    return (
      <div className="space-y-1.5">
        <KeyValueMapper value={mapping} onChange={(next) => onChange((next ?? {}) as Bag)} steps={steps} readOnly={readOnly} />
        <p className="text-[11px] text-muted-foreground">
          {declared
            ? 'It accepts all data. Leave empty to pass everything this workflow has.'
            : 'This workflow does not declare its inputs. Start it with "When Called by Another Workflow" to get one box per input here.'}
        </p>
      </div>
    );
  }

  if (!declared.fields.length) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-[12px] text-muted-foreground">
        “{workflowName}” declares no inputs, so nothing is passed to it.
      </p>
    );
  }

  const names = new Set(declared.fields.map((f) => f.name));
  const stale = Object.keys(mapping).filter((k) => !names.has(k));
  // Every declared input is written, an empty box as null: the step then passes exactly these (as
  // n8n does), instead of falling back to "pass everything" when every box happens to be empty.
  const set = (name: string, next: unknown) => {
    const copy: Bag = {};
    for (const f of declared.fields) copy[f.name] = f.name === name ? next ?? null : mapping[f.name] ?? null;
    for (const k of stale) if (k !== name) copy[k] = mapping[k];
    onChange(copy);
  };

  return (
    <div className="space-y-2.5">
      {declared.fields.map((f) => {
        const current = mapping[f.name];
        const text = current === undefined || current === null ? '' : typeof current === 'string' ? current : JSON.stringify(current);
        return (
          <div key={f.name} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12.5px] font-medium text-foreground">{f.name}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">{TYPE_LABEL[f.type]}</span>
            </div>
            <TokenInput
              value={text}
              onChange={(v) => set(f.name, typedEntry(v, f.type))}
              steps={steps}
              placeholder="type, or drag data from the left"
              readOnly={readOnly}
            />
          </div>
        );
      })}
      {stale.map((k) => (
        <div key={k} className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11.5px] text-amber-800 dark:text-amber-300">
          <span className="min-w-0 flex-1">
            <span className="font-mono font-medium">{k}</span> is not an input of “{workflowName}” any more, so it is not passed.
          </span>
          {readOnly ? null : (
            <button
              type="button"
              aria-label={'Remove ' + k}
              onClick={() => {
                const copy: Bag = { ...mapping };
                delete copy[k];
                onChange(copy);
              }}
              className="grid h-6 w-6 place-items-center rounded hover:bg-amber-500/20"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">An input left empty arrives empty in the called workflow.</p>
    </div>
  );
}
