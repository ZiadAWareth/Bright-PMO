import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ReleaseList() {
  return <ResourceList config={config} />;
}
export function ReleaseCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ReleaseEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ReleaseShow() {
  return <ResourceShow config={config} />;
}
