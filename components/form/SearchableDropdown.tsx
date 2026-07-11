import React from 'react';
import { X } from 'lucide-react';

interface SearchableDropdownProps<T> {
  value: string;
  searchTerm: string;
  showDropdown: boolean;
  filteredItems: T[];
  displayValue: string;
  onSearchChange: (value: string) => void;
  onFocus: () => void;
  onSelect: (item: T) => void;
  onClear: () => void;
  renderItem: (item: T) => React.ReactNode;
  getItemKey: (item: T) => string | number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function SearchableDropdown<T>({
  value,
  searchTerm,
  showDropdown,
  filteredItems,
  displayValue,
  onSearchChange,
  onFocus,
  onSelect,
  onClear,
  renderItem,
  getItemKey,
  placeholder = "Search...",
  disabled = false,
  className = "",
  error,
}: SearchableDropdownProps<T>) {
  const baseClass = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  const errorClass = error ? "border-red-500" : "border-gray-300 dark:border-gray-600";
  const mergedClass = `${baseClass} ${errorClass} ${className}`;

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          onSearchChange(e.target.value);
          if (!e.target.value) onClear();
        }}
        onFocus={onFocus}
        className={`${mergedClass} pr-10`}
        placeholder={placeholder}
        disabled={disabled}
      />
      
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
          disabled={disabled}
        >
          <X size={16} className="text-gray-500" />
        </button>
      )}
      
      {showDropdown && filteredItems.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredItems.map((item) => (
            <div
              key={getItemKey(item)}
              onClick={() => onSelect(item)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}