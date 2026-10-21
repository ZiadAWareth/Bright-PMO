import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ApprovalRequestList() {
  return <ResourceList config={config} />;
}
export function ApprovalRequestCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ApprovalRequestEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ApprovalRequestShow() {
  return <ResourceShow config={config} />;
}
