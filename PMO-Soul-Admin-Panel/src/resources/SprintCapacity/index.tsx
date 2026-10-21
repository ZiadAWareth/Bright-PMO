import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function SprintCapacityList() {
  return <ResourceList config={config} />;
}
export function SprintCapacityCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function SprintCapacityEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function SprintCapacityShow() {
  return <ResourceShow config={config} />;
}
