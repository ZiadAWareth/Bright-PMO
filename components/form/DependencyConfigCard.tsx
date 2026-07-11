import React from 'react';

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
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {taskName}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md transition-colors disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      {/* Configuration Inputs */}
      <div className="grid grid-cols-2 gap-3">
        {/* Dependency Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Dependency Type
          </label>
          <select
            value={dependencyType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
            disabled={disabled}
          >
            {DEPENDENCY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Lag Time */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
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
            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
            disabled={disabled}
            placeholder="0 (negative = lead)"
          />
        </div>
      </div>

      {/* Description */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {getDependencyDescription(dependencyType, lagTime)}
        <span className="block mt-1 text-gray-400">
          💡 Positive = lag (delay), Negative = lead (overlap)
        </span>
      </div>
    </div>
  );
};