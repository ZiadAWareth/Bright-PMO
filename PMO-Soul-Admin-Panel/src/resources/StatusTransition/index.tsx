import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function StatusTransitionList() {
  return <ResourceList config={config} />;
}
export function StatusTransitionCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function StatusTransitionEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function StatusTransitionShow() {
  return <ResourceShow config={config} />;
}
