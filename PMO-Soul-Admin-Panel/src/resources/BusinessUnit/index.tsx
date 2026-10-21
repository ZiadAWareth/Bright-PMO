import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function BusinessUnitList() {
  return <ResourceList config={config} />;
}
export function BusinessUnitCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function BusinessUnitEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function BusinessUnitShow() {
  return <ResourceShow config={config} />;
}
