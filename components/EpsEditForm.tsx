import React, { useState, useEffect } from "react";
import { Save, X, Pencil } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";


interface EPS {
  eps_id: number;
  eps_code: string;
  name: string;
  description: string | null;
  level: number;
  parent_eps_id: number | null;
}

interface ParentEPS {
  eps_id: number;
  name: string;
  level: number;
}

interface EpsEditFormProps {
  eps: EPS | null;
  allEps: ParentEPS[];
  onClose: () => void;
  onSuccess: () => void;
}

const EpsEditForm: React.FC<EpsEditFormProps> = ({ eps, allEps = [], onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    eps_code: "",
    name: "",
    description: "",
    level: 1,
    parent_eps_id: null as number | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (eps) {
      setFormData({
        eps_code: eps.eps_code || "",
        name: eps.name || "",
        description: eps.description || "",
        level: eps.level || 1,
        parent_eps_id: eps.parent_eps_id || null,
      });
      setIsInitialized(true);
    }
  }, [eps]);

  const filteredParentEpsList =
    formData.level > 1
      ? (allEps || []).filter(
          (e) => e.level === formData.level - 1 && e.eps_id !== eps?.eps_id
        )
      : [];

  const validateForm = () => {
    setFormError(null);

    // Basic validation
    if (!formData.name.trim()) {
      setFormError("Name is required.");
      return false;
    }

    if (formData.level < 1 || formData.level > 5) {
      setFormError("Level must be between 1 and 5.");
      return false;
    }

    // Level 1 validation
    if (formData.level === 1 && formData.parent_eps_id !== null) {
      setFormError("Level 1 EPS cannot have a parent.");
      return false;
    }

    // Level > 1 validation
    if (formData.level > 1) {
      if (formData.parent_eps_id === null) {
        setFormError(`Level ${formData.level} EPS must have a parent.`);
        return false;
      }

      if (!filteredParentEpsList.some((e) => e.eps_id === formData.parent_eps_id)) {
        setFormError(
          `Please select a valid parent EPS of level ${formData.level - 1}.`
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eps?.eps_id) {
      setFormError("EPS data is not available. Please try again.");
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        level: Number(formData.level),
        parent_eps_id: formData.parent_eps_id,
      };

      const response = await axios.put(`/api/eps/${eps.eps_id}`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.status === 200) {
        toast.success("EPS updated successfully");
        onSuccess?.();
      }
    } catch (error: any) {
      console.error("Error updating EPS:", error);
      
      // Handle specific error responses from the API
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        setFormError(errorMessage);
        toast.error(errorMessage);
      } else if (error.response?.status === 401) {
        setFormError("Authentication failed. Please log in again.");
        toast.error("Authentication failed. Please log in again.");
      } else if (error.response?.status === 403) {
        setFormError("You don't have permission to edit this EPS.");
        toast.error("You don't have permission to edit this EPS.");
      } else if (error.response?.status === 409) {
        // Conflict - duplicate name
        const errorMessage = error.response.data?.error || "An EPS with this name already exists under the same parent.";
        setFormError(errorMessage);
        toast.error(errorMessage);
      } else if (error.response?.status >= 500) {
        setFormError("Server error occurred. Please try again later.");
        toast.error("Server error occurred. Please try again later.");
      } else {
        setFormError("Failed to update EPS. Please try again.");
        toast.error("Failed to update EPS. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormError(null); // Clear error when user makes changes
    
    setFormData((prev) => {
      let updated = {
        ...prev,
        [name]:
          name === "parent_eps_id"
            ? value === ""
              ? null
              : parseInt(value, 10)
            : name === "level"
            ? Number(value)
            : value,
      };
      if (name === "level") {
        updated.parent_eps_id = null;
      }
      return updated;
    });
  };

  // Early return if eps is not provided or not yet initialized
  if (!eps || !isInitialized) {
    return (
      <div className="w-full max-w-xl mx-auto bg-surface rounded-2xl shadow-xl border border-line px-8 py-10 relative">
        <div className="flex items-center justify-center py-8">
          <Spinner size={32} className="text-bright-primary" />
          <span className="ml-2 text-muted">Loading EPS data...</span>
        </div>
      </div>
    );
  }

    return (
      <div className="w-full max-w-xl mx-auto bg-surface rounded-2xl shadow-xl border border-line px-8 py-10 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Pencil size={20} className="text-bright" />
            <h2 className="text-xl font-semibold text-ink">
              Edit EPS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-faint hover:text-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* EPS Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-1">
                  EPS Code
                </label>
                <input
                  type="text"
                  value={formData.eps_code || ""}
                  disabled
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface-2 text-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface text-ink"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-ink-3 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-line rounded-md text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-bright"
              />
            </div>

            {/* Level */}
            <div>
              <label
                htmlFor="level"
                className="block text-sm font-medium text-ink-3 mb-1"
              >
                Level
              </label>
              <Dropdown
                value={String(formData.level ?? '')}
                onChange={(__v: string) => handleChange({ target: { name: "level", value: __v } } as React.ChangeEvent<HTMLSelectElement>)}
                options={[
                ...[1, 2, 3, 4, 5].map((level) => ({ value: String(level), label: `Level ${level}` })),
              ]}
                id="level"
                name="level"
                required={true}
              />
            </div>

            {/* Parent EPS */}
            <div>
              <label
                htmlFor="parent_eps_id"
                className="block text-sm font-medium text-ink-3 mb-1"
              >
                Parent EPS
              </label>
              <Dropdown
                id="parent_eps_id"
                name="parent_eps_id"
                value={String(formData.parent_eps_id ?? "")}
                onChange={(__v: string) =>
                  handleChange({
                    target: { name: "parent_eps_id", value: __v },
                  } as React.ChangeEvent<HTMLSelectElement>)
                }
                disabled={formData.level === 1}
                ariaLabel="Parent EPS"
                options={[
                  formData.level === 1
                    ? { value: "", label: "No Parent" }
                    : {
                        value: "",
                        label:
                          filteredParentEpsList.length === 0
                            ? "No available parent EPS"
                            : "Select parent EPS",
                        disabled: true,
                      },
                  ...(formData.level > 1
                    ? filteredParentEpsList.map((parentEps) => ({
                        value: String(parentEps.eps_id),
                        label: `${parentEps.name} (Level ${parentEps.level})`,
                      }))
                    : []),
                ]}
              />
              {formData.level === 1 && (
                <p className="text-xs text-muted mt-1">
                  Level 1 EPS cannot have a parent.
                </p>
              )}
              {formError && (
                <p className="text-xs text-danger mt-1 font-semibold">
                  {formError}
                </p>
              )}
            </div>

            {/* Global Error Display */}
            {formError && (
              <div className="bg-danger-soft border border-danger rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-danger" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-danger font-medium">
                      {formError}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              className="px-4 py-2 rounded-md text-ink-3 font-medium hover:bg-surface-2 transition-colors"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-md bg-bright hover:bg-bright-deep text-white font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors"
              disabled={isSubmitting}
            >
              <Save size={16} />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    );
};

export default EpsEditForm;
