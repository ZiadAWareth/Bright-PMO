import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function RefreshTokenList() {
  return <ResourceList config={config} />;
}
export function RefreshTokenCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function RefreshTokenEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function RefreshTokenShow() {
  return <ResourceShow config={config} />;
}
