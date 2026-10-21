import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ClosureTemplateList() {
  return <ResourceList config={config} />;
}
export function ClosureTemplateCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ClosureTemplateEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ClosureTemplateShow() {
  return <ResourceShow config={config} />;
}
