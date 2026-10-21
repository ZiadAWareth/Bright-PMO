import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function RecurringWorkItemList() {
  return <ResourceList config={config} />;
}
export function RecurringWorkItemCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function RecurringWorkItemEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function RecurringWorkItemShow() {
  return <ResourceShow config={config} />;
}
