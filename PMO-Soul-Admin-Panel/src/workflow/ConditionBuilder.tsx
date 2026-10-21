import { Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** One `field · operator · value` rule. Matches the engine's evaluateCondition. */
export interface ConditionRule {
  field?: string;
  operator?: string;
  value?: unknown;
}

/**
 * Fallback operator list, used only until the catalogue answers. The real list comes from
 * catalog.conditionOperators — the SAME array the engine's rule evaluator accepts — so the
 * builder can never offer an operator the engine rejects, nor hide one it supports (it used
 * to show 8 of 14).
 */
const FALLBACK_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'isNull', 'isNotNull'];
const FALLBACK_LABELS: Record<string, string> = {
  eq: 'is',
  neq: 'is not',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  isNull: 'is empty',
  isNotNull: 'is not empty',
};
/** Operators that take no right-hand value. */
const NO_VALUE = new Set(['isNull', 'isNotNull', 'changed']);

const inputCls =
  'h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-primary/50';

/**
 * Row editor for a list of `{ field, operator, value }` conditions — the friendly
 * view for a trigger's / gateway's rules, so the user can add multiple watched
 * fields with multiple conditions without touching Raw JSON.
 */
export default function ConditionBuilder({
  value,
  onChange,
  operators,
  operatorLabels,
  fields,
  emptyText,
}: {
  value: unknown;
  onChange: (next: ConditionRule[]) => void;
  /** catalog.conditionOperators — every operator the engine evaluates. */
  operators?: string[];
  /** catalog.conditionOperatorLabels. */
  operatorLabels?: Record<string, string>;
  /** The table's field names, offered in a dropdown; with none known, the field is typed. */
  fields?: string[];
  /** Shown while there are no conditions (a trigger filter vs a Wait that needs one). */
  emptyText?: string;
}) {
  const rules: ConditionRule[] = Array.isArray(value) ? (value as ConditionRule[]) : [];
  const OPERATORS = (operators && operators.length ? operators : FALLBACK_OPERATORS).map((op) => ({
    value: op,
    label: operatorLabels?.[op] ?? FALLBACK_LABELS[op] ?? op,
    noValue: NO_VALUE.has(op),
  }));
  const update = (i: number, patch: Partial<ConditionRule>) =>
    onChange(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => onChange([...rules, { field: '', operator: 'eq', value: '' }]);
  const remove = (i: number) => onChange(rules.filter((_, idx) => idx !== i));
  const hasFields = !!fields && fields.length > 0;

  return (
    <div className="space-y-2">
      {rules.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">{emptyText ?? 'No conditions — fires on every matching event. Add one to filter.'}</p>
      ) : null}

      {rules.map((r, i) => {
        const op = OPERATORS.find((o) => o.value === (r.operator ?? 'eq'));
        // A field typed before the list loaded (or since renamed) stays selectable, not blanked.
        const fieldOptions = hasFields && r.field && !fields!.includes(r.field) ? [r.field, ...fields!] : fields ?? [];
        return (
          // Two lines per condition — which field and how it compares, then the value — the same
          // roomy cards as every other list in a step's settings.
          <div key={i} className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-2">
            <div className="flex items-center gap-1.5">
              {hasFields ? (
                <Select value={r.field || undefined} onValueChange={(v) => update(i, { field: v })}>
                  <SelectTrigger className="h-8 min-w-0 flex-1 text-[13px]" aria-label={'Condition ' + (i + 1) + ' field'}>
                    <SelectValue placeholder="Choose a field" />
                  </SelectTrigger>
                  <SelectContent className="z-[70] max-h-72">
                    {fieldOptions.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  value={r.field ?? ''}
                  onChange={(e) => update(i, { field: e.target.value })}
                  placeholder="field (e.g. status)"
                  aria-label={'Condition ' + (i + 1) + ' field'}
                  className={inputCls}
                />
              )}
              <Select value={r.operator ?? 'eq'} onValueChange={(v) => update(i, { operator: v })}>
                <SelectTrigger className="h-8 w-[44%] shrink-0 text-[13px]" aria-label={'Condition ' + (i + 1) + ' comparison'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[70] max-h-72">
                  {OPERATORS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={'Remove condition ' + (i + 1)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {op?.noValue ? null : (
              <input
                value={String(r.value ?? '')}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder={op?.value === 'in' || op?.value === 'notIn' ? 'values, separated by commas' : 'value'}
                aria-label={'Condition ' + (i + 1) + ' value'}
                className={inputCls + ' w-full'}
              />
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" /> Add condition
      </button>
    </div>
  );
}
