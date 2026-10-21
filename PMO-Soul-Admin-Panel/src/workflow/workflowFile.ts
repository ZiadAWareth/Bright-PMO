import type { WorkflowDefinition } from './workflowService';

/** What a workflow file says it is. Keep in step with the backend's workflow-io.service.ts. */
export const WORKFLOW_FILE_FORMAT = 'soul-workflow';
export const WORKFLOW_FILE_VERSION = 1;
/** Far above any real workflow; stops a wrong file (a database dump) from freezing the page. */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface WorkflowFile {
  format: typeof WORKFLOW_FILE_FORMAT;
  version: number;
  exportedAt: string;
  workflow: { name: string; description?: string; entityName: string; definition: WorkflowDefinition };
}

/**
 * The file for a workflow: its name, entity and steps. No secrets travel in it — connector
 * credentials and mail settings live in the app's settings, never in a workflow's definition.
 */
export function buildWorkflowFile(w: { name: string; description?: string; entityName: string; definition: WorkflowDefinition }): WorkflowFile {
  return {
    format: WORKFLOW_FILE_FORMAT,
    version: WORKFLOW_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    workflow: {
      name: w.name,
      ...(w.description ? { description: w.description } : {}),
      entityName: w.entityName,
      definition: { nodes: w.definition?.nodes ?? [], edges: w.definition?.edges ?? [] } as WorkflowDefinition,
    },
  };
}

function fileName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return (slug || 'workflow') + '.workflow.json';
}

/** Export: save the workflow as <name>.workflow.json. */
export function downloadWorkflowFile(w: { name: string; description?: string; entityName: string; definition: WorkflowDefinition }): void {
  const blob = new Blob([JSON.stringify(buildWorkflowFile(w), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName(w.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read a chosen file as JSON, with a plain message when it is not one. */
export async function readWorkflowFile(file: File): Promise<unknown> {
  if (file.size > MAX_FILE_BYTES) throw new Error('This file is too large to be a workflow.');
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Choose a file made with Export.');
  }
}
