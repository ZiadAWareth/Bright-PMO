import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ApprovalPolicyStepList() {
  return <ResourceList config={config} />;
}
export function ApprovalPolicyStepCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ApprovalPolicyStepEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ApprovalPolicyStepShow() {
  return <ResourceShow config={config} />;
}
