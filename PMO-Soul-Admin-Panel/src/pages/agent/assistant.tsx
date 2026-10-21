import { AssistantChat } from '@/components/agent/assistant-chat';

/**
 * The full-screen Assistant: the same conversation as the Ask panel (top bar, on every page), with
 * room for the conversation list beside it.
 */
export default function AgentAssistant() {
  return <AssistantChat variant="page" />;
}
