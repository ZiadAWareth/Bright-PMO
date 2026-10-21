import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function CommentList() {
  return <ResourceList config={config} />;
}
export function CommentCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function CommentEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function CommentShow() {
  return <ResourceShow config={config} />;
}
