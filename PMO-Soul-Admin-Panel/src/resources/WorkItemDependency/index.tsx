import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function WorkItemDependencyList() {
  return <ResourceList config={config} />;
}
export function WorkItemDependencyCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function WorkItemDependencyEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function WorkItemDependencyShow() {
  return <ResourceShow config={config} />;
}
