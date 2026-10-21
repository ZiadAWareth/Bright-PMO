import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function EquipmentSiteLogList() {
  return <ResourceList config={config} />;
}
export function EquipmentSiteLogCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function EquipmentSiteLogEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function EquipmentSiteLogShow() {
  return <ResourceShow config={config} />;
}
