/** What a workflow file says it is. Keep in step with the frontend's workflowFile.ts. */
export const WORKFLOW_FILE_FORMAT = 'soul-workflow';
export const WORKFLOW_FILE_VERSION = 1;

const NODE_KINDS = new Set(['trigger', 'condition', 'action', 'wait']);
const MAX_STEPS = 500;

export interface ImportProblem {
  level: 'error' | 'warning';
  /** The step it concerns, by its label (or id), when it concerns one. */
  step?: string;
  message: string;
}

export interface ImportCheck {
  ok: boolean;
  workflow: { name: string; description?: string; entityName: string; steps: number } | null;
  problems: ImportProblem[];
}

export interface ImportContext {
  /** This app's entity names. */
  entities: string[];
  /** This app's role names (empty when they could not be read: the role check is then skipped). */
  roles: string[];
  /** The config field descriptors of a pulse type, or null when this app has no such pulse. */
  pulseFields: (type: string) => Array<{ key: string; type?: string }> | null;
  agentExists: (id: string) => Promise<boolean>;
  workflowExists: (name: string) => Promise<boolean>;
}

export async function checkWorkflowFile(file: unknown, ctx: ImportContext): Promise<ImportCheck> {
  const problems: ImportProblem[] = [];
  const error = (message: string, step?: string) => problems.push({ level: 'error', step, message });
  const warn = (message: string, step?: string) => problems.push({ level: 'warning', step, message });

  const f = (file && typeof file === 'object' ? file : {}) as Record<string, any>;
  if (f.format !== WORKFLOW_FILE_FORMAT) {
    error('This is not a workflow file exported from a Soul app.');
    return { ok: false, workflow: null, problems };
  }
  if (typeof f.version !== 'number' || f.version > WORKFLOW_FILE_VERSION) {
    error('This file was made by a newer version of the app. Update this app, then import it again.');
    return { ok: false, workflow: null, problems };
  }
  const wf = (f.workflow && typeof f.workflow === 'object' ? f.workflow : {}) as Record<string, any>;
  const name = typeof wf.name === 'string' ? wf.name.trim() : '';
  const entityName = typeof wf.entityName === 'string' ? wf.entityName.trim() : '';
  const definition = wf.definition && typeof wf.definition === 'object' ? wf.definition : null;
  if (!definition || !Array.isArray(definition.nodes) || !Array.isArray(definition.edges)) {
    error('The file has no workflow steps.');
    return { ok: false, workflow: null, problems };
  }
  const nodes: any[] = definition.nodes;
  const edges: any[] = definition.edges;
  if (!name) error('The file has no workflow name.');
  if (!entityName) error('The file does not say which entity the workflow belongs to.');
  if (nodes.length > MAX_STEPS) error('The workflow has more than ' + MAX_STEPS + ' steps.');

  const entities = new Set(ctx.entities);
  const roles = new Set(ctx.roles);
  if (entityName && !entities.has(entityName)) {
    error('This app has no "' + entityName + '" entity, which the workflow is built on.');
  }

  const ids = new Set<string>();
  let triggers = 0;
  for (const n of nodes) {
    const label = String(n?.label || n?.id || 'a step');
    if (!n || typeof n.id !== 'string' || !n.id || !NODE_KINDS.has(n.kind) || typeof n.type !== 'string') {
      error('A step in the file is incomplete.', label);
      continue;
    }
    if (ids.has(n.id)) error('Two steps share the id "' + n.id + '".', label);
    ids.add(n.id);
    if (n.kind === 'trigger') triggers++;

    const fields = ctx.pulseFields(n.type);
    if (!fields) {
      error('"' + n.type + '" is not a step this app has.', label);
      continue;
    }
    const config = n.config && typeof n.config === 'object' ? n.config : {};
    for (const field of fields) {
      const value = config[field.key];
      if (typeof value !== 'string' || !value.trim() || value.includes('{{')) continue;
      if (field.type === 'entity' && !entities.has(value)) {
        error('It uses the "' + value + '" entity, which this app does not have.', label);
      }
      if (field.type === 'recipient' && value.startsWith('role:') && roles.size && !roles.has(value.slice(5))) {
        warn('It is assigned to the role "' + value.slice(5) + '", which this app does not have. Choose a role after importing.', label);
      }
    }
    if (n.type === 'ai.agent' && typeof config.agentId === 'string' && config.agentId && !(await ctx.agentExists(config.agentId))) {
      warn('It asks an AI agent this app does not have. Choose an agent after importing.', label);
    }
    if (n.type === 'control.callWorkflow' && typeof config.workflowName === 'string' && config.workflowName && !(await ctx.workflowExists(config.workflowName))) {
      warn('It calls the workflow "' + config.workflowName + '", which this app does not have yet.', label);
    }
    if (n.type === 'integration.connector') {
      warn('It uses a connected system. Check the connection exists in this app before running it.', label);
    }
  }
  if (triggers === 0) warn('The workflow has no trigger, so nothing will start it until one is added.');
  if (edges.some((e) => !e || !ids.has(e.from) || !ids.has(e.to))) {
    error('A connection in the file points at a step that is not there.');
  }

  return {
    ok: !problems.some((p) => p.level === 'error'),
    workflow: { name, description: typeof wf.description === 'string' ? wf.description : undefined, entityName, steps: nodes.length },
    problems,
  };
}
