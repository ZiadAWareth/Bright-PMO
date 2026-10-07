"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Save } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";

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
 * Edit a procurement request.
 *
 * Replaces the "Edit Procurement" dialog on the project's procurement page.
 */
export default function EditProjectProcurementPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const procurementId = params?.procurementId as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("material");
  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [status, setStatus] = useState("Planning");

  const backHref = `/projects/${projectId}/procurement`;

  useEffect(() => {
    if (!procurementId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get(`/api/procurements/${procurementId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (cancelled) return;

        const p = res.data;
        if (!p) {
          setNotFound(true);
          return;
        }

        setType(p.type ?? "material");
        setDescription(p.description ?? "");
        setEstimatedCost(String(p.estimated_cost ?? ""));
        setActualCost(String(p.actual_cost ?? ""));
        setStatus(p.status ?? "Planning");
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [procurementId]);

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
      await axios.put(
        `/api/procurements/${procurementId}`,
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

      toast.success("Procurement updated");
      router.push(`${backHref}?tab=procurements`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; details?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.details ??
        "Failed to update procurement";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit Procurement"
              backHref={backHref}
              backLabel="Back to Procurement"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading procurement…
              </span>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (notFound) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit Procurement"
              backHref={backHref}
              backLabel="Back to Procurement"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  Procurement not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The procurement you are trying to edit could not be found.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href={backHref}>
                    Back to Procurement
                  </CancelButton>
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
            title="Edit Procurement"
            subtitle={description || undefined}
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
}
