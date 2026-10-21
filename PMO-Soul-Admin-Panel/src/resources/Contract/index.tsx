import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ContractList() {
  return <ResourceList config={config} />;
}
export function ContractCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ContractEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ContractShow() {
  return <ResourceShow config={config} />;
}
