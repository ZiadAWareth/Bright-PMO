import React from "react";

import { FieldConfig } from "@/components/scheduler/taskHelpers";

interface DynamicFieldProps {
  field: FieldConfig<any>;
  value: any;
  error?: string;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}

export function DynamicField({ field, value, error, onChange, disabled }: DynamicFieldProps) {
  switch (field.type) {
    case "text":
    case "number":
    case "date":
      return (
        <input
          type={field.type}
          value={value ?? ""}
          onChange={e => onChange(field.key as string, field.type === "number" ? Number(e.target.value) : e.target.value)}
          className={field.className}
          placeholder={field.placeholder}
          disabled={disabled}
          min={field.min}
          step={field.step}
        />
      );
    case "textarea":
      return (
        <textarea
          value={value ?? ""}
          onChange={e => onChange(field.key as string, e.target.value)}
          rows={field.rows || 3}
          className={field.className}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
    case "select":
      return (
        <select
          value={value ?? ""}
          onChange={e => onChange(field.key as string, e.target.value)}
          className={field.className}
          disabled={disabled}
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(field.key as string, e.target.checked)}
          className={field.className}
          disabled={disabled}
        />
      );
    default:
      return null;
  }
}
