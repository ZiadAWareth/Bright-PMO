import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function RiskMitigationList() {
  return <ResourceList config={config} />;
}
export function RiskMitigationCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function RiskMitigationEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function RiskMitigationShow() {
  return <ResourceShow config={config} />;
}
