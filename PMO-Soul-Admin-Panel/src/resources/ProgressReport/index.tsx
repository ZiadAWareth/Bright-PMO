import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ProgressReportList() {
  return <ResourceList config={config} />;
}
export function ProgressReportCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ProgressReportEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ProgressReportShow() {
  return <ResourceShow config={config} />;
}
