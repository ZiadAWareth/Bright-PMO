import type { Node, Edge } from '@xyflow/react';
import { ENTITY_FIELDS } from './entity-fields';

/** One selectable variable, e.g. { token: '{{email}}', label: 'email' }. */
export interface WorkflowVariable {
  token: string;
  label: string;
  hint?: string;
  /** Real value from the last test run, stringified & truncated (for pinning). */
  sample?: string;
}

/** Pinned data from a test run: final variables + each node's output. */
export interface RunValues {
  variables?: Record<string, unknown>;
  stepOutputs?: Record<string, unknown>;
}

/** Compact, one-line preview of a value for pinning next to its token. */
export function previewValue(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (v === null) return 'null';
  let s: string;
  if (typeof v === 'string') s = v;
  else { try { s = JSON.stringify(v); } catch { s = String(v); } }
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > 60 ? s.slice(0, 57) + '…' : s;
}

/** A named group of variables shown together in the picker / input panel. */
export interface VariableGroup {
  group: string;
  vars: WorkflowVariable[];
}

/**
 * Variables the workflow engine injects into every run's context, on top of the
 * trigger record's own fields. Mirrors WorkflowInterpreter.execute enrichment.
 */
const ENGINE_VARS: WorkflowVariable[] = [
  { token: '{{id}}', label: 'id', hint: 'Id of the record that triggered the run' },
  { token: '{{now}}', label: 'now', hint: 'Current timestamp (ISO)' },
  { token: '{{ownerEmail}}', label: 'ownerEmail', hint: 'Record owner’s email (resolved from ownerId)' },
  { token: '{{contactEmail}}', label: 'contactEmail', hint: 'Customer contact email (contact → primary contact → account)' },
  { token: '{{contactName}}', label: 'contactName', hint: 'Customer contact name' },
];

/** Reverse-reachability: every node that can run before `targetId`. */
function ancestorsOf(targetId: string, edges: Edge[]): Set<string> {
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    const list = incoming.get(e.target) ?? [];
    list.push(e.source);
    incoming.set(e.target, list);
  }
  const seen = new Set<string>();
  const stack = [...(incoming.get(targetId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const s of incoming.get(id) ?? []) stack.push(s);
  }
  return seen;
}

function nodeLabel(n: Node): string {
  const d = (n.data ?? {}) as Record<string, unknown>;
  return (d.label as string) || (d.actionType as string) || (d.triggerType as string) || n.id;
}

/**
 * Build the grouped variable catalog available to a given node — the data it can
 * reference in its {{...}} template fields. Combines the trigger entity's fields,
 * the engine-injected variables, and the outputs of every upstream node.
 */
export function buildVariableCatalog(opts: {
  entity?: string;
  nodes: Node[];
  edges: Edge[];
  targetNodeId: string;
  values?: RunValues;
}): VariableGroup[] {
  const { entity, nodes, edges, targetNodeId, values } = opts;
  const vars = values?.variables;
  const stepOutputs = values?.stepOutputs;
  const groups: VariableGroup[] = [];

  const fields = (entity && ENTITY_FIELDS[entity]) || [];
  if (fields.length) {
    groups.push({
      group: `${entity} record`,
      vars: fields.map((f) => ({ token: `{{${f}}}`, label: f, sample: vars ? previewValue(vars[f]) : undefined })),
    });
  }

  groups.push({
    group: 'Engine',
    vars: ENGINE_VARS.map((e) => ({ ...e, sample: vars ? previewValue(vars[e.label]) : undefined })),
  });

  const ancestors = ancestorsOf(targetNodeId, edges);
  const upstream: WorkflowVariable[] = [];
  for (const n of nodes) {
    if (!ancestors.has(n.id)) continue;
    if (n.type !== 'action') continue; // actions are what produce reusable output
    upstream.push({
      token: `{{${n.id}_output}}`,
      label: `${nodeLabel(n)} → output`,
      hint: `Result returned by the "${nodeLabel(n)}" step`,
      sample: stepOutputs ? previewValue(stepOutputs[n.id]) : undefined,
    });
  }
  if (upstream.length) groups.push({ group: 'Previous steps', vars: upstream });

  return groups;
}

/** What a node emits downstream — shown in the node's Output panel. */
export function describeNodeOutput(node: Node): { title: string; items: string[] } {
  switch (node.type) {
    case 'trigger':
      return {
        title: 'Trigger record',
        items: ['Every field of the record flows downstream as {{field}} (e.g. {{id}}, {{status}}).'],
      };
    case 'condition':
      return {
        title: 'Branch',
        items: ['Routes the run down the Yes (true) or No (false) path. Adds no new variables.'],
      };
    case 'wait':
      return {
        title: 'Resumes after wait',
        items: ['When a User Task completes, {{completedBy}} and {{formData}} are set for downstream steps.'],
      };
    default:
      return {
        title: 'Step output',
        items: [`This step’s result is available downstream as {{${node.id}_output}}.`],
      };
  }
}
