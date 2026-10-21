import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function InspectionList() {
  return <ResourceList config={config} />;
}
export function InspectionCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function InspectionEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function InspectionShow() {
  return <ResourceShow config={config} />;
}
