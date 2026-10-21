// Bright PMO: the generic components are imported under other names. Our model
// is called "Resource", so the generated page names (ResourceList, ResourceShow)
// clashed with the generic components' names, a duplicate declaration that
// stopped the whole admin panel from loading (SOUL-ISSUES.md, issue 16).
import { ResourceList as GenericResourceList } from '@/components/resource/resource-list';
import { ResourceForm as GenericResourceForm } from '@/components/resource/resource-form';
import { ResourceShow as GenericResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ResourceList() {
  return <GenericResourceList config={config} />;
}
export function ResourceCreate() {
  return <GenericResourceForm config={config} mode="create" />;
}
export function ResourceEdit() {
  return <GenericResourceForm config={config} mode="edit" />;
}
export function ResourceShow() {
  return <GenericResourceShow config={config} />;
}
