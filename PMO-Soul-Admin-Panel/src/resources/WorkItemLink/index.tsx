import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function WorkItemLinkList() {
  return <ResourceList config={config} />;
}
export function WorkItemLinkCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function WorkItemLinkEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function WorkItemLinkShow() {
  return <ResourceShow config={config} />;
}
