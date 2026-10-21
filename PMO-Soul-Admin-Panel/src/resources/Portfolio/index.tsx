import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function PortfolioList() {
  return <ResourceList config={config} />;
}
export function PortfolioCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function PortfolioEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function PortfolioShow() {
  return <ResourceShow config={config} />;
}
