"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  ArrowLeft,
  Save,
  X,
  Pencil,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface EPS {
  eps_id: number;
  eps_code: string;
  name: string;
  description: string | null;
  level: number;
  parent_eps_id: number | null;
  projects: any[];
  created_at: string;
  updated_at: string;
}

interface ParentEPS {
  eps_id: number;
  name: string;
  level: number;
}

interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  role: {
    role_name?: string;
    name?: string;
  };
}

const EPSEditPage = () => {
  const router = useRouter();
  const params = useParams();
  const epsId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [eps, setEps] = useState<EPS | null>(null);
  const [allEps, setAllEps] = useState<ParentEPS[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: 1,
    parent_eps_id: null as number | null,
  });

  // Permission checking function
  const canManageEPS = () => {
    if (!user || !user.role) {
      return false;
    }
    const roleName = user.role.role_name || user.role.name;
    return roleName && ["PMO", "PJM", "ADMIN"].includes(roleName);
  };

  // Fetch user data function
  const fetchUserData = async () => {
    try {
      const response = await axios.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setUser(response.data.user);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      toast.error("Failed to load user data");
      router.push("/eps");
    }
  };

  // Fetch EPS data
  const fetchEpsData = async () => {
    if (!epsId) return;

    try {
      const response = await axios.get(`/api/eps/${epsId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = response.data;
      if (!data || !data.eps_id || !data.name) {
        toast.error("Invalid EPS data received");
        router.push("/eps");
        return;
      }

      setEps(data);
      setFormData({
        name: data.name || "",
        description: data.description || "",
        level: data.level || 1,
        parent_eps_id: data.parent_eps_id || null,
      });
    } catch (error: any) {
      console.error("Error fetching EPS data:", error);
      const errorMessage = error.response?.data?.error || "Failed to fetch EPS data";
      toast.error(errorMessage);
      router.push("/eps");
    }
  };

  // Fetch all EPS for parent selection
  const fetchAllEps = async () => {
    try {
      const response = await axios.get("/api/eps", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!Array.isArray(response.data)) {
        console.error("Invalid EPS list data received:", response.data);
        setAllEps([]);
        return;
      }

      const transformedEps = response.data
        .filter((eps: any) => eps && eps.eps_id && eps.name && eps.level)
        .map((eps: EPS) => ({
          eps_id: eps.eps_id,
          name: eps.name,
          level: eps.level,
        }));
      setAllEps(transformedEps);
    } catch (error: any) {
      console.error("Error fetching all EPS:", error);
      toast.error("Failed to fetch EPS list");
      setAllEps([]);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user) {
      if (!canManageEPS()) {
        toast.error("You don't have permission to edit EPS entries");
        router.push("/eps");
        return;
      }
      fetchEpsData();
      fetchAllEps();
    }
  }, [user, epsId]);

  useEffect(() => {
    if (eps && allEps.length > 0) {
      setLoading(false);
    }
  }, [eps, allEps]);

  const filteredParentEpsList =
    formData.level > 1
      ? allEps
          .filter(Boolean)
          .filter(
            (e) => e && e.level === formData.level - 1 && e.eps_id !== eps?.eps_id
          )
      : [];

  const validateForm = () => {
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Name is required.");
      return false;
    }

    if (formData.level < 1 || formData.level > 5) {
      setFormError("Level must be between 1 and 5.");
      return false;
    }

    if (formData.level === 1 && formData.parent_eps_id !== null) {
      setFormError("Level 1 EPS cannot have a parent.");
      return false;
    }

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
        router.push("/eps");
      }
    } catch (error: any) {
      console.error("Error updating EPS:", error);

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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormError(null);

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

  const handleCancel = () => {
    router.push("/eps");
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Edit EPS">
          <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading EPS data...</span>
            </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!eps) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Edit EPS">
          <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                EPS Not Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The EPS you're trying to edit could not be found.
              </p>
              <button
                onClick={() => router.push("/eps")}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Back to EPS List
              </button>
            </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title="Edit EPS">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
                         <div className="flex items-center gap-4 mb-4">
               <button
                 onClick={handleCancel}
                 className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
               >
                 <ArrowLeft size={20} />
                 Back to EPS List
               </button>
             </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Pencil size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Edit EPS
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Modify EPS: {eps.name} ({eps.eps_code})
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* EPS Code (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  EPS Code
                </label>
                <input
                  type="text"
                  value={eps.eps_code}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter EPS name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter EPS description"
                />
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Level *
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      Level {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parent EPS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Parent EPS
                </label>
                <select
                  name="parent_eps_id"
                  value={formData.parent_eps_id ?? ""}
                  onChange={handleChange}
                  disabled={formData.level === 1}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 dark:disabled:bg-slate-600 disabled:text-gray-500 dark:disabled:text-gray-400"
                >
                  {formData.level === 1 ? (
                    <option value="">No Parent</option>
                  ) : (
                    <option value="" disabled>
                      {filteredParentEpsList.length === 0
                        ? "No available parent EPS"
                        : "Select parent EPS"}
                    </option>
                  )}
                  {formData.level > 1 &&
                    filteredParentEpsList.length > 0 &&
                    filteredParentEpsList.map((parentEps) => (
                      <option key={parentEps.eps_id} value={parentEps.eps_id}>
                        {parentEps.name} (Level {parentEps.level})
                      </option>
                    ))}
                </select>
                {formData.level === 1 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Level 1 EPS cannot have a parent.
                  </p>
                )}
              </div>

              {/* Error Display */}
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        {formError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-6 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg flex items-center gap-2 disabled:opacity-60 transition-colors"
                >
                  <Save size={16} />
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default EPSEditPage; 