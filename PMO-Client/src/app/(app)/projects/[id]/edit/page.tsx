"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Save } from "lucide-react";
import { notConnected } from "@/lib/not-connected";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
import { Dropdown } from "@/components/ui/dropdown";
import { Spinner } from "@/components/ui/spinner";

interface Portfolio {
  portfolio_id: number;
  name: string;
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const COMPLIANCE_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "compliant", label: "Compliant" },
  { value: "non_compliant", label: "Non-compliant" },
];

const STRATEGIC_VALUE_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/**
 * Edit a project.
 *
 * Replaces the modal that opened from both the directory and the detail
 * screen. A full route means the form is linkable, survives a refresh, and has
 * room to group its fields the way the create screen does.
 */
export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  // notConnected: the project (to prefill the form) and the portfolios would be
  // loaded here. Until then the form starts empty.
  const loading = false;
  const notFound = false;
  const submitting = false;
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string>("");

  const [portfolios] = useState<Portfolio[]>([]);
  const [projectName] = useState("");
  const [projectCode] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "medium",
    compliance: "pending",
    strategicValue: "medium",
    location: "",
    client: "",
    contractor: "",
    budget_amount: "",
    start_date: "",
    planned_end_date: "",
    portfolio_id: 0,
  });

  const set = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  /** An end date on or before the start date describes an impossible project. */
  const validateDates = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (end < start) {
        setDateError("End date cannot be before start date");
        return false;
      }
      if (end.getTime() === start.getTime()) {
        setDateError("End date cannot be the same as start date");
        return false;
      }
    }
    setDateError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Project name is required.");
      return;
    }
    if (!validateDates(formData.start_date, formData.planned_end_date)) {
      setError("Please fix the date validation errors.");
      return;
    }

    setError(null);
    notConnected("Updating the project");
  };

  if (loading) {
    return (
      <>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit Project"
              backHref="/projects"
              backLabel="Back to Projects"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading project…
              </span>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit Project"
              backHref="/projects"
              backLabel="Back to Projects"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  Project not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The project you are trying to edit could not be found.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href="/projects">
                    Back to projects
                  </CancelButton>
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
            title="Edit Project"
            subtitle={
              projectCode ? `${projectName} (${projectCode})` : projectName
            }
            backHref={`/projects/${projectId}`}
            backLabel="Back to Project"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Basic Information"
            description="What the project is and who it is for."
          >
            <FieldGrid>
              <Field label="Project Name" required htmlFor="name" full>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => set("name", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Description" htmlFor="description" full>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => set("description", e.target.value)}
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>

              <Field label="Client" htmlFor="client">
                <input
                  id="client"
                  type="text"
                  value={formData.client}
                  onChange={(e) => set("client", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Contractor" htmlFor="contractor">
                <input
                  id="contractor"
                  type="text"
                  value={formData.contractor}
                  onChange={(e) => set("contractor", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Location" htmlFor="location">
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => set("location", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Portfolio" htmlFor="portfolio_id">
                <Dropdown
                  id="portfolio_id"
                  value={String(formData.portfolio_id || "")}
                  onChange={(v: string) =>
                    set("portfolio_id", v ? Number(v) : 0)
                  }
                  options={[
                    { value: "", label: "Unassigned" },
                    ...portfolios.map((p) => ({
                      value: String(p.portfolio_id),
                      label: p.name,
                    })),
                  ]}
                  ariaLabel="Portfolio"
                  disabled={submitting}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Schedule & Budget"
            description="When the project runs and what it is funded for."
          >
            <FieldGrid>
              <Field label="Start Date" htmlFor="start_date">
                <input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => {
                    set("start_date", e.target.value);
                    validateDates(e.target.value, formData.planned_end_date);
                  }}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Planned End Date"
                htmlFor="planned_end_date"
                hint={dateError || undefined}
              >
                <input
                  id="planned_end_date"
                  type="date"
                  value={formData.planned_end_date}
                  min={formData.start_date || undefined}
                  onChange={(e) => {
                    set("planned_end_date", e.target.value);
                    validateDates(formData.start_date, e.target.value);
                  }}
                  disabled={submitting}
                  className={`${inputClass}${
                    dateError ? " border-danger" : ""
                  }`}
                />
              </Field>

              <Field
                label="Budget"
                htmlFor="budget_amount"
                hint="In Omani Rial (OMR)."
              >
                <input
                  id="budget_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget_amount}
                  onChange={(e) => set("budget_amount", e.target.value)}
                  disabled={submitting}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Governance"
            description="How this project is prioritised and assessed."
          >
            <FieldGrid>
              <Field label="Priority" htmlFor="priority">
                <Dropdown
                  id="priority"
                  value={formData.priority}
                  onChange={(v: string) => set("priority", v)}
                  options={PRIORITY_OPTIONS}
                  ariaLabel="Priority"
                  disabled={submitting}
                />
              </Field>

              <Field label="Compliance" htmlFor="compliance">
                <Dropdown
                  id="compliance"
                  value={formData.compliance}
                  onChange={(v: string) => set("compliance", v)}
                  options={COMPLIANCE_OPTIONS}
                  ariaLabel="Compliance"
                  disabled={submitting}
                />
              </Field>

              <Field label="Strategic Value" htmlFor="strategicValue">
                <Dropdown
                  id="strategicValue"
                  value={formData.strategicValue}
                  onChange={(v: string) => set("strategicValue", v)}
                  options={STRATEGIC_VALUE_OPTIONS}
                  ariaLabel="Strategic value"
                  disabled={submitting}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href={`/projects/${projectId}`} />
            <SubmitButton
              busy={submitting}
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
}
