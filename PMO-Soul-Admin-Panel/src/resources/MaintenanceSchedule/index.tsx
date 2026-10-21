import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function MaintenanceScheduleList() {
  return <ResourceList config={config} />;
}
export function MaintenanceScheduleCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function MaintenanceScheduleEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function MaintenanceScheduleShow() {
  return <ResourceShow config={config} />;
}
