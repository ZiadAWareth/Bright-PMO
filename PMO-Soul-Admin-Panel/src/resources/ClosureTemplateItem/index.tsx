import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ClosureTemplateItemList() {
  return <ResourceList config={config} />;
}
export function ClosureTemplateItemCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ClosureTemplateItemEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ClosureTemplateItemShow() {
  return <ResourceShow config={config} />;
}
