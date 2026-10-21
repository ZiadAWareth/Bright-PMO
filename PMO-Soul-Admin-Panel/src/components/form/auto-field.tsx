import { useFormContext, type ControllerRenderProps } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import type { FieldConfig } from '@/lib/field-types';
import { createResourceApi } from '@/lib/resource-api';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ColorChooser } from '@/components/fields/color-field';
import { AttachmentUploader } from '@/components/fields/attachment-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Foreign-key dropdown: fetches the target resource and lists records by their
 * display field. The stored value is the referenced id (kept as a string in the
 * form; the resource form coerces it to a number on submit when numeric).
 */
function RelationSelect({ config, field }: { config: FieldConfig; field: ControllerRenderProps }) {
  const rel = config.relation!;
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [rel.resource, 'options'],
    queryFn: () =>
      createResourceApi<{ id: string | number } & Record<string, any>>(rel.resource).list({
        page: 0,
        limit: 200,
      }),
    retry: 1,
    staleTime: 60_000,
  });
  const options = data?.data ?? [];
  const value = field.value === undefined || field.value === null || field.value === '' ? '' : String(field.value);

  // G21 — a failed lookup used to render an empty dropdown with no message and
  // no way to recover, which reads as "there are no options" rather than "this
  // did not load". Say what happened and offer a retry.
  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2">
        <span className="text-sm text-destructive">
          Could not load {config.label.toLowerCase()} options.
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          {isFetching ? 'Retrying…' : 'Retry'}
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={field.onChange}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Loading…' : `Select ${config.label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 && !isLoading ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No options</div>
        ) : (
          options.map((o) => {
            const id = String(o[rel.refField]);
            const labelText = o[rel.displayField] != null && o[rel.displayField] !== '' ? String(o[rel.displayField]) : id;
            return (
              <SelectItem key={id} value={id}>
                {labelText} <span className="text-muted-foreground">(#{id})</span>
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}

/** Read one picked file as base64 (what the API stores for a Bytes column). */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
}

function Control({ config, field }: { config: FieldConfig; field: ControllerRenderProps }) {
  if (config.list) {
    // A list column: one value per line. Split, trimmed and typed on submit (resource-form).
    return (
      <Textarea
        rows={4}
        placeholder="One value per line"
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        name={field.name}
        ref={field.ref}
      />
    );
  }
  switch (config.kind) {
    case 'decimal':
      // Kept as the string the user typed: a Number() here would round 0.1 + 0.2.
      return (
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      );
    case 'bigint':
      return (
        <Input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      );
    case 'date':
      return (
        <Input type="date" value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
      );
    case 'time':
      return (
        <Input type="time" value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
      );
    case 'bytes':
      return (
        <div className="space-y-1">
          <Input
            type="file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              field.onChange(file ? await readAsBase64(file) : '');
            }}
            onBlur={field.onBlur}
            name={field.name}
          />
          {field.value ? (
            <p className="text-xs text-muted-foreground">
              {(Math.floor((String(field.value).length * 3) / 4) - (String(field.value).match(/=+$/)?.[0].length ?? 0))} bytes stored — pick a file to replace.
            </p>
          ) : null}
        </div>
      );
    case 'relation':
      return <RelationSelect config={config} field={field} />;
    case 'color':
      return <ColorChooser value={field.value} onChange={field.onChange} />;
    case 'file':
      return <AttachmentUploader value={field.value} onChange={field.onChange} />;
    case 'boolean':
      return (
        <div className="flex h-9 items-center">
          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
        </div>
      );
    case 'number':
      return (
        <Input
          type="number"
          value={field.value ?? ''}
          onChange={(e) => {
            // G22 — '' must become empty, not 0, and a non-numeric entry must
            // never reach form state as NaN.
            const raw = e.target.value;
            if (raw === '') return field.onChange(null);
            const num = Number(raw);
            if (!Number.isNaN(num)) field.onChange(num);
          }}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      );
    case 'enum':
      return (
        <Select value={field.value ?? ''} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {(config.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'textarea':
    case 'json':
      return (
        <Textarea
          rows={config.kind === 'json' ? 5 : 4}
          className={config.kind === 'json' ? 'font-mono text-xs' : undefined}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      );
    case 'datetime':
      return (
        <Input
          type="datetime-local"
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      );
    case 'password':
    case 'email':
    case 'url':
    case 'text':
    default:
      return (
        <Input
          type={config.kind === 'password' ? 'password' : config.kind === 'email' ? 'email' : 'text'}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      );
  }
}

export function AutoFormField({ config }: { config: FieldConfig }) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={config.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {config.label}
            {!config.optional && <span className="text-destructive"> *</span>}
          </FormLabel>
          <FormControl>
            <Control config={config} field={field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
