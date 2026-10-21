import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function SiteList() {
  return <ResourceList config={config} />;
}
export function SiteCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function SiteEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function SiteShow() {
  return <ResourceShow config={config} />;
}
