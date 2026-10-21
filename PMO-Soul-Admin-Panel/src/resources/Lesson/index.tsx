import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function LessonList() {
  return <ResourceList config={config} />;
}
export function LessonCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function LessonEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function LessonShow() {
  return <ResourceShow config={config} />;
}
