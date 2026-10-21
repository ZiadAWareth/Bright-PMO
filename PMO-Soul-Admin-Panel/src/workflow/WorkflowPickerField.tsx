import { useQuery } from '@tanstack/react-query';
import workflowService from './workflowService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CALLED_BY_WORKFLOW, triggerOf } from './workflowInputs';

/** Radix Select cannot hold an empty value; this stands for "none chosen". */
const NONE = '__none__';

/**
 * Call Workflow's "Workflow": picked from this app's workflows instead of typed — a typo only failed
 * when the step ran. The workflow being edited is left out (a workflow calling itself only hits the
 * depth limit).
 *
 * As in n8n, a workflow that starts "When Called by Another Workflow" is called whatever its status.
 * One that starts any other way (the older pattern) must be active, and the picker says so.
 */
export default function WorkflowPickerField({
  value,
  onChange,
  currentWorkflowId,
  readOnly = false,
}: {
  value: string;
  onChange: (name: string | undefined) => void;
  currentWorkflowId?: string;
  readOnly?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['workflow', 'picker', 'list'],
    queryFn: () => workflowService.list(),
    staleTime: 30_000,
  });
  const workflows = (data ?? []).filter((w) => String(w.id) !== String(currentWorkflowId ?? ''));
  const known = workflows.some((w) => w.name === value);
  const chosen = workflows.find((w) => w.name === value);
  // How the chosen workflow starts (the list does not carry definitions).
  const detail = useQuery({
    queryKey: ['workflow', 'picker', 'detail', chosen?.id],
    queryFn: () => workflowService.getOne(String(chosen!.id)),
    enabled: !!chosen?.id,
    staleTime: 10_000,
  });
  const startsByCall = triggerOf(detail.data?.definition)?.type === CALLED_BY_WORKFLOW;
  const needsActivating =
    !!chosen && !!detail.data && !startsByCall && String(chosen.status ?? '').toUpperCase() !== 'ACTIVE';
  const oldPattern = !!chosen && !!detail.data && !startsByCall;

  return (
    <div className="space-y-1.5">
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? undefined : v)} disabled={readOnly}>
        <SelectTrigger className="h-9 w-full text-[13px]">
          <SelectValue placeholder={isLoading ? 'Loading workflows…' : 'Choose a workflow…'} />
        </SelectTrigger>
        <SelectContent className="z-[70] max-h-72">
          <SelectItem value={NONE}>None</SelectItem>
          {/* A saved name no workflow has any more stays visible, so it is not silently lost. */}
          {value && !known ? <SelectItem value={value}>{value} (not found)</SelectItem> : null}
          {workflows.map((w) => (
            <SelectItem key={String(w.id)} value={w.name}>
              {w.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {needsActivating ? (
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
          This workflow is not active, so it cannot be called yet. Activate it, or start it with “When Called by Another Workflow” (that runs without activating).
        </p>
      ) : oldPattern ? (
        <p className="text-[11px] text-muted-foreground">
          It does not declare its inputs. Start it with “When Called by Another Workflow” to get one box per input here.
        </p>
      ) : value && !known && !isLoading ? (
        <p className="text-[11px] font-medium text-destructive">No workflow has this name any more. Choose one.</p>
      ) : null}
    </div>
  );
}
