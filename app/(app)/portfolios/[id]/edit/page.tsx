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
import { TagsField } from "@/components/ui/tags-field";
import type { PortfolioPriority, PortfolioStatus } from "@/types/enums";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "archived", label: "Archived" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/**
 * Edit a portfolio.
 *
 * Replaces the modal that opened from both the directory and the detail
 * screen, so the form is linkable and matches every other module's edit route.
 */
export default function EditPortfolioPage() {
  const router = useRouter();
  const params = useParams();
  const portfolioId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [strategicObjective, setStrategicObjective] = useState("");
  const [status, setStatus] = useState<PortfolioStatus>(
    "active" as PortfolioStatus,
  );
  const [priority, setPriority] = useState<PortfolioPriority>(
    "medium" as PortfolioPriority,
  );
  const [budgetCapacity, setBudgetCapacity] = useState("");
  const [tags, setTags] = useState<string[]>([""]);

  useEffect(() => {
    if (!portfolioId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get(`/api/portfolios/${portfolioId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (cancelled) return;

        const p = res.data?.portfolio ?? res.data;
        if (!p) {
          setNotFound(true);
          return;
        }

        setName(p.name ?? "");
        setDescription(p.description ?? "");
        setStrategicObjective(p.strategic_objective ?? "");
        setStatus(p.status ?? "active");
        setPriority(p.priority ?? "medium");
        setBudgetCapacity(
          p.budget_capacity != null ? String(p.budget_capacity) : "",
        );
        setTags(p.tags && p.tags.length > 0 ? [...p.tags] : [""]);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [portfolioId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Portfolio name is required.");
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
        `/api/portfolios/${portfolioId}`,
        {
          name: name.trim(),
          description: description.trim() || null,
          strategic_objective: strategicObjective.trim() || null,
          status,
          priority,
          budget_capacity: budgetCapacity ? parseFloat(budgetCapacity) : 0,
          tags: tags.filter((tag) => tag.trim() !== ""),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success("Portfolio updated");
      router.push(`/portfolios/${portfolioId}`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Failed to update portfolio";
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
              title="Edit Portfolio"
              backHref="/portfolios"
              backLabel="Back to Portfolios"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading portfolio…
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
              title="Edit Portfolio"
              backHref="/portfolios"
              backLabel="Back to Portfolios"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  Portfolio not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The portfolio you are trying to edit could not be found.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href="/portfolios">
                    Back to portfolios
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
            title="Edit Portfolio"
            subtitle={name || undefined}
            backHref={`/portfolios/${portfolioId}`}
            backLabel="Back to Portfolio"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Details"
            description="Name the portfolio and say what it is for."
          >
            <FieldGrid>
              <Field label="Portfolio Name" required htmlFor="name" full>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Description" htmlFor="description" full>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>

              <Field
                label="Strategic Objective"
                htmlFor="strategic_objective"
                full
                hint="The business outcome this portfolio exists to deliver."
              >
                <textarea
                  id="strategic_objective"
                  rows={3}
                  value={strategicObjective}
                  onChange={(e) => setStrategicObjective(e.target.value)}
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Planning"
            description="How this portfolio is tracked, prioritised and funded."
          >
            <FieldGrid>
              <Field label="Status" htmlFor="status">
                <Dropdown
                  id="status"
                  value={status}
                  onChange={(v: string) => setStatus(v as PortfolioStatus)}
                  options={STATUS_OPTIONS}
                  ariaLabel="Status"
                  disabled={submitting}
                />
              </Field>

              <Field label="Priority" htmlFor="priority">
                <Dropdown
                  id="priority"
                  value={priority}
                  onChange={(v: string) => setPriority(v as PortfolioPriority)}
                  options={PRIORITY_OPTIONS}
                  ariaLabel="Priority"
                  disabled={submitting}
                />
              </Field>

              <Field
                label="Budget Capacity"
                htmlFor="budget_capacity"
                hint="Total capacity in Omani Rial (OMR)."
              >
                <input
                  id="budget_capacity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetCapacity}
                  onChange={(e) => setBudgetCapacity(e.target.value)}
                  disabled={submitting}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>

              <Field label="Tags" full>
                <TagsField
                  tags={tags}
                  onChange={setTags}
                  disabled={submitting}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href={`/portfolios/${portfolioId}`} />
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
