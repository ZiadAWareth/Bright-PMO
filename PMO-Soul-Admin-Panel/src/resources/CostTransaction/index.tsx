import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function CostTransactionList() {
  return <ResourceList config={config} />;
}
export function CostTransactionCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function CostTransactionEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function CostTransactionShow() {
  return <ResourceShow config={config} />;
}
