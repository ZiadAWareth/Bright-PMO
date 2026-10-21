import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function EvmSnapshotList() {
  return <ResourceList config={config} />;
}
export function EvmSnapshotCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function EvmSnapshotEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function EvmSnapshotShow() {
  return <ResourceShow config={config} />;
}
