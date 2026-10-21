import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import type { FieldConfig, ResourceConfig } from '@/lib/field-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RelationValue } from './relation-value';
import RunWorkflowButton from '@/workflow/RunWorkflowButton';
import { ColorViewer } from '@/components/fields/color-field';
import { AttachmentViewer } from '@/components/fields/attachment-field';

function displayValue(field: FieldConfig, value: unknown) {
  if (field.kind === 'relation' && field.relation)
    return <RelationValue relation={field.relation} value={value} />;
  if (value === null || value === undefined || value === '')
    return <span className="text-muted-foreground">—</span>;
  if (field.list && Array.isArray(value))
    return <span className="break-words">{value.map((x) => (x != null && typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ')}</span>;
  if (field.kind === 'bytes')
    return <span className="text-muted-foreground">{(Math.floor((String(value).length * 3) / 4) - (String(value).match(/=+$/)?.[0].length ?? 0))} bytes</span>;
  if (field.kind === 'date') {
    try { return format(new Date(value as string), 'PP'); } catch { return String(value); }
  }
  if (field.kind === 'time') {
    try { return new Date(value as string).toISOString().slice(11, 16); } catch { return String(value); }
  }
  if (field.kind === 'autonumber')
    return <span className="font-mono font-medium tabular-nums">{String(value)}</span>;
  if (field.kind === 'color')
    return <ColorViewer value={value} />;
  if (field.kind === 'file')
    return <AttachmentViewer value={value} />;
  if (field.kind === 'boolean')
    return <Badge variant={value ? 'success' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>;
  if (field.kind === 'datetime') {
    try {
      return format(new Date(value as string), 'PPpp');
    } catch {
      return String(value);
    }
  }
  if (field.kind === 'json') {
    return (
      <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="break-words">{String(value)}</span>;
}

export function ResourceShow({ config }: { config: ResourceConfig }) {
  const { id } = useParams();
  const navigate = useNavigate();
  // Frontend route base (nested under a module when configured); API path is unaffected.
  const base = config.routeBase ?? `/${config.resource}`;
  const { data, isLoading } = config.hooks.useOne(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            {config.fields.map((f) => (
              <Skeleton key={f.name} className="h-6" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return <div className="text-muted-foreground">Record not found.</div>;
  }

  const record = data as Record<string, any>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(base)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {config.label} #{record.id}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
        {/* Active Manual Start workflows for this table, run on this record. */}
        <RunWorkflowButton entity={config.resource} recordId={record.id} />
        <Button onClick={() => navigate(`${base}/${record.id}/edit`)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {config.fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">{f.label}</dt>
                <dd className="text-sm">{displayValue(f, record[f.name])}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
