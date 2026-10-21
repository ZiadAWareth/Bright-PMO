import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ProjectLifecycleStepList() {
  return <ResourceList config={config} />;
}
export function ProjectLifecycleStepCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ProjectLifecycleStepEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ProjectLifecycleStepShow() {
  return <ResourceShow config={config} />;
}
