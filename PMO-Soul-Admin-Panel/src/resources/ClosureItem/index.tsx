import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ClosureItemList() {
  return <ResourceList config={config} />;
}
export function ClosureItemCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ClosureItemEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ClosureItemShow() {
  return <ResourceShow config={config} />;
}
