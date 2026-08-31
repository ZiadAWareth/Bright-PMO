"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Save, AlertCircle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";
import {
  CancelButton,
  Field,
  FieldGrid,
  FormError,
  FormFooter,
  FormSection,
  PageHeader,
  SubmitButton,
  inputClass,
  textareaClass,
} from "@/components/ui/form-shell";

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
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit EPS"
              subtitle="Update this node in the enterprise project structure"
              backHref="/eps"
              backLabel="Back to EPS"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading EPS data…
              </span>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!eps) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit EPS"
              backHref="/eps"
              backLabel="Back to EPS"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  EPS not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The EPS you are trying to edit could not be found.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href="/eps">Back to EPS list</CancelButton>
                </div>
              </div>
            </FormSection>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout hideHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PageHeader
            title="Edit EPS"
            subtitle={`${eps.name} (${eps.eps_code})`}
            backHref="/eps"
            backLabel="Back to EPS"
          />

          <FormError>{formError}</FormError>

          <FormSection
            title="Details"
            description="Name and describe this level of the structure."
          >
            <FieldGrid>
              <Field
                label="EPS Code"
                htmlFor="eps-code"
                hint="Generated when the node was created and cannot be changed."
              >
                <input
                  id="eps-code"
                  type="text"
                  value={eps.eps_code}
                  disabled
                  className={inputClass}
                />
              </Field>

              <Field label="Name" required htmlFor="eps-name">
                <input
                  id="eps-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Infrastructure Programme"
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Description" htmlFor="eps-description" full>
                <textarea
                  id="eps-description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="What sits under this node?"
                  disabled={isSubmitting}
                  className={textareaClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Placement"
            description="Where this node sits in the hierarchy."
          >
            <FieldGrid>
              <Field
                label="Level"
                required
                htmlFor="eps-level"
                hint="Level 1 is a root node."
              >
                <Dropdown
                  id="eps-level"
                  value={String(formData.level ?? "")}
                  onChange={(__v: string) =>
                    handleChange({
                      target: { name: "level", value: __v },
                    } as React.ChangeEvent<HTMLSelectElement>)
                  }
                  options={[1, 2, 3, 4, 5].map((level) => ({
                    value: String(level),
                    label: `Level ${level}`,
                  }))}
                  name="level"
                  disabled={isSubmitting}
                />
              </Field>

              <Field
                label="Parent EPS"
                required={formData.level > 1}
                htmlFor="eps-parent"
                hint={
                  formData.level === 1
                    ? "Root nodes have no parent."
                    : filteredParentEpsList.length === 0
                      ? `No level ${formData.level - 1} EPS exists yet.`
                      : `Showing level ${formData.level - 1} nodes only.`
                }
              >
                <Dropdown
                  id="eps-parent"
                  name="parent_eps_id"
                  value={String(formData.parent_eps_id ?? "")}
                  onChange={(__v: string) =>
                    handleChange({
                      target: { name: "parent_eps_id", value: __v },
                    } as React.ChangeEvent<HTMLSelectElement>)
                  }
                  disabled={formData.level === 1 || isSubmitting}
                  ariaLabel="Parent EPS"
                  options={[
                    formData.level === 1
                      ? { value: "", label: "No parent" }
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
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton onClick={handleCancel} />
            <SubmitButton
              busy={isSubmitting}
              busyLabel="Saving…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Save Changes
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default EPSEditPage; 