import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function DocumentList() {
  return <ResourceList config={config} />;
}
export function DocumentCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function DocumentEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function DocumentShow() {
  return <ResourceShow config={config} />;
}
