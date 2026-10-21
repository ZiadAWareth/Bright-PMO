import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, MaxLength } from 'class-validator';
import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard, RequirePermission } from '../../guards/permissions.guard';
import { WorkflowAIService } from './workflow-ai.service';

// Every property is declared to the validator. The app's ValidationPipe runs with
// forbidNonWhitelisted, so an undecorated property is not "accepted as-is" — it is REJECTED:
// "property message should not exist" was the whole assistant refusing every request.
class WorkflowAIChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  message: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;

  @IsOptional()
  @IsObject()
  currentWorkflow?: { nodes: any[]; edges: any[] } | null;
}

@ApiTags('Workflow AI')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('workflow/ai')
export class WorkflowAIController {
  constructor(private readonly aiService: WorkflowAIService) {}

  @Post('chat')
  @RequirePermission('Workflow', 'update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Chat with the workflow AI assistant' })
  async chat(@Body() dto: WorkflowAIChatDto) {
    return this.aiService.chat({
      message: dto.message,
      history: dto.history,
      currentWorkflow: dto.currentWorkflow,
    });
  }
}
