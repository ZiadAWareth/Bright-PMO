import React from 'react';

interface BaseInputProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
}

interface TextInputProps extends BaseInputProps {
  type: 'text' | 'number' | 'date';
  min?: number;
  step?: number;
}

interface TextareaProps extends BaseInputProps {
  type: 'textarea';
  rows?: number;
}

interface SelectProps extends BaseInputProps {
  type: 'select';
  options: Array<{ value: string; label: string }>;
}

interface CheckboxProps extends BaseInputProps {
  type: 'checkbox';
  id: string;
  label: string;
}

type DynamicInputProps = TextInputProps | TextareaProps | SelectProps | CheckboxProps;

export const DynamicInput: React.FC<DynamicInputProps> = (props) => {
  const { value, onChange, disabled, className, error } = props;
  
  const baseClass = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  const errorClass = error ? "border-red-500" : "border-gray-300 dark:border-gray-600";
  const mergedClass = className || `${baseClass} ${errorClass}`;

  // Text, Number, Date inputs
  if (props.type === 'text' || props.type === 'number' || props.type === 'date') {
    return (
      <input
        type={props.type}
        value={value ?? ''}
        onChange={(e) => {
          if (props.type === 'number') {
            onChange(e.target.value === '' ? '' : Number(e.target.value));
          } else {
            onChange(e.target.value);
          }
        }}
        className={mergedClass}
        placeholder={props.placeholder}
        disabled={disabled}
        min={props.min}
        step={props.step}
      />
    );
  }

  // Textarea
  if (props.type === 'textarea') {
    return (
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={props.rows || 3}
        className={mergedClass}
        placeholder={props.placeholder}
        disabled={disabled}
      />
    );
  }

  // Select
  if (props.type === 'select') {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={mergedClass}
        disabled={disabled}
      >
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // Checkbox
  if (props.type === 'checkbox') {
    return (
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id={props.id}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          disabled={disabled}
        />
        <label htmlFor={props.id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {props.label}
        </label>
      </div>
    );
  }

  return null;
};