import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function UserList() {
  return <ResourceList config={config} />;
}
export function UserCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function UserEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function UserShow() {
  return <ResourceShow config={config} />;
}
