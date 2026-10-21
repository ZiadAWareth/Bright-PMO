import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ProjectMemberList() {
  return <ResourceList config={config} />;
}
export function ProjectMemberCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ProjectMemberEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ProjectMemberShow() {
  return <ResourceShow config={config} />;
}
