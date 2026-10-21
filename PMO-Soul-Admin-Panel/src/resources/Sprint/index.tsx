import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function SprintList() {
  return <ResourceList config={config} />;
}
export function SprintCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function SprintEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function SprintShow() {
  return <ResourceShow config={config} />;
}
