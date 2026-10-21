import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ApiKeyList() {
  return <ResourceList config={config} />;
}
export function ApiKeyCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ApiKeyEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ApiKeyShow() {
  return <ResourceShow config={config} />;
}
