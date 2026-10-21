import { useRef, useState, type ChangeEvent } from 'react';
import {
  UploadCloud,
  Paperclip,
  X,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/** One stored attachment, as returned by POST /api/uploads. */
export interface StoredFile {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

// Keep in step with MAX_FILE_BYTES in the backend uploads controller.
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type Item =
  | { id: string; status: 'done'; file: StoredFile }
  | { id: string; status: 'uploading'; name: string; size: number; type: string }
  | { id: string; status: 'error'; name: string; size: number; type: string; message: string };

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return String(Date.now()) + '-' + String(Math.random()).slice(2);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Normalise a stored field value (array | single | JSON string | null) to StoredFile[]. */
function toArray(value: unknown): StoredFile[] {
  let v: any = value;
  if (typeof v === 'string') {
    if (!v.trim()) return [];
    try { v = JSON.parse(v); } catch { return []; }
  }
  if (Array.isArray(v)) return v.filter((f) => f && typeof f.key === 'string');
  if (v && typeof v === 'object' && typeof v.key === 'string') return [v as StoredFile];
  return [];
}

/** Fetch a file (private bucket) via the authenticated API and trigger a download. */
async function downloadFile(file: StoredFile): Promise<void> {
  const res = await api.get('/api/uploads/file', {
    params: { key: file.key },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || 'file';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Edit control for the "file" field type — a drag-and-drop / click dropzone that
 * uploads each selected file and keeps the field value as an array of stored-file
 * metadata. Half-uploaded files never enter the form value.
 */
export function AttachmentUploader({
  value,
  onChange,
  accept,
  disabled,
}: {
  value: unknown;
  onChange: (next: StoredFile[]) => void;
  accept?: string;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    toArray(value).map((f): Item => ({ id: f.key, status: 'done', file: f })),
  );
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (next: Item[]) => {
    setItems(next);
    onChange(
      next
        .filter((i) => i.status === 'done')
        .map((i) => (i as Extract<Item, { status: 'done' }>).file),
    );
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    let working = items.slice();
    for (const file of files) {
      const id = uid();
      if (file.size > MAX_FILE_BYTES) {
        const errItem: Item = {
          id, status: 'error', name: file.name, size: file.size, type: file.type,
          message: 'Exceeds the 25 MB limit',
        };
        working = working.concat(errItem);
        commit(working);
        continue;
      }
      const upItem: Item = { id, status: 'uploading', name: file.name, size: file.size, type: file.type };
      working = working.concat(upItem);
      commit(working);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await api.post('/api/uploads', form);
        const stored = res.data as StoredFile;
        working = working.map((i): Item => (i.id === id ? { id, status: 'done', file: stored } : i));
      } catch (err: any) {
        const message = err && err.message ? String(err.message) : 'Upload failed';
        working = working.map((i): Item =>
          i.id === id
            ? { id, status: 'error', name: file.name, size: file.size, type: file.type, message }
            : i,
        );
      }
      commit(working);
    }
  };

  const removeItem = async (item: Item) => {
    commit(items.filter((i) => i.id !== item.id));
    if (item.status === 'done') {
      try {
        await api.delete('/api/uploads', { params: { key: item.file.key } });
      } catch {
        // best-effort: the record no longer references it either way
      }
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          if (e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-accent/50',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-foreground">
          Drag &amp; drop files here, or click to browse
        </span>
        <span className="text-xs text-muted-foreground">
          {'Up to 25 MB per file' + (accept ? ' • ' + accept : '')}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={onInputChange}
      />

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border bg-card p-2.5',
                item.status === 'error' ? 'border-destructive/40' : 'border-border',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                  item.status === 'error'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary',
                )}
              >
                {item.status === 'uploading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : item.status === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.status === 'done' ? item.file.name : item.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.status === 'error'
                    ? item.message
                    : item.status === 'uploading'
                      ? 'Uploading…'
                      : formatSize(item.file.size)}
                </p>
              </div>

              {item.status === 'done' && (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <button
                    type="button"
                    onClick={() => downloadFile(item.file)}
                    className="rounded p-1 text-muted-foreground hover:text-primary"
                    aria-label={'Download ' + item.file.name}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </>
              )}

              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Read-only display of the "file" field for list cells and detail views. */
export function AttachmentViewer({ value }: { value: unknown }) {
  const files = toArray(value);
  if (!files.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => downloadFile(f)}
          className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          title={'Download ' + f.name}
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="truncate">{f.name}</span>
        </button>
      ))}
    </div>
  );
}
