import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function BenchmarkList() {
  return <ResourceList config={config} />;
}
export function BenchmarkCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function BenchmarkEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function BenchmarkShow() {
  return <ResourceShow config={config} />;
}
