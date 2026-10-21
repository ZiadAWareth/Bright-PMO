import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ProcurementList() {
  return <ResourceList config={config} />;
}
export function ProcurementCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ProcurementEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ProcurementShow() {
  return <ResourceShow config={config} />;
}
