import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function WorkItemStatusList() {
  return <ResourceList config={config} />;
}
export function WorkItemStatusCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function WorkItemStatusEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function WorkItemStatusShow() {
  return <ResourceShow config={config} />;
}
