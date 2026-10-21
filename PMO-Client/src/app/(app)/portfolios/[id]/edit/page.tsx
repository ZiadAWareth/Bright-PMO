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

  // notConnected: the portfolio (to prefill the form) would be loaded here.
  // Until then the form starts empty.
  const loading = false;
  const notFound = false;
  const submitting = false;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Portfolio name is required.");
      return;
    }

    setError(null);
    notConnected("Updating the portfolio");
  };

  if (loading) {
    return (
      <>
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
      </>
    );
  }

  if (notFound) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
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
    </>
  );
}
