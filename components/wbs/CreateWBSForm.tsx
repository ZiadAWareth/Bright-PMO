import React, { useState } from "react";
import { ArrowLeft, Plus, CheckCircle, AlertTriangle, X } from "lucide-react";

// Types
import { WBSItem } from "@/types/project";

interface Project {
  project_id: number;
  project_code: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  planned_end_date: string;
  budget_amount: number;
  progress_percentage: number;
}
// Create WBS Form Component
const CreateWBSForm = ({
  onClose,
  onSave,
  project,
  creating,
  wbsData,
}: {
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    level: number;
    start_date: string;
    end_date: string;
    budget_amount: number;
    parent_wbs_id?: number | null;
    progress_weight?: number | null;
  }) => void;
  project: Project | null;
  creating: boolean;
  wbsData: WBSItem[];
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: 1,
    start_date: project?.start_date
      ? new Date(project.start_date).toISOString().split("T")[0]
      : "",
    budget_amount: 0,
    parent_wbs_id: null as number | null,
    progress_weight: "" as number | "",
  });

  const [availableParents, setAvailableParents] = useState<WBSItem[]>([]);
  const [budgetInfo, setBudgetInfo] = useState<{
    availableBudget: number;
    parentBudget: number;
    usedBudget: number;
    recommendedBudget?: number;
    budgetType: string;
  } | null>(null);

  // Update available parents when component mounts or level changes
  React.useEffect(() => {
    updateAvailableParents(formData.level);
  }, [formData.level, wbsData]);

  // Update budget info when parent changes
  React.useEffect(() => {
    updateBudgetInfo();
  }, [formData.parent_wbs_id, formData.level, project]);

  const updateBudgetInfo = () => {
    if (!project) return;

    if (formData.level === 0) {
      // Level 0 must be exactly project budget - lock it to project budget
      setBudgetInfo({
        availableBudget: project.budget_amount,
        parentBudget: project.budget_amount,
        usedBudget: 0,
        recommendedBudget: project.budget_amount,
        budgetType: "Level 0 (Root) must equal project budget",
      });
      // Force the budget amount to be the project budget
      setFormData((prev) => ({
        ...prev,
        budget_amount: project.budget_amount,
      }));
      return;
    }

    // For other levels, check parent's available budget
    if (formData.parent_wbs_id) {
      // Find the parent WBS
      const flattenWBS = (items: WBSItem[]): WBSItem[] => {
        let result: WBSItem[] = [];
        items.forEach((item) => {
          result.push(item);
          if (item.children) {
            result = result.concat(flattenWBS(item.children));
          }
        });
        return result;
      };

      const allWBSItems = flattenWBS(wbsData);
      const parent = allWBSItems.find(
        (item) => item.wbs_id === formData.parent_wbs_id
      );

      if (parent) {
        // Calculate parent's used budget (sum of all children)
        const parentBudget = parent.budget_amount || 0;
        const siblingBudgetSum =
          parent.children?.reduce(
            (sum, child) => sum + (child.budget_amount || 0),
            0
          ) || 0;

        const availableBudget = parentBudget - siblingBudgetSum;

        setBudgetInfo({
          availableBudget: availableBudget > 0 ? availableBudget : 0,
          parentBudget: parentBudget,
          usedBudget: siblingBudgetSum,
          recommendedBudget: Math.floor(availableBudget / 5) * 5, // Round to nearest 5
          budgetType: `Available from parent "${parent.name}"`,
        });

        // Set a default budget amount (can be changed by user)
        if (formData.budget_amount <= 0) {
          setFormData((prev) => ({
            ...prev,
            budget_amount: Math.min(
              10000,
              availableBudget > 0 ? availableBudget : 0
            ),
          }));
        }

        return;
      }
    }

    // Default case if no parent is selected or found
    setBudgetInfo({
      availableBudget: 0,
      parentBudget: 0,
      usedBudget: 0,
      recommendedBudget: 0,
      budgetType: `Select a parent to see available budget`,
    });
  };

  // Function to get available parents based on level
  const updateAvailableParents = (level: number) => {
    if (level === 0) {
      setAvailableParents([]);
      setFormData((prev) => ({ ...prev, parent_wbs_id: null }));
      return;
    }

    const flattenWBS = (items: WBSItem[]): WBSItem[] => {
      let result: WBSItem[] = [];
      items.forEach((item) => {
        result.push(item);
        if (item.children) {
          result = result.concat(flattenWBS(item.children));
        }
      });
      return result;
    };

    const allWBSItems = flattenWBS(wbsData);
    const parentLevel = level - 1;
    const potentialParents = allWBSItems.filter(
      (item: WBSItem) => item.level === parentLevel
    );

    setAvailableParents(potentialParents);

    // Auto-select first parent if only one available
    if (potentialParents.length === 1) {
      setFormData((prev) => ({
        ...prev,
        parent_wbs_id: potentialParents[0].wbs_id,
      }));
    } else {
      setFormData((prev) => ({ ...prev, parent_wbs_id: null }));
    }
  };

  // State for error popup
  const [errorPopup, setErrorPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: "",
    message: "",
  });

  // Function to show error popup
  const showErrorPopup = (title: string, message: string) => {
    setErrorPopup({
      show: true,
      title,
      message,
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setErrorPopup((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleSave = () => {
    // Validate required fields with trim check to prevent spaces-only input
    const errors: string[] = [];
    
    if (!formData.name || !formData.name.trim()) {
      errors.push("Name is required and cannot be blank or contain only spaces");
    }
    if (!formData.start_date) {
      errors.push("Start date is required");
    }
    // REMOVED end_date validation since it will be calculated from tasks
    
    if (errors.length > 0) {
      showErrorPopup("Validation Error", errors.join(". "));
      return;
    }

    // REMOVED date comparison validation since end_date might be null

    // Check if parent is required and selected
    if (formData.level > 0 && !formData.parent_wbs_id) {
      showErrorPopup(
        "Parent Required",
        "Please select a parent WBS for this level"
      );
      return;
    }

    // Budget validation based on new rules
    if (formData.level === 0) {
      // For Level 0, always force the budget to match project budget
      if (project) {
        // Ensure the budget is set to project budget
        setFormData((prev) => ({
          ...prev,
          budget_amount: project.budget_amount,
        }));
      } else {
        showErrorPopup(
          "Project Not Found",
          "Unable to set budget for Level 0 WBS because project information is missing"
        );
        return;
      }
    }

    if (formData.budget_amount < 0) {
      showErrorPopup("Invalid Budget", "Budget amount cannot be negative");
      return;
    }

    // Check if budget exceeds available budget from parent
    if (
      formData.level > 0 &&
      budgetInfo &&
      formData.budget_amount > budgetInfo.availableBudget
    ) {
      showErrorPopup(
        "Budget Exceeded",
        `Budget amount exceeds available budget from parent. Maximum available: OMR ${budgetInfo.availableBudget.toLocaleString()}`
      );
      return;
    }

    onSave({
      ...formData,
      end_date: "",
      parent_wbs_id: formData.parent_wbs_id,
      progress_weight: formData.progress_weight === "" || formData.progress_weight == null ? undefined : formData.progress_weight,
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Create New WBS Item
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add a custom work breakdown structure item
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Form */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter WBS item name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Level
            </label>
            <select
              value={formData.level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  level: parseInt(e.target.value),
                })
              }
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Level 0 (Root)</option>
              <option value={1}>Level 1 (Main Phase)</option>
              <option value={2}>Level 2</option>
              <option value={3}>Level 3</option>
              <option value={4}>Level 4</option>
            </select>
          </div>
        </div>

        {/* Parent WBS Selection - only show for levels > 0 */}
        {formData.level > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Parent WBS *
            </label>
            {availableParents.length === 0 ? (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  No Level {formData.level - 1} WBS items found. Please create a
                  Level {formData.level - 1} parent first.
                </p>
              </div>
            ) : (
              <select
                value={formData.parent_wbs_id || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parent_wbs_id: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a parent WBS...</option>
                {availableParents.map((parent) => (
                  <option key={parent.wbs_id} value={parent.wbs_id}>
                    {parent.wbs_code} - {parent.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({
                ...formData,
                description: e.target.value,
              })
            }
            rows={3}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter WBS item description"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  start_date: e.target.value,
                })
              }
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <div className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              Will be calculated from tasks
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              End date will be automatically calculated when tasks are added to this WBS
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Budget Amount (OMR) *
          </label>
          <div>
            <input
              type="number"
              value={formData.budget_amount}
              onChange={(e) => {
                if (formData.level !== 0) {
                  setFormData({
                    ...formData,
                    budget_amount: parseFloat(e.target.value) || 0,
                  });
                }
              }}
              disabled={formData.level === 0}
              className={`w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formData.level === 0
                  ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400"
                  : "bg-white dark:bg-gray-700"
              }`}
              min="0"
              step="0.01"
              placeholder={
                formData.level === 0
                  ? "Project budget amount"
                  : "Enter budget amount"
              }
              required
            />
            {formData.level === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Budget is locked to the project budget amount
              </p>
            )}
          </div>

          {/* Budget Information Display */}
          {budgetInfo && (
            <div className="mt-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Budget Information
                </h4>
                <div className="text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-blue-700 dark:text-blue-300">
                      {budgetInfo.budgetType}
                    </span>
                  </div>

                  {formData.level === 0 && (
                    <div className="mt-2">
                      <div className="flex items-center text-blue-700 dark:text-blue-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-blue-600 dark:text-blue-400 mr-1"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <span>Budget is locked to project budget</span>
                      </div>
                      <div className="mt-1 text-blue-700 dark:text-blue-300">
                        Amount:{" "}
                        <span className="font-bold text-green-600 dark:text-green-400">
                          OMR {project?.budget_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {formData.level > 0 && formData.parent_wbs_id && (
                    <div className="mt-2 space-y-1">
                      <div className="text-blue-700 dark:text-blue-300">
                        Parent Budget:{" "}
                        <span className="font-medium">
                          OMR {budgetInfo.parentBudget.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-blue-700 dark:text-blue-300">
                        Already Allocated:{" "}
                        <span className="font-medium">
                          OMR {budgetInfo.usedBudget.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-green-700 dark:text-green-300">
                        Available:{" "}
                        <span className="font-bold">
                          OMR {budgetInfo.availableBudget.toLocaleString()}
                        </span>
                      </div>
                      {budgetInfo.availableBudget <= 0 && (
                        <div className="text-red-600 dark:text-red-400 font-medium mt-1">
                          No budget available from parent. Cannot create WBS
                          with budget.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Progress weight (%) <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">Optional</span>
          </label>
          <input
            type="number"
            value={formData.progress_weight === "" ? "" : formData.progress_weight}
            onChange={(e) => {
              const v = e.target.value;
              setFormData({
                ...formData,
                progress_weight: v === "" ? "" : parseFloat(v) || 0,
              });
            }}
            placeholder="Leave empty for equal weight"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            max="100"
            step="0.1"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Weight (0–100) used when rolling up to project progress. Empty = equal share with siblings.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          disabled={creating}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={
            creating ||
            !formData.name ||
            !formData.start_date
            // end_date requirement removed
          }
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Create WBS</span>
            </>
          )}
        </button>
      </div>

      {/* Error Popup */}
      {errorPopup.show && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[10000]"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            style={{
              animation: "fadeIn 0.3s ease-out",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-4">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {errorPopup.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please correct and try again
                </p>
              </div>
              <button
                onClick={() =>
                  setErrorPopup((prev) => ({ ...prev, show: false }))
                }
                className="ml-auto p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {errorPopup.message}
            </p>
            <button
              onClick={() =>
                setErrorPopup((prev) => ({ ...prev, show: false }))
              }
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateWBSForm;