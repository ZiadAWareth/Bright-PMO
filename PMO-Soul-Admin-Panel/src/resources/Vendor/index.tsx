import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function VendorList() {
  return <ResourceList config={config} />;
}
export function VendorCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function VendorEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function VendorShow() {
  return <ResourceShow config={config} />;
}
