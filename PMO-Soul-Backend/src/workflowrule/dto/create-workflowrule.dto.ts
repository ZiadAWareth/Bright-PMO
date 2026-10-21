
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum WorkflowTrigger {
  status_category_changed = 'status_category_changed',
  dependency_completed = 'dependency_completed',
  sprint_started = 'sprint_started',
  sprint_completed = 'sprint_completed'
}

export enum StatusCategory {
  todo = 'todo',
  in_progress = 'in_progress',
  done = 'done'
}

export enum WorkflowAction {
  start_item = 'start_item',
  move_to_status = 'move_to_status',
  send_notification = 'send_notification',
  assign_resource = 'assign_resource',
  create_recurring_item = 'create_recurring_item',
  escalate_item = 'escalate_item',
  update_project_status = 'update_project_status'
}


export class CreateWorkflowRuleDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsEnum(WorkflowTrigger)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Trigger', enum: WorkflowTrigger })
  trigger: WorkflowTrigger;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'TriggerItemId' })
  triggerItemId?: number;


  @IsOptional()
  @IsEnum(StatusCategory)
  @ApiPropertyOptional({ example: 'example string', description: 'TriggerCategory', enum: StatusCategory })
  triggerCategory?: StatusCategory;


  @IsEnum(WorkflowAction)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Action', enum: WorkflowAction })
  action: WorkflowAction;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'ActionItemId' })
  actionItemId?: number;


  @IsOptional()
  @ApiPropertyOptional({ example: 'example', description: 'ActionConfig' })
  actionConfig?: any;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsActive' })
  isActive: boolean;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
