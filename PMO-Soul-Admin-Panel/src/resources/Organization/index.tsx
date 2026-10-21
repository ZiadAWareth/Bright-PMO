import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function OrganizationList() {
  return <ResourceList config={config} />;
}
export function OrganizationCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function OrganizationEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function OrganizationShow() {
  return <ResourceShow config={config} />;
}
