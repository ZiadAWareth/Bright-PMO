import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ChecklistItemList() {
  return <ResourceList config={config} />;
}
export function ChecklistItemCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ChecklistItemEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ChecklistItemShow() {
  return <ResourceShow config={config} />;
}
