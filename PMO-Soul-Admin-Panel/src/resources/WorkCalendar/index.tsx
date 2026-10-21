import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function WorkCalendarList() {
  return <ResourceList config={config} />;
}
export function WorkCalendarCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function WorkCalendarEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function WorkCalendarShow() {
  return <ResourceShow config={config} />;
}
