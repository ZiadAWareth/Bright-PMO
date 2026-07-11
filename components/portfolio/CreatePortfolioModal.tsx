"use client";

import React, { useState } from "react";
import { Plus, CheckCircle, AlertCircle, X, Minus } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface PortfolioFormData {
  name: string;
  description: string;
  strategicObjective: string;
  tags: string[];
  priority: "high" | "medium" | "low";
  budgetCapacity: string;
}

interface CreatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePortfolioModal: React.FC<CreatePortfolioModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<PortfolioFormData>({
    name: "",
    description: "",
    strategicObjective: "",
    tags: [""],
    priority: "medium",
    budgetCapacity: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  const addTag = () => {
    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, ""],
    }));
  };

  const removeTag = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const updateTag = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.map((tag, i) => (i === index ? value : tag)),
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      strategicObjective: "",
      tags: [""],
      priority: "medium",
      budgetCapacity: "",
    });
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      // Client-side validation for required fields
      const missingFields = [];
      if (!formData.name.trim()) missingFields.push("Portfolio Name");
      if (!formData.description.trim()) missingFields.push("Description");
      if (!formData.strategicObjective.trim())
        missingFields.push("Strategic Objective");

      if (missingFields.length > 0) {
        toast.error(
          `Please fill in the following required fields: ${missingFields.join(
            ", "
          )}`,
          {
            icon: <AlertCircle className="text-red-500" />,
            className: "glass-error",
          }
        );
        setIsSubmitting(false);
        return;
      }

      // Map form data to API expected format
      const apiData = {
        name: formData.name,
        description: formData.description,
        strategic_objective: formData.strategicObjective,
        tags: formData.tags.filter((tag) => tag.trim() !== ""),
        priority: formData.priority,
        status: "active", // Set default status when creating
        budget_capacity: formData.budgetCapacity ? parseFloat(formData.budgetCapacity) : 0,
      };

      // Get the token from local storage
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found. Please log in.", {
          icon: <AlertCircle className="text-red-500" />,
          className: "glass-error",
        });
        setIsSubmitting(false);
        return;
      }

      // Use axios to make the POST request
      const response = await axios.post("/api/portfolios", apiData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Portfolio created successfully", {
        icon: <CheckCircle className="text-green-500" />,
        className: "glass-success",
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Portfolio creation error:", error);

      // Handle different types of errors
      let errorMessage = "Failed to create portfolio";

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 400) {
          // Validation error
          if (data?.error) {
            errorMessage = data.error;
          } else if (data?.details) {
            // If the API returns field-specific validation errors
            errorMessage = `Validation failed: ${data.details}`;
          } else {
            errorMessage =
              "Please check that all required fields are filled correctly";
          }
        } else if (status === 401) {
          errorMessage =
            "You are not authorized to create portfolios. Please log in again.";
        } else if (status === 403) {
          errorMessage = "You don't have permission to create portfolios";
        } else if (status === 409) {
          errorMessage = "A portfolio with this name already exists";
        } else if (status >= 500) {
          errorMessage = "Server error occurred. Please try again later.";
        } else {
          errorMessage = data?.error || `Error creating portfolio (${status})`;
        }
      } else if (error.request) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else {
        errorMessage = error.message || "An unexpected error occurred";
      }

      toast.error(errorMessage, {
        icon: <AlertCircle className="text-red-500" />,
        className: "glass-error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMouseDownOnBackdrop(true);
    } else {
      setMouseDownOnBackdrop(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop) {
      handleClose();
    }
    setMouseDownOnBackdrop(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-transparent backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Plus
                size={20}
                className="text-orange-600 dark:text-orange-400"
              />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Create New Portfolio
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <form
            id="portfolio-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Portfolio Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter portfolio name"
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                placeholder="Brief portfolio description"
                required
              />
            </div>

            <div>
              <label
                htmlFor="strategicObjective"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Strategic Objective *
              </label>
              <textarea
                id="strategicObjective"
                value={formData.strategicObjective}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    strategicObjective: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe the strategic objective"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              {formData.tags.map((tag, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => updateTag(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                    placeholder={`Tag ${index + 1}`}
                  />
                  {formData.tags.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addTag}
                className="flex items-center space-x-2 px-3 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
              >
                <Plus size={16} />
                <span>Add Tag</span>
              </button>
            </div>

            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as PortfolioFormData["priority"],
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="budgetCapacity"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Budget Capacity (OMR)
              </label>
              <input
                type="number"
                id="budgetCapacity"
                min="0"
                step="0.01"
                value={formData.budgetCapacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    budgetCapacity: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter budget capacity (e.g., 1000000)"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Total budget capacity allocated to this portfolio
              </p>
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="portfolio-form"
            disabled={isSubmitting}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Create Portfolio</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePortfolioModal;
