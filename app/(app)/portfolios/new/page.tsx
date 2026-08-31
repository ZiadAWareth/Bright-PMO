"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { TagsField } from "@/components/ui/tags-field";
import type { PortfolioPriority } from "@/types/enums";

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/**
 * Create a portfolio.
 *
 * Replaces the modal that used to open over the directory. A full route means
 * the form is linkable, survives a refresh, and matches the create screens for
 * every other module.
 */
export default function NewPortfolioPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [strategicObjective, setStrategicObjective] = useState("");
  const [priority, setPriority] = useState<PortfolioPriority>(
    "medium" as PortfolioPriority,
  );
  const [budgetCapacity, setBudgetCapacity] = useState("");
  const [tags, setTags] = useState<string[]>([""]);

  const validate = (): string | null => {
    const missing: string[] = [];
    if (!name.trim()) missing.push("Portfolio Name");
    if (!description.trim()) missing.push("Description");
    if (!strategicObjective.trim()) missing.push("Strategic Objective");
    if (missing.length > 0) {
      return `Please fill in the following required fields: ${missing.join(", ")}`;
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
      const token = localStorage.getItem("token");
      if (!token) {
        const message = "Authentication token not found. Please log in.";
        setError(message);
        toast.error(message);
        setSubmitting(false);
        return;
      }

      await axios.post(
        "/api/portfolios",
        {
          name: name.trim(),
          description: description.trim(),
          strategic_objective: strategicObjective.trim(),
          tags: tags.filter((tag) => tag.trim() !== ""),
          priority,
          // A new portfolio always starts active.
          status: "active",
          budget_capacity: budgetCapacity ? parseFloat(budgetCapacity) : 0,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Portfolio created");
      router.push("/portfolios");
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Failed to create portfolio";
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
            title="New Portfolio"
            subtitle="Group related projects under a shared strategic objective"
            backHref="/portfolios"
            backLabel="Back to Portfolios"
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
                  placeholder="e.g. National Infrastructure"
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Description" required htmlFor="description" full>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What sits inside this portfolio?"
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>

              <Field
                label="Strategic Objective"
                required
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
            description="How this portfolio is prioritised and funded."
          >
            <FieldGrid>
              <Field label="Priority" htmlFor="priority">
                <Dropdown
                  id="priority"
                  value={priority}
                  onChange={(v: string) =>
                    setPriority(v as PortfolioPriority)
                  }
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
                  placeholder="e.g. 1000000"
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
            <CancelButton href="/portfolios" />
            <SubmitButton
              busy={submitting}
              busyLabel="Creating…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Create Portfolio
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
