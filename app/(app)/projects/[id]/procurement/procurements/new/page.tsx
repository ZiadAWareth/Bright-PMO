"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
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

const TYPE_OPTIONS = [
  { value: "material", label: "Material" },
  { value: "service", label: "Service" },
  { value: "equipment", label: "Equipment" },
];

const STATUS_OPTIONS = [
  { value: "Planning", label: "Planning" },
  { value: "Tendering", label: "Tendering" },
  { value: "Evaluation", label: "Evaluation" },
  { value: "Awarded", label: "Awarded" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

/**
 * Add a procurement request, scoped to one project.
 *
 * Replaces the "Add Procurement" dialog on the project's procurement page.
 */
export default function NewProjectProcurementPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("material");
  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [status, setStatus] = useState("Planning");

  const backHref = `/projects/${projectId}/procurement`;

  const validate = (): string | null => {
    if (!description.trim()) return "Description is required.";
    if (!estimatedCost || isNaN(parseFloat(estimatedCost))) {
      return "Estimated cost is required.";
    }
    if (!actualCost || parseFloat(actualCost) <= 0) {
      return "Actual cost is required and must be greater than 0.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await axios.post(
        `/api/projects/${projectId}/procurements`,
        {
          type,
          description: description.trim(),
          estimated_cost: parseFloat(estimatedCost),
          actual_cost: parseFloat(actualCost),
          status,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      toast.success("Procurement added");
      router.push(`${backHref}?tab=procurements`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; details?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.details ??
        "Failed to add procurement";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout hideHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PageHeader
            title="New Procurement"
            subtitle="Raise a procurement request for this project"
            backHref={backHref}
            backLabel="Back to Procurement"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Procurement Details"
            description="What is being procured, and its cost."
          >
            <FieldGrid>
              <Field label="Type" required htmlFor="type">
                <Dropdown
                  id="type"
                  value={type}
                  onChange={setType}
                  options={TYPE_OPTIONS}
                  ariaLabel="Type"
                  disabled={submitting}
                />
              </Field>

              <Field label="Status" htmlFor="status">
                <Dropdown
                  id="status"
                  value={status}
                  onChange={setStatus}
                  options={STATUS_OPTIONS}
                  ariaLabel="Status"
                  disabled={submitting}
                />
              </Field>

              <Field label="Description" required htmlFor="description" full>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>

              <Field label="Estimated Cost (OMR)" required htmlFor="estimated_cost">
                <input
                  id="estimated_cost"
                  type="number"
                  min={0}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Actual Cost (OMR)" required htmlFor="actual_cost">
                <input
                  id="actual_cost"
                  type="number"
                  min={0}
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href={backHref} />
            <SubmitButton
              busy={submitting}
              busyLabel="Adding…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Add Procurement
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
