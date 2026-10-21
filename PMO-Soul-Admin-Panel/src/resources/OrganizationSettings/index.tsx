import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function OrganizationSettingsList() {
  return <ResourceList config={config} />;
}
export function OrganizationSettingsCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function OrganizationSettingsEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function OrganizationSettingsShow() {
  return <ResourceShow config={config} />;
}
