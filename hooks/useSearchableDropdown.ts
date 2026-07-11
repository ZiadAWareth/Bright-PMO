import { useState, useEffect } from "react";

interface UseSearchableDropdownProps<T> {
  items: T[];
  filterFn: (item: T, searchTerm: string) => boolean;
  displayFn: (item: T) => string;
  selectedValue?: string | number;
}

interface UseSearchableDropdownReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  filteredItems: any[];
  displayValue: string;
  handleSelect: (item: any, onSelect: (item: any) => void) => void;
  handleClear: (onClear: () => void) => void;
}

export const useSearchableDropdown = <T,>({
  items,
  filterFn,
  displayFn,
  selectedValue,
}: UseSearchableDropdownProps<T>): UseSearchableDropdownReturn => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter items based on search term
  const filteredItems = items.filter((item) =>
    filterFn(item, searchTerm)
  );

  // Get display value for selected item
  const displayValue = (() => {
    if (searchTerm) return searchTerm;
    
    if (selectedValue) {
      const selected = items.find((item: any) => {
        // Handle both number and string IDs
        return item.wbs_id === selectedValue || 
               item.wbs_id === parseInt(String(selectedValue)) ||
               item.task_id === selectedValue ||
               item.task_id === parseInt(String(selectedValue));
      });
      return selected ? displayFn(selected) : "";
    }
    
    return "";
  })();

  /**
   * Handle item selection
   */
  const handleSelect = (item: any, onSelect: (item: any) => void) => {
    onSelect(item);
    setSearchTerm(displayFn(item));
    setShowDropdown(false);
  };

  /**
   * Handle clearing selection
   */
  const handleClear = (onClear: () => void) => {
    onClear();
    setSearchTerm("");
    setShowDropdown(true);
  };

  // Reset search term when dropdown closes
  useEffect(() => {
    if (!showDropdown && selectedValue) {
      setSearchTerm("");
    }
  }, [showDropdown, selectedValue]);

  return {
    searchTerm,
    setSearchTerm,
    showDropdown,
    setShowDropdown,
    filteredItems,
    displayValue,
    handleSelect,
    handleClear,
  };
};