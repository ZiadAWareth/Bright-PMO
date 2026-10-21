import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function PunchListItemList() {
  return <ResourceList config={config} />;
}
export function PunchListItemCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function PunchListItemEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function PunchListItemShow() {
  return <ResourceShow config={config} />;
}
