import type { PulseMeta, PulseFieldDescriptor, PulseIO } from '../../../core';

export const meta: PulseMeta = {
  type: 'control.callWorkflow',
  category: 'control',
  label: 'Call Workflow',
  description: 'Runs another workflow as a step of this one, so shared logic lives in one place.',
  icon: 'git-merge',
  async: 'auto',
  hasSideEffects: true,
};

export const config: PulseFieldDescriptor[] = [
  {
    key: 'workflowName',
    label: 'Workflow',
    type: 'string',
    widget: 'workflowPicker',
    required: true,
    help: 'The workflow to run. Start it with "When Called by Another Workflow": it declares the inputs this step fills.',
  },
  {
    key: 'variables',
    label: 'Workflow inputs',
    type: 'json',
    widget: 'workflowInputs',
    default: {},
    help: 'One value per input the called workflow declares. Drag data in from the Input pane. When it accepts all data, leave empty to pass everything this workflow has.',
  },
  {
    key: 'convertTypes',
    label: 'Attempt to convert types',
    type: 'boolean',
    default: false,
    help: 'Turn "42" into a number, "true" into true, JSON text into a list or object, where an input needs it. Off: a value of the wrong type stops the call.',
  },
  {
    key: 'waitForCompletion',
    label: 'Wait for it to finish',
    type: 'boolean',
    default: true,
    help: 'On: this step waits and gets its result. Off: it starts the workflow and carries on at once (the result is not returned).',
  },
  {
    key: 'onFailure',
    label: 'If it fails',
    type: 'select',
    default: 'fail',
    options: [
      { value: 'fail', label: 'Fail this step too' },
      { value: 'continue', label: 'Carry on' },
    ],
  },
  { key: 'as', label: 'Store result as', type: 'string', default: 'subWorkflow', help: 'Variable name for the called workflow\'s output.' },
];

export const io: PulseIO = {
  inputs: [{ key: 'variables', label: 'Values passed down' }],
  // Stored under the "Store result as" name (subWorkflow unless changed): { status, runId, ...its data }.
  outputs: [{ key: 'subWorkflow', label: 'The called workflow\'s status, run id and data (named by "Store result as")' }],
};
