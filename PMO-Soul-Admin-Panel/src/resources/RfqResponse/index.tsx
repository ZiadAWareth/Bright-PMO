import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function RfqResponseList() {
  return <ResourceList config={config} />;
}
export function RfqResponseCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function RfqResponseEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function RfqResponseShow() {
  return <ResourceShow config={config} />;
}
