import { ResourceList } from '@/components/resource/resource-list';
import { ResourceForm } from '@/components/resource/resource-form';
import { ResourceShow } from '@/components/resource/resource-show';
import { config } from './config';

export function ApprovalStepList() {
  return <ResourceList config={config} />;
}
export function ApprovalStepCreate() {
  return <ResourceForm config={config} mode="create" />;
}
export function ApprovalStepEdit() {
  return <ResourceForm config={config} mode="edit" />;
}
export function ApprovalStepShow() {
  return <ResourceShow config={config} />;
}
