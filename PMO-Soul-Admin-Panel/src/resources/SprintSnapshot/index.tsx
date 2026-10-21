import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function SprintSnapshotList() {
  return <ResourceList config={config} />;
}
export function SprintSnapshotCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function SprintSnapshotEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function SprintSnapshotShow() {
  return <ResourceShow config={config} />;
}
