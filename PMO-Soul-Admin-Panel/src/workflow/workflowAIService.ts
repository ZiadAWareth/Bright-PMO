import { api } from '@/lib/api';
import type { WorkflowDefinition } from './workflowService';

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResponse {
  intent?: 'generate' | 'modify' | 'clarify';
  /** The assistant's name for the workflow. */
  name?: string;
  /** The model the workflow is bound to (Target entity). */
  entity?: string;
  message: string;
  questions?: string[];
  workflow?: WorkflowDefinition;
  validation?: string[];
}

const AI_BASE = '/api/workflow/ai';

const workflowAIService = {
  async chat(
    message: string,
    history: AIChatMessage[] = [],
    currentWorkflow: WorkflowDefinition | null = null,
  ): Promise<AIChatResponse> {
    const { data } = await api.post(AI_BASE + '/chat', {
      message,
      history,
      currentWorkflow,
    });
    return data;
  },
};

export default workflowAIService;
