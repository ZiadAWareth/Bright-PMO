import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function UserProfileList() {
  return <ResourceList config={config} />;
}
export function UserProfileCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function UserProfileEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function UserProfileShow() {
  return <ResourceShow config={config} />;
}
