import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notifications/notification.module';
import { AgentModule } from '../agent/agent.module';
import { MailModule } from '../mail/mail.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowIoService } from './workflow-io.service';
import { WorkflowGateway } from './gateway/workflow-gateway';
import { PulseController } from './pulses/pulse.controller';
import { PulseWorkflowRunner } from './pulses/services/pulse-live-runner';
import { ConfigurableLLMProvider } from './ai/llm-provider';
import { WorkflowAIService } from './ai/workflow-ai.service';
import { WorkflowAIController } from './ai/workflow-ai.controller';
import { WorkflowTasksController } from './workflow-tasks.controller';
import { WorkflowTasksService } from './workflow-tasks.service';
import { WorkflowStartController } from './workflow-start.controller';
import { WorkflowStartService } from './workflow-start.service';
import { WorkflowClockService } from './workflow-clock.service';
import { WebhookController } from './webhook.controller';

@Module({
  // AgentModule for the ai.agent step: it exports the settings, grounding and run-store services
  // the runner needs. One-directional — AgentModule does not import this one, and the agent's
  // grounding service reaches the pulses through core + catalog, which import nothing back.
  // MailModule for the send-email step: the app's one mail transport, so a node that names no SMTP
  // of its own uses the settings an administrator saved instead of environment variables nobody set.
  imports: [PrismaModule, NotificationModule, AgentModule, MailModule],
  controllers: [WorkflowController, WorkflowAIController, PulseController, WorkflowTasksController, WorkflowStartController, WebhookController],
  providers: [
    WorkflowService,
    WorkflowIoService,
    WorkflowGateway,
    PulseWorkflowRunner,
    ConfigurableLLMProvider,
    WorkflowAIService,
    WorkflowTasksService,
    WorkflowStartService,
    // The clock: timer/condition waits and cron schedules (DB sweep, replica-safe).
    WorkflowClockService,
  ],
  // Model services inject this to fire workflows on entity events.
  exports: [PulseWorkflowRunner],
})
export class WorkflowModule {}
