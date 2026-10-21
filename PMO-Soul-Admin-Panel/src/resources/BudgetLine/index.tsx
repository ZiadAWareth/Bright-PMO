import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function BudgetLineList() {
  return <ResourceList config={config} />;
}
export function BudgetLineCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function BudgetLineEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function BudgetLineShow() {
  return <ResourceShow config={config} />;
}
