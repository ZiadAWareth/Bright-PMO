import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function LifecycleTemplateList() {
  return <ResourceList config={config} />;
}
export function LifecycleTemplateCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function LifecycleTemplateEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function LifecycleTemplateShow() {
  return <ResourceShow config={config} />;
}
