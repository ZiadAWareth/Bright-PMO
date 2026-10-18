import React from 'react';
import { Dropdown } from "@/components/ui/dropdown";

interface DependencyConfigCardProps {
  taskName: string;
  dependencyType: string;
  lagTime: number;
  onTypeChange: (type: string) => void;
  onLagChange: (lag: number) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const DEPENDENCY_TYPES = [
  { value: 'finish_to_start', label: 'Finish to Start' },
  { value: 'start_to_start', label: 'Start to Start' },
  { value: 'finish_to_finish', label: 'Finish to Finish' },
  { value: 'start_to_finish', label: 'Start to Finish' },
];

const getDependencyDescription = (type: string, lag: number): string => {
  const lagText = lag !== 0 ? ` ${lag > 0 ? '+' : ''}${lag} days` : '';
  
  const descriptions: Record<string, string> = {
    finish_to_start: `This task starts after the predecessor finishes${lagText}`,
    start_to_start: `This task starts when the predecessor starts${lagText}`,
    finish_to_finish: `This task finishes when the predecessor finishes${lagText}`,
    start_to_finish: `This task finishes when the predecessor starts${lagText}`,
  };
  
  return descriptions[type] || '';
};

export const DependencyConfigCard: React.FC<DependencyConfigCardProps> = ({
  taskName,
  dependencyType,
  lagTime,
  onTypeChange,
  onLagChange,
  onRemove,
  disabled = false,
}) => {
  return (
    <div className="p-3 bg-surface-2 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-ink-3">
          {taskName}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="px-3 py-1 text-xs font-medium text-danger hover:text-danger hover:bg-danger-soft border border-danger rounded-md transition-colors disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      {/* Configuration Inputs */}
      <div className="grid grid-cols-2 gap-3">
        {/* Dependency Type */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Dependency Type
          </label>
          <Dropdown
            value={String(dependencyType ?? '')}
            onChange={(__v: string) => onTypeChange(__v)}
            options={[
            ...DEPENDENCY_TYPES.map((type) => ({ value: String(type.value), label: type.label })),
          ]}
            disabled={disabled}
          />
        </div>

        {/* Lag Time */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Lag Time (days)
          </label>
          <input
            type="number"
            value={lagTime}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || value === '-') return;
              const numValue = parseInt(value);
              if (!isNaN(numValue)) {
                onLagChange(numValue);
              }
            }}
            onBlur={(e) => {
              const value = e.target.value;
              if (value === '' || value === '-') {
                onLagChange(0);
              }
            }}
            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-info bg-surface text-ink"
            disabled={disabled}
            placeholder="0 (negative = lead)"
          />
        </div>
      </div>

      {/* Description */}
      <div className="mt-2 text-xs text-muted">
        {getDependencyDescription(dependencyType, lagTime)}
        <span className="block mt-1 text-faint">
          💡 Positive = lag (delay), Negative = lead (overlap)
        </span>
      </div>
    </div>
  );
};