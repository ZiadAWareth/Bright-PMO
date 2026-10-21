import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function CalendarExceptionList() {
  return <ResourceList config={config} />;
}
export function CalendarExceptionCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function CalendarExceptionEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function CalendarExceptionShow() {
  return <ResourceShow config={config} />;
}
