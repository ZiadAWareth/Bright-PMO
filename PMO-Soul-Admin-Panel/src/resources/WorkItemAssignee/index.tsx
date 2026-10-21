import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function WorkItemAssigneeList() {
  return <ResourceList config={config} />;
}
export function WorkItemAssigneeCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function WorkItemAssigneeEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function WorkItemAssigneeShow() {
  return <ResourceShow config={config} />;
}
