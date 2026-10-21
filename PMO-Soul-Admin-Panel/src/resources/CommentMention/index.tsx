import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function CommentMentionList() {
  return <ResourceList config={config} />;
}
export function CommentMentionCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function CommentMentionEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function CommentMentionShow() {
  return <ResourceShow config={config} />;
}
