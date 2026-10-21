import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function LifecycleTemplateStepList() {
  return <ResourceList config={config} />;
}
export function LifecycleTemplateStepCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function LifecycleTemplateStepEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function LifecycleTemplateStepShow() {
  return <ResourceShow config={config} />;
}
