import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function WorkItemList() {
  return <ResourceList config={config} />;
}
export function WorkItemCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function WorkItemEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function WorkItemShow() {
  return <ResourceShow config={config} />;
}
