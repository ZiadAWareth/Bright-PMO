import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function MaintenanceLogList() {
  return <ResourceList config={config} />;
}
export function MaintenanceLogCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function MaintenanceLogEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function MaintenanceLogShow() {
  return <ResourceShow config={config} />;
}
