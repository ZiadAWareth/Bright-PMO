import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function TimesheetList() {
  return <ResourceList config={config} />;
}
export function TimesheetCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function TimesheetEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function TimesheetShow() {
  return <ResourceShow config={config} />;
}
