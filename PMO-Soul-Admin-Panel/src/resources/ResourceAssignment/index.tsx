import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ResourceAssignmentList() {
  return <ResourceList config={config} />;
}
export function ResourceAssignmentCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ResourceAssignmentEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ResourceAssignmentShow() {
  return <ResourceShow config={config} />;
}
