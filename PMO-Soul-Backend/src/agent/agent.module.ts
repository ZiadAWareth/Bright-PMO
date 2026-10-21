import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AiSettingsService } from './ai-settings.service';
import { GroundingService } from './grounding/grounding.service';
import { AgentRunStore } from './agent-run.store';
import { AgentConversationStore } from './agent-conversation.store';
import { ApisIntrospectorService } from '../apis-introspector/apis-introspector.service';

/**
 * Always registered, even with no API key. The agent is dormant rather than absent: grounding
 * still works, the health route still answers, and no outbound traffic occurs until a key is
 * configured. Making the module conditional would turn "use AI" into a setup task, which is
 * the thing the product exists to remove.
 *
 * ApisIntrospectorService is provided here rather than imported from ApisIntrospectorModule,
 * which does not export it. It is a stateless reader over Nest's own ModulesContainer, so a
 * second instance costs nothing — and this avoids editing a module the agent has no other
 * business in.
 *
 * AiSettingsService is exported because everything in Layer 2 that reaches a model has to ask
 * it for the configuration; nothing else should be reading provider settings for itself.
 *
 * AgentRunStore is exported for the same reason: pulses and the inline panel spend tokens too,
 * and every one of those runs belongs in the same table as the ones asked from the assistant
 * page. A second writer would be a second definition of what a run is.
 */
@Module({
  controllers: [AgentController],
  providers: [
    GroundingService,
    AiSettingsService,
    AgentRunStore,
    AgentConversationStore,
    ApisIntrospectorService,
  ],
  exports: [GroundingService, AiSettingsService, AgentRunStore, AgentConversationStore],
})
export class AgentModule {}
