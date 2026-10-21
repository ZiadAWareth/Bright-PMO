import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function HandoverList() {
  return <ResourceList config={config} />;
}
export function HandoverCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function HandoverEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function HandoverShow() {
  return <ResourceShow config={config} />;
}
