"use client";

import { Minus, Plus } from "lucide-react";
import { inputClass } from "@/components/ui/form-shell";

/**
 * A repeating list of free-text tags.
 *
 * Several forms collect tags this way, and each had grown its own copy of the
 * add / remove / update trio. Keeping one implementation means the remove
 * button's affordance and the "keep at least one row" rule are decided once.
 *
 * The value is the raw array including empty rows, so the parent stays in
 * control of trimming on submit — filtering here would delete a row the user
 * is still typing into.
 */
export function TagsField({
  tags,
  onChange,
  disabled,
  placeholderPrefix = "Tag",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholderPrefix?: string;
}) {
  const rows = tags.length > 0 ? tags : [""];

  const update = (index: number, value: string) =>
    onChange(rows.map((tag, i) => (i === index ? value : tag)));

  const remove = (index: number) =>
    onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {rows.map((tag, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={tag}
            onChange={(e) => update(index, e.target.value)}
            placeholder={`${placeholderPrefix} ${index + 1}`}
            disabled={disabled}
            className={inputClass}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={disabled}
              aria-label={`Remove ${placeholderPrefix.toLowerCase()} ${index + 1}`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
            >
              <Minus size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, ""])}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-[13px] font-medium text-bright-deep transition-colors hover:bg-bright-soft disabled:opacity-60"
      >
        <Plus size={16} aria-hidden="true" />
        Add {placeholderPrefix.toLowerCase()}
      </button>
    </div>
  );
}
