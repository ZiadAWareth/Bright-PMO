import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ActivityLogList() {
  return <ResourceList config={config} />;
}
export function ActivityLogCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ActivityLogEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ActivityLogShow() {
  return <ResourceShow config={config} />;
}
