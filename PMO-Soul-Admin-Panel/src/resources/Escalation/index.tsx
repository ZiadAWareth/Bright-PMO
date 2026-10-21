import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function EscalationList() {
  return <ResourceList config={config} />;
}
export function EscalationCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function EscalationEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function EscalationShow() {
  return <ResourceShow config={config} />;
}
