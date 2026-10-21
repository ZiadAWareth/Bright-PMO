import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ProjectConflictList() {
  return <ResourceList config={config} />;
}
export function ProjectConflictCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ProjectConflictEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ProjectConflictShow() {
  return <ResourceShow config={config} />;
}
