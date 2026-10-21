import { X, ArrowUpFromLine, Play, FlaskConical, Loader2 } from 'lucide-react';
import type { PulseManifestEntry, PulseFieldDescriptor } from './workflowService';
import type { DataStep } from './pulse-data';
import DataPicker from './DataPicker';
import KeyValueMapper from './KeyValueMapper';
import ApiEndpointField, { endpointPickPatch } from './ApiEndpointField';
import ConnectorField from './ConnectorField';

interface PulseInspectorProps {
  node: { id: string; data?: Record<string, unknown> };
  pulse: PulseManifestEntry;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  /** Upstream steps' outputs (from the last test run) the user can map from. */
  steps: DataStep[];
  /** This node's output from the last test run, if any. */
  testOutput?: unknown;
  onTestNode: () => void;
  onTestFlow: () => void;
  testing?: boolean;
}

const inputCls =
  'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-primary/50 focus:outline-none';

export default function PulseInspector({
  node,
  pulse,
  onUpdate,
  onClose,
  steps,
  testOutput,
  onTestNode,
  onTestFlow,
  testing,
}: PulseInspectorProps) {
  const d = (node.data ?? {}) as Record<string, unknown>;
  const config = (d.config ?? {}) as Record<string, unknown>;

  const setLabel = (label: string) => onUpdate(node.id, { ...d, label });
  const setConfig = (patch: Record<string, unknown>) =>
    onUpdate(node.id, { ...d, config: { ...config, ...patch } });

  const renderField = (f: PulseFieldDescriptor) => {
    const value = config[f.key] ?? f.default ?? '';
    // Widget override: the app-API endpoint picker.
    // The Connector step: connector → action → connection, from this app's own lists.
    if (f.widget === 'connector' || f.widget === 'connectorAction' || f.widget === 'connection') {
      return <ConnectorField kind={f.widget} value={String(value)} config={config} onChange={(patch) => setConfig(patch)} />;
    }
    if (f.widget === 'apiEndpoint') {
      return (
        <ApiEndpointField
          value={String(value)}
          onChange={(next) => setConfig({ [f.key]: next })}
          onPick={(ep) => setConfig(endpointPickPatch(ep, f.key, config))}
        />
      );
    }
    switch (f.type) {
      case 'json':
        return (
          <KeyValueMapper value={config[f.key] ?? f.default} onChange={(next) => setConfig({ [f.key]: next })} steps={steps} />
        );
      case 'boolean':
        return (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={Boolean(config[f.key] ?? f.default)} onChange={(e) => setConfig({ [f.key]: e.target.checked })} />
            {f.label}
          </label>
        );
      case 'number':
        return (
          <input
            type="number"
            className={inputCls}
            value={value === '' ? '' : Number(value)}
            onChange={(e) => setConfig({ [f.key]: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        );
      case 'select':
        return (
          <select className={inputCls} value={String(value)} onChange={(e) => setConfig({ [f.key]: e.target.value })}>
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case 'code':
        return (
          <textarea
            rows={4}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12px] text-foreground focus:border-primary/50 focus:outline-none"
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => setConfig({ [f.key]: e.target.value })}
          />
        );
      default:
        // string / expression / entity / recipient — text with a data picker.
        return (
          <div className="flex items-center gap-1.5">
            <input
              className={inputCls}
              value={String(value)}
              placeholder={f.type === 'expression' ? 'e.g. {{amount}} > 1000' : undefined}
              onChange={(e) => setConfig({ [f.key]: e.target.value })}
            />
            <DataPicker steps={steps} onPick={(token) => setConfig({ [f.key]: String(value ?? '') + token })} />
          </div>
        );
    }
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{pulse.meta.label}</p>
          <p className="text-[11px] text-primary">{pulse.meta.type}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className="rounded-lg border border-border bg-background px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          {pulse.meta.description}
        </p>

        {/* Test controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTestNode}
            disabled={testing}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background text-[12.5px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Test step
          </button>
          <button
            type="button"
            onClick={onTestFlow}
            disabled={testing}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />} Test flow
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Label</label>
          <input className={inputCls} value={String(d.label ?? pulse.meta.label)} onChange={(e) => setLabel(e.target.value)} />
        </div>

        {pulse.config.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Properties</p>
            {pulse.config.map((f) => (
              <div key={f.key}>
                {f.type !== 'boolean' ? (
                  <label className="mb-1 block text-[12px] font-medium text-foreground">
                    {f.label}
                    {f.required ? <span className="text-rose-500"> *</span> : null}
                  </label>
                ) : null}
                {renderField(f)}
                {f.help ? <p className="mt-1 text-[11px] text-muted-foreground">{f.help}</p> : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* This node's output from the last test */}
        {testOutput !== undefined ? (
          <div className="border-t border-border pt-3">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ArrowUpFromLine className="h-3 w-3" /> Output (last test)
            </p>
            <pre className="max-h-48 overflow-auto rounded-md border border-border bg-background p-2 text-[11.5px] text-foreground">
              {JSON.stringify(testOutput, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
