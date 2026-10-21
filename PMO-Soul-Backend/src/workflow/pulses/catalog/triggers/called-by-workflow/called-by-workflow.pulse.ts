import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';
import { WORKFLOW_INPUT_TYPES } from '../../../core';

/**
 * The start of a workflow that other workflows call (n8n's "When Executed by Another Workflow").
 * It never fires on its own: a Call Workflow step in another workflow runs it, passing the inputs
 * declared here, and gets its result back. A called workflow need not be active.
 */
export const meta: PulseMeta = {
  type: 'trigger.calledByWorkflow',
  category: 'trigger',
  label: 'When Called by Another Workflow',
  description: 'Starts this workflow when a Call Workflow step in another workflow runs it. Never fires on its own.',
  icon: 'git-merge',
  async: 'never',
  hasSideEffects: false,
  // What the calling step passed, under `input`, shaped by the declared inputs. A test uses the
  // last real call's input, or the sample typed in the Input pane.
  triggerInput: { source: 'workflow', event: 'subWorkflow' },
};

export const config: PulseFieldDescriptor[] = [
  {
    // The one setting: the inputs calling steps fill, one box each. Edited as rows or as a JSON
    // example (widget) — the same list either way.
    key: 'inputs',
    label: 'Workflow inputs',
    type: 'json',
    widget: 'workflowInputList',
    default: [],
    help:
      'Each input has a name and a type (' + WORKFLOW_INPUT_TYPES.join(', ') + '). Anything else a caller passes is dropped; an input it leaves out arrives empty.',
  },
];

export const io: PulseIO = {
  inputs: [],
  outputs: [{ key: 'input', label: 'What the calling step passed', description: 'Read as {{input.<name>}}.' }],
};
