import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function EpsList() {
  return <ResourceList config={config} />;
}
export function EpsCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function EpsEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function EpsShow() {
  return <ResourceShow config={config} />;
}
