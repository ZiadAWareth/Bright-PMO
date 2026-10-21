import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function BaselineList() {
  return <ResourceList config={config} />;
}
export function BaselineCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function BaselineEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function BaselineShow() {
  return <ResourceShow config={config} />;
}
