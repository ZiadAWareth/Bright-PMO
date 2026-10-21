import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function BaselineItemList() {
  return <ResourceList config={config} />;
}
export function BaselineItemCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function BaselineItemEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function BaselineItemShow() {
  return <ResourceShow config={config} />;
}
