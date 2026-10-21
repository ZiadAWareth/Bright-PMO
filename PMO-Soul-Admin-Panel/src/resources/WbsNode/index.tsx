import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function WbsNodeList() {
  return <ResourceList config={config} />;
}
export function WbsNodeCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function WbsNodeEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function WbsNodeShow() {
  return <ResourceShow config={config} />;
}
