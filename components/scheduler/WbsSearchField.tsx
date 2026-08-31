import React from "react";
import { X, Calendar } from "lucide-react";
import { ProjectSetup, WBS } from "@/types/project";
import { FieldConfig } from "@/components/scheduler/taskHelpers";


interface WbsSearchFieldProps {
  value: string;
  onChange: (key: string, value: any) => void;
  wbsItems: WBS[];
  error?: string;
  disabled?: boolean;
  setup?: ProjectSetup | null;
  wbsSearchTerm: string;
  setWbsSearchTerm: (v: string) => void;
  showWbsDropdown: boolean;
  setShowWbsDropdown: (v: boolean) => void;
  filteredWbsItems: WBS[];
  formData: Record<string, any>;
  mergedClass: string;
  taskFields: FieldConfig<any>[];
}

export function WbsSearchField({
  value,
  onChange,
  wbsItems,
  error,
  disabled,
  setup,
  wbsSearchTerm,
  setWbsSearchTerm,
  showWbsDropdown,
  setShowWbsDropdown,
  filteredWbsItems,
  formData,
  mergedClass,
  taskFields
}: WbsSearchFieldProps) {
  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={wbsSearchTerm || (() => {
            const selected = wbsItems.find((w) => w.wbs_id === parseInt(value));
            return selected ? `${selected.wbs_code} - ${selected.name} (Level ${selected.level})` : '';
          })()}
          onChange={e => {
            setWbsSearchTerm(e.target.value);
            setShowWbsDropdown(true);
            if (!e.target.value) onChange("wbs_id", "");
          }}
          onFocus={() => setShowWbsDropdown(true)}
          className={mergedClass + ' pr-10'}
          placeholder={taskFields.find((f) => f.key === "wbs_id")?.placeholder || "Search WBS items..."}
          disabled={disabled}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("wbs_id", "");
              setWbsSearchTerm("");
              setShowWbsDropdown(true);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-2 rounded"
            disabled={disabled}
          >
            <X size={16} className="text-muted" />
          </button>
        )}
        {showWbsDropdown && filteredWbsItems.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-surface border border-line rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredWbsItems.map((wbs) => (
              <div
                key={wbs.wbs_id}
                onClick={() => {
                  onChange("wbs_id", wbs.wbs_id.toString());
                  setWbsSearchTerm(`${wbs.wbs_code} - ${wbs.name} (Level ${wbs.level})`);
                  setShowWbsDropdown(false);
                }}
                className="px-3 py-2 cursor-pointer hover:bg-surface-2 text-ink"
              >
                {wbs.wbs_code} - {wbs.name} (Level {wbs.level})
              </div>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="text-danger text-xs mt-1">{error}</p>
      )}
      {/* Show WBS date constraints */}
      {value && (() => {
        const selectedWBS = wbsItems.find((wbs) => wbs.wbs_id === parseInt(value));
        if (selectedWBS && (selectedWBS.start_date || selectedWBS.end_date)) {
          return (
            <div className="mt-2 p-3 bg-info-soft border border-info rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Calendar size={14} className="text-info" />
                <span className="text-sm font-medium text-info">
                  WBS Date Constraints
                </span>
              </div>
              <div className="text-xs text-info">
                {selectedWBS.start_date && (
                  <div>
                    • Task must start on or after: {new Date(selectedWBS.start_date).toLocaleDateString("en-GB")}
                  </div>
                )}
                {selectedWBS.end_date && (
                  <div>
                    • Task must end on or before: {selectedWBS.end_date ? new Date(selectedWBS.end_date).toLocaleDateString("en-GB") : 'N/A'}
                  </div>
                )}
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
