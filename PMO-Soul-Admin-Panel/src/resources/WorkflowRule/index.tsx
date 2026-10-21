import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function WorkflowRuleList() {
  return <ResourceList config={config} />;
}
export function WorkflowRuleCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function WorkflowRuleEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function WorkflowRuleShow() {
  return <ResourceShow config={config} />;
}
