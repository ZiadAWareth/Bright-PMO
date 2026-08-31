"use client";

import React, { useEffect, useState } from "react";
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
} from "@/components/ui/form-shell";
import { Dropdown } from "@/components/ui/dropdown";

interface Project {
  project_id: number;
  name: string;
}

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
];

/**
 * Add a procurement request.
 *
 * Replaces the "Add New Procurement Request" dialog that opened over the RFQ
 * management page. Unlike the dialog, the project is chosen explicitly here
 * rather than silently defaulting to the first project in the list.
 */
export default function NewProcurementPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [status, setStatus] = useState("Planning");

  useEffect(() => {
    let cancelled = false;

    axios
      .get("/api/projects", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        if (cancelled) return;
        setProjects(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load projects");
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const validate = (): string | null => {
    if (!projectId) return "Please select a project.";
    if (!description.trim()) return "Procurement description is required.";
    if (!type) return "Please select a type.";
    if (!estimatedCost || isNaN(parseFloat(estimatedCost))) {
      return "Estimated cost is required.";
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
      const res = await axios.post(
        "/api/procurements",
        {
          project_id: parseInt(projectId),
          type,
          description: description.trim(),
          estimated_cost: parseFloat(estimatedCost),
          actual_cost: actualCost ? parseFloat(actualCost) : 0,
          status,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      toast.success("Procurement added");
      router.push("/rfq-management?tab=procurements");
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
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
            title="New Procurement Request"
            subtitle="Raise a procurement request against a project"
            backHref="/rfq-management"
            backLabel="Back to RFQ Management"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Procurement Details"
            description="What is being procured, and against which project."
          >
            <FieldGrid>
              <Field label="Project" required htmlFor="project">
                <Dropdown
                  id="project"
                  value={projectId}
                  onChange={setProjectId}
                  options={[
                    { value: "", label: "Select a project" },
                    ...projects.map((p) => ({
                      value: String(p.project_id),
                      label: p.name,
                    })),
                  ]}
                  searchable
                  ariaLabel="Project"
                  disabled={submitting || loadingProjects}
                />
              </Field>

              <Field label="Type" required htmlFor="type">
                <Dropdown
                  id="type"
                  value={type}
                  onChange={setType}
                  options={[
                    { value: "", label: "Select type" },
                    ...TYPE_OPTIONS,
                  ]}
                  ariaLabel="Type"
                  disabled={submitting}
                />
              </Field>

              <Field label="Description" required htmlFor="description" full>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter procurement description"
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Estimated Cost (OMR)" required htmlFor="estimated_cost">
                <input
                  id="estimated_cost"
                  type="text"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="Enter estimated cost"
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Actual Cost (OMR)" htmlFor="actual_cost">
                <input
                  id="actual_cost"
                  type="text"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="Enter actual cost (optional)"
                  disabled={submitting}
                  className={inputClass}
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
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href="/rfq-management" />
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
