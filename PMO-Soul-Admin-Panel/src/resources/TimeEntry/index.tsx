import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function TimeEntryList() {
  return <ResourceList config={config} />;
}
export function TimeEntryCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function TimeEntryEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function TimeEntryShow() {
  return <ResourceShow config={config} />;
}
