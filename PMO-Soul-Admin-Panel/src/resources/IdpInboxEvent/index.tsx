import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function IdpInboxEventList() {
  return <ResourceList config={config} />;
}
export function IdpInboxEventCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function IdpInboxEventEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function IdpInboxEventShow() {
  return <ResourceShow config={config} />;
}
