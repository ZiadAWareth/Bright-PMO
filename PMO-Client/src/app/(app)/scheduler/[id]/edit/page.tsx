"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Save } from "lucide-react";
import axios from "@/lib/axios";
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

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "analyzing", label: "Analyzing" },
  { value: "feasible", label: "Feasible" },
  { value: "infeasible", label: "Infeasible" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "converted", label: "Converted" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/**
 * Edit a schedule.
 *
 * Replaces the modal that opened from the scheduler directory, so the form is
 * linkable and matches every other module's edit route.
 */
export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "draft",
    priority: "medium",
    estimated_budget: 0,
    target_completion_date: "",
    notes: "",
  });

  useEffect(() => {
    if (!scheduleId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get(`/api/schedules/${scheduleId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (cancelled) return;

        const s = res.data?.schedule ?? res.data;
        if (!s) {
          setNotFound(true);
          return;
        }

        const day = (v?: string) => (v ? v.split("T")[0] : "");

        setFormData({
          name: s.name ?? "",
          description: s.description ?? "",
          start_date: day(s.start_date),
          end_date: day(s.end_date),
          status: s.status ?? "draft",
          priority: s.priority ?? "medium",
          estimated_budget: s.total_budget ?? 0,
          target_completion_date: day(s.target_completion_date),
          notes: s.notes ?? "",
        });
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scheduleId]);

  const set = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (!formData.name.trim()) return "Schedule name is required.";
    if (!formData.description.trim()) return "Description is required.";
    if (!formData.start_date) return "Start date is required.";
    if (!formData.end_date) return "End date is required.";
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      return "End date must be after start date.";
    }
    if (formData.estimated_budget < 0) return "Budget cannot be negative.";
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
      const token = localStorage.getItem("token");
      if (!token) {
        const message = "Authentication token not found. Please log in.";
        setError(message);
        toast.error(message);
        setSubmitting(false);
        return;
      }

      await axios.put(
        `/api/schedules/${scheduleId}`,
        { ...formData, schedule_id: Number(scheduleId) },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success("Schedule updated");
      router.push(`/scheduler/${scheduleId}`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.message ??
        err.response?.data?.error ??
        "Failed to update schedule";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const durationDays =
    formData.start_date && formData.end_date
      ? Math.ceil(
          (new Date(formData.end_date).getTime() -
            new Date(formData.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit Schedule"
              backHref="/scheduler"
              backLabel="Back to Schedules"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading schedule…
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
              title="Edit Schedule"
              backHref="/scheduler"
              backLabel="Back to Schedules"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  Schedule not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The schedule you are trying to edit could not be found.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href="/scheduler">
                    Back to schedules
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
            title="Edit Schedule"
            subtitle={formData.name || undefined}
            backHref={`/scheduler/${scheduleId}`}
            backLabel="Back to Schedule"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Basic Information"
            description="The core details of this project schedule."
          >
            <FieldGrid>
              <Field label="Schedule Name" required htmlFor="name" full>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => set("name", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Description" required htmlFor="description" full>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => set("description", e.target.value)}
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>

              <Field label="Start Date" required htmlFor="start_date">
                <input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => set("start_date", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field
                label="End Date"
                required
                htmlFor="end_date"
                hint={
                  durationDays !== null && durationDays > 0
                    ? `${durationDays} days`
                    : undefined
                }
              >
                <input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  min={formData.start_date || undefined}
                  onChange={(e) => set("end_date", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Target Completion Date"
                htmlFor="target_completion_date"
              >
                <input
                  id="target_completion_date"
                  type="date"
                  value={formData.target_completion_date}
                  onChange={(e) =>
                    set("target_completion_date", e.target.value)
                  }
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Status & Budget"
            description="Where this schedule stands and what it is funded for."
          >
            <FieldGrid>
              <Field label="Status" htmlFor="status">
                <Dropdown
                  id="status"
                  value={formData.status}
                  onChange={(v: string) => set("status", v)}
                  options={STATUS_OPTIONS}
                  ariaLabel="Status"
                  disabled={submitting}
                />
              </Field>

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

              <Field
                label="Estimated Budget"
                htmlFor="estimated_budget"
                hint="In Omani Rial (OMR)."
              >
                <input
                  id="estimated_budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_budget}
                  onChange={(e) =>
                    set("estimated_budget", parseFloat(e.target.value) || 0)
                  }
                  disabled={submitting}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>

              <Field label="Notes" htmlFor="notes" full>
                <textarea
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any additional notes or requirements…"
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href={`/scheduler/${scheduleId}`} />
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
