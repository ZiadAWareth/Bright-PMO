import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function IntegrationConnectionList() {
  return <ResourceList config={config} />;
}
export function IntegrationConnectionCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function IntegrationConnectionEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function IntegrationConnectionShow() {
  return <ResourceShow config={config} />;
}
