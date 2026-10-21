import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ApprovalPolicyList() {
  return <ResourceList config={config} />;
}
export function ApprovalPolicyCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ApprovalPolicyEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ApprovalPolicyShow() {
  return <ResourceShow config={config} />;
}
