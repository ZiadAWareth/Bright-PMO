"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Save, AlertCircle } from "lucide-react";
import { notConnected } from "@/lib/not-connected";
import { toast } from "sonner";
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

  // notConnected: the EPS (to prefill the form) and the EPS list (parent
  // options) would be loaded here. Until then there is no EPS, so the page
  // shows its empty state.
  const [eps] = useState<EPS | null>(null);
  const [allEps] = useState<ParentEPS[]>([]);
  const loading = false;
  const isSubmitting = false;
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: 1,
    parent_eps_id: null as number | null,
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!eps?.eps_id) {
      setFormError("EPS data is not available. Please try again.");
      return;
    }

    if (!validateForm()) return;

    notConnected("Updating the EPS");
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
      <>
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
      </>
    );
  }

  if (!eps) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
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
    </>
  );
};

export default EPSEditPage; 