import { Injectable, Logger } from '@nestjs/common';
import { AiSettingsService } from '../../agent/ai-settings.service';
import { AiNotConfiguredError } from '../../agent/ai-config';
import { callLlm, LlmRequestError } from '../../agent/llm.client';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface LLMProvider {
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
}

/**
 * The workflow assistant's model access.
 *
 * This class used to read WORKFLOW_AI_PROVIDER / _API_KEY / _MODEL / _BASE_URL from the
 * environment and hold its own OpenAI-shaped fetch. That made it the only part of the app an
 * administrator could not configure: the AI Provider page set a key for the assistant and for
 * agents, the generated .env shipped WORKFLOW_AI_API_KEY="", and so the workflow assistant alone
 * stayed dead and told the user to edit a file inside a container they have no shell on.
 *
 * It now asks AiSettingsService, exactly like every other caller that reaches a model, and that
 * service still falls back to the same environment variables when no key has been saved — so an
 * app that was configured the old way keeps working, it is just no longer the only way.
 *
 * It is also no longer hardwired to an OpenAI-shaped provider. Anthropic is offered on the AI
 * Provider page and is not OpenAI-shaped; `callLlm` is where that difference already lives.
 */
@Injectable()
export class ConfigurableLLMProvider implements LLMProvider {
  private readonly logger = new Logger(ConfigurableLLMProvider.name);

  constructor(private readonly settings: AiSettingsService) {}

  async chat(messages: ChatMessage[], options: LLMOptions = {}): Promise<string> {
    const cfg = await this.settings.getConfig();
    if (!cfg.configured) {
      // Deliberately names the page rather than the variable. The person who hits this is an
      // administrator in a browser, not an operator with a shell.
      throw new AiNotConfiguredError(
        `The workflow assistant needs an AI provider. An administrator can add a key in AI → Provider & Key. (${cfg.reason})`,
      );
    }

    this.logger.debug(`LLM request: provider=${cfg.provider} model=${cfg.model}`);

    const reply = await callLlm(cfg, {
      messages,
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 4096,
      responseFormat: options.responseFormat,
    });

    // A provider failure, said as one: it reaches the person as the reason, not as a server crash.
    if (!reply.content) throw new LlmRequestError('The model returned an empty answer. Try again, or choose another model in AI → Provider & Key.');
    return reply.content;
  }
}
