import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, FileJson, Loader2, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import workflowService, { type ImportCheck } from './workflowService';
import { readWorkflowFile } from './workflowFile';

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] } } }).response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

/**
 * Import a workflow file: choose it, read what this app's check says, then import it as a Draft.
 * Nothing is created until the person presses Import, and a file with errors cannot be imported.
 */
export default function ImportWorkflowDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<unknown>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'checking' | 'importing' | null>(null);
  const [problem, setProblem] = useState('');

  const reset = () => {
    setFileName('');
    setFile(null);
    setCheck(null);
    setName('');
    setProblem('');
    setBusy(null);
    if (input.current) input.current.value = '';
  };

  const choose = async (chosen: File | undefined) => {
    if (!chosen) return;
    reset();
    setFileName(chosen.name);
    setBusy('checking');
    try {
      const parsed = await readWorkflowFile(chosen);
      const result = await workflowService.checkImport(parsed);
      setFile(parsed);
      setCheck(result);
      setName(result.workflow?.name ?? '');
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    if (!file || !check?.ok) return;
    setBusy('importing');
    setProblem('');
    try {
      const result = await workflowService.importWorkflow(file, name.trim());
      const warnings = result.problems.filter((p) => p.level === 'warning').length;
      toast.success(
        'Imported "' + result.workflow.name + '" as a draft' + (warnings ? ' — ' + warnings + ' thing' + (warnings === 1 ? '' : 's') + ' to check before it can run.' : '.'),
      );
      onOpenChange(false);
      reset();
      navigate('/automation/workflows/' + result.workflow.id);
    } catch (err) {
      setProblem(errorMessage(err));
      setBusy(null);
    }
  };

  const errors = check?.problems.filter((p) => p.level === 'error') ?? [];
  const warnings = check?.problems.filter((p) => p.level === 'warning') ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import a workflow</DialogTitle>
          <DialogDescription>
            Choose a file made with Export. It is checked against this app first and imported as a draft, so it never starts running on its own.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={input}
          id="workflow-import-file"
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files?.[0]);
          }}
          className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-background">
            {busy === 'checking' ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : fileName ? <FileJson className="h-5 w-5 text-primary" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{fileName || 'Choose a workflow file'}</span>
            <span className="block text-xs text-muted-foreground">
              {busy === 'checking' ? 'Checking it against this app…' : fileName ? 'Click to choose a different file' : 'A .json file, or drop it here'}
            </span>
          </span>
        </button>

        {check?.workflow ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="workflow-import-name">Name</Label>
              <Input id="workflow-import-name" value={name} onChange={(e) => setName(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                On the {check.workflow.entityName} entity · {check.workflow.steps} step{check.workflow.steps === 1 ? '' : 's'}. A name already in use gets "(imported)".
              </p>
            </div>
            {errors.length === 0 && warnings.length === 0 ? (
              <p className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Everything it uses exists in this app.
              </p>
            ) : null}
            {errors.length ? (
              <ProblemList tone="error" title="Cannot be imported until these are fixed" items={errors} />
            ) : null}
            {warnings.length ? (
              <ProblemList tone="warning" title="Imports, but check these before it can run" items={warnings} />
            ) : null}
          </div>
        ) : check ? (
          <ProblemList tone="error" title="This file cannot be imported" items={check.problems} />
        ) : null}

        {problem ? (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {problem}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={doImport} disabled={!check?.ok || !name.trim() || busy !== null}>
            {busy === 'importing' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Import as draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProblemList({ tone, title, items }: { tone: 'error' | 'warning'; title: string; items: ImportCheck['problems'] }) {
  const Icon = tone === 'error' ? XCircle : AlertTriangle;
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'error'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
      )}
    >
      <p className="mb-1 flex items-center gap-2 font-medium">
        <Icon className="h-4 w-4 shrink-0" /> {title}
      </p>
      <ul className="max-h-40 space-y-1 overflow-y-auto pl-6">
        {items.map((p, i) => (
          <li key={i} className="list-disc">
            {p.step ? <span className="font-medium">{p.step}: </span> : null}
            {p.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
