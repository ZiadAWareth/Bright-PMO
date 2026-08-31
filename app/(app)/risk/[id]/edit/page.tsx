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
  StatusBadge,
  SubmitButton,
  inputClass,
  textareaClass,
} from "@/components/ui/form-shell";
import { Dropdown } from "@/components/ui/dropdown";
import { Spinner } from "@/components/ui/spinner";
import { humanize, riskLevelTone } from "@/lib/status-tone";

const CATEGORY_OPTIONS = [
  "Technical",
  "Schedule",
  "Cost",
  "Resource",
  "Quality",
  "Communication",
  "External",
  "Other",
];

const APPROVAL_STATUS_OPTIONS = ["Pending", "Approved for Mitigation"];
const CURRENT_STATUS_OPTIONS = ["Open", "Mitigation in Progress", "Closed"];

const LEVEL_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/** Score is derived from impact × probability, never typed in by hand. */
const levelValue = (v: string) => (v === "high" ? 3 : v === "medium" ? 2 : 1);

const calculateRiskScore = (impact: string, probability: string) =>
  levelValue(impact) * levelValue(probability);

const calculateRiskLevel = (score: number) => {
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
};

/**
 * Edit a risk.
 *
 * The risk module previously had no edit route at all — editing happened in a
 * dialog on the list and detail screens. This mirrors the create screen so the
 * two read as one form in two states.
 */
export default function EditRiskPage() {
  const router = useRouter();
  const params = useParams();
  const riskId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskName, setRiskName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    identified_date: "",
    impact: "medium",
    probability: "medium",
    approvalStatus: "Pending",
    currentStatus: "Open",
  });

  useEffect(() => {
    if (!riskId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get(`/api/risks/${riskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (cancelled) return;

        const r = res.data?.risk ?? res.data;
        if (!r) {
          setNotFound(true);
          return;
        }

        setRiskName(r.name ?? "");
        setFormData({
          name: r.name ?? "",
          description: r.description ?? "",
          category: r.category ?? "",
          identified_date: r.identified_date
            ? new Date(r.identified_date).toISOString().split("T")[0]
            : "",
          impact: r.impact ?? "medium",
          probability: r.probability ?? "medium",
          approvalStatus: r.approvalStatus ?? "Pending",
          currentStatus: r.currentStatus ?? r.status ?? "Open",
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
  }, [riskId]);

  const set = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  /**
   * A risk cannot move through its mitigation states until it has been
   * approved, so selecting anything other than "Approved for Mitigation"
   * returns the current status to Open.
   */
  const setApprovalStatus = (value: string) =>
    setFormData((prev) => ({
      ...prev,
      approvalStatus: value,
      currentStatus:
        value === "Approved for Mitigation" ? prev.currentStatus || "Open" : "Open",
    }));

  const riskScore = calculateRiskScore(formData.impact, formData.probability);
  const riskLevel = calculateRiskLevel(riskScore);
  const approved = formData.approvalStatus === "Approved for Mitigation";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Risk name is required.");
      return;
    }
    if (!formData.category) {
      setError("Please select a risk category.");
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
        `/api/risks/${riskId}`,
        {
          ...formData,
          name: formData.name.trim(),
          score: riskScore,
          riskScore,
          riskLevel,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success("Risk updated");
      router.push(`/risk/${riskId}`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.message ??
        err.response?.data?.error ??
        "Failed to update risk";
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
              title="Edit Risk"
              backHref="/risk"
              backLabel="Back to Risks"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading risk…
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
              title="Edit Risk"
              backHref="/risk"
              backLabel="Back to Risks"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  Risk not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The risk you are trying to edit could not be found.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href="/risk">Back to risks</CancelButton>
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
            title="Edit Risk"
            subtitle={riskName || undefined}
            backHref={`/risk/${riskId}`}
            backLabel="Back to Risk"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Identification"
            description="What the risk is and when it was raised."
          >
            <FieldGrid>
              <Field label="Risk Name" required htmlFor="name" full>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => set("name", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Description"
                htmlFor="description"
                full
                hint="What could happen, and what would it affect?"
              >
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => set("description", e.target.value)}
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>

              <Field label="Category" required htmlFor="category">
                <Dropdown
                  id="category"
                  value={formData.category}
                  onChange={(v: string) => set("category", v)}
                  options={[
                    { value: "", label: "Select a category" },
                    ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: c })),
                  ]}
                  ariaLabel="Category"
                  disabled={submitting}
                />
              </Field>

              <Field label="Identified Date" htmlFor="identified_date">
                <input
                  id="identified_date"
                  type="date"
                  value={formData.identified_date}
                  onChange={(e) => set("identified_date", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Assessment"
            description="How likely the risk is and how much it would hurt."
          >
            <FieldGrid>
              <Field label="Impact Level" htmlFor="impact">
                <Dropdown
                  id="impact"
                  value={formData.impact}
                  onChange={(v: string) => set("impact", v)}
                  options={LEVEL_OPTIONS}
                  ariaLabel="Impact level"
                  disabled={submitting}
                />
              </Field>

              <Field label="Probability" htmlFor="probability">
                <Dropdown
                  id="probability"
                  value={formData.probability}
                  onChange={(v: string) => set("probability", v)}
                  options={LEVEL_OPTIONS}
                  ariaLabel="Probability"
                  disabled={submitting}
                />
              </Field>

              <Field
                label="Risk Score"
                full
                hint="Impact × probability, where High=3, Medium=2 and Low=1."
              >
                <div className="flex items-center justify-between rounded-[10px] border border-line bg-surface-2 px-3 py-2.5">
                  <span className="text-[13px] text-muted">
                    Calculated score
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[18px] font-semibold tabular-nums text-ink">
                      {riskScore}
                    </span>
                    <StatusBadge
                      label={humanize(riskLevel)}
                      tone={riskLevelTone(riskLevel)}
                    />
                  </span>
                </div>
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Status"
            description="Where this risk sits in the approval and mitigation flow."
          >
            <FieldGrid>
              <Field label="Approval Status" htmlFor="approvalStatus">
                <Dropdown
                  id="approvalStatus"
                  value={formData.approvalStatus}
                  onChange={setApprovalStatus}
                  options={APPROVAL_STATUS_OPTIONS.map((s) => ({
                    value: s,
                    label: s,
                  }))}
                  ariaLabel="Approval status"
                  disabled={submitting}
                />
              </Field>

              <Field
                label="Current Status"
                htmlFor="currentStatus"
                hint={
                  approved
                    ? undefined
                    : "Current status can only be changed after approval."
                }
              >
                <Dropdown
                  id="currentStatus"
                  value={formData.currentStatus}
                  onChange={(v: string) => set("currentStatus", v)}
                  options={CURRENT_STATUS_OPTIONS.map((s) => ({
                    value: s,
                    label: s,
                  }))}
                  ariaLabel="Current status"
                  disabled={submitting || !approved}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href={`/risk/${riskId}`} />
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
