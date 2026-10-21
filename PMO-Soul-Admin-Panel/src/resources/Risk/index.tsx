import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function RiskList() {
  return <ResourceList config={config} />;
}
export function RiskCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function RiskEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function RiskShow() {
  return <ResourceShow config={config} />;
}
