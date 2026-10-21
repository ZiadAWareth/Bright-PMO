import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ChecklistList() {
  return <ResourceList config={config} />;
}
export function ChecklistCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ChecklistEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ChecklistShow() {
  return <ResourceShow config={config} />;
}
