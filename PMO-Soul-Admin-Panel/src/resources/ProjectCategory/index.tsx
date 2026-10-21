import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ProjectCategoryList() {
  return <ResourceList config={config} />;
}
export function ProjectCategoryCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ProjectCategoryEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ProjectCategoryShow() {
  return <ResourceShow config={config} />;
}
