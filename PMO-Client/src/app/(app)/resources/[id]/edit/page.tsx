"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Minus, Plus, Save } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";

interface Skill {
  name: string;
  level: string;
  category: string;
  verified?: boolean;
  yearsExperience?: number;
}

const TYPE_OPTIONS = [
  { value: "labor", label: "Labor" },
  { value: "equipment", label: "Equipment" },
  { value: "material", label: "Material" },
];

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "assigned", label: "Assigned" },
  { value: "unavailable", label: "Unavailable" },
  { value: "maintenance", label: "Maintenance" },
];

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

/** Only digits, spaces, dashes, parentheses and a leading +. */
const isValidPhone = (v: string) => /^[+\d\s\-()]+$/.test(v);
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/**
 * Edit a resource.
 *
 * Replaces the modal that opened from both the directory and the detail
 * screen. The skills list keeps the stored shape — Skills and Languages are
 * separate arrays in the API payload, distinguished by a "language" category.
 */
export default function EditResourcePage() {
  const router = useRouter();
  const params = useParams();
  const resourceId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    type: "labor" as "labor" | "equipment" | "material",
    role: "",
    rate: 0,
    capacity: 40,
    availability_status: "available",
    department: "",
    email: "",
    phone_number: "",
    location: "",
    rating: 0,
    unit: "",
    quantity: 0,
  });

  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/resources/${resourceId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        setFormData({
          name: data.name ?? "",
          type: data.type ?? "labor",
          role: data.role ?? "",
          rate: data.rate ?? 0,
          capacity: data.capacity ?? 40,
          availability_status: data.availability_status ?? "available",
          department: data.department ?? "",
          email: data.email ?? "",
          phone_number: data.phone_number ?? "",
          location: data.location ?? "",
          rating: data.rating ?? 0,
          unit: data.unit ?? "",
          quantity: data.quantity ?? 0,
        });

        // Skills are stored as JSON holding separate Skills and Languages
        // arrays; flatten them into one editable list here and split them
        // apart again on submit.
        if (data.type !== "material") {
          try {
            const raw =
              typeof data.skills === "string"
                ? JSON.parse(data.skills)
                : (data.skills ?? {});
            const flat: Skill[] = [
              ...(Array.isArray(raw.Skills) ? raw.Skills : []),
              ...(Array.isArray(raw.Languages)
                ? raw.Languages.map((l: Record<string, unknown>) => ({
                    name: String(l.name ?? ""),
                    level: String(l.proficiency ?? l.level ?? "intermediate"),
                    category: "language",
                    yearsExperience: Number(l.yearsExperience ?? 1),
                  }))
                : []),
            ];
            setSkills(flat);
          } catch {
            setSkills([]);
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  const set = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const isMaterial = formData.type === "material";

  const updateSkill = (index: number, patch: Partial<Skill>) =>
    setSkills((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Resource name is required.");
      return;
    }
    if (formData.email && !isValidEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (
      formData.type === "labor" &&
      formData.phone_number &&
      !isValidPhone(formData.phone_number)
    ) {
      setError(
        "Please enter a valid phone number (digits, spaces, dashes, parentheses and + only).",
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const skillsData = isMaterial
        ? { Skills: [], Languages: [] }
        : {
            Skills: skills.filter((s) => s.category !== "language"),
            Languages: skills
              .filter((s) => s.category === "language")
              .map((s) => ({
                id: Date.now().toString() + Math.random(),
                name: s.name,
                proficiency: s.level,
                category: "language",
                yearsExperience: s.yearsExperience,
              })),
          };

      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          skills: skillsData,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          body?.error ?? body?.message ?? "Failed to update resource";
        setError(message);
        toast.error(message);
        return;
      }

      toast.success("Resource updated");
      router.push(`/resources/${resourceId}`);
    } catch {
      const message = "Failed to update resource";
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
              title="Edit Resource"
              backHref="/resources"
              backLabel="Back to Resources"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading resource…
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
              title="Edit Resource"
              backHref="/resources"
              backLabel="Back to Resources"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  Resource not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The resource you are trying to edit could not be found.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href="/resources">
                    Back to resources
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
            title="Edit Resource"
            subtitle={formData.name || undefined}
            backHref={`/resources/${resourceId}`}
            backLabel="Back to Resource"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Basic Information"
            description="What this resource is and where it sits."
          >
            <FieldGrid>
              <Field label="Name" required htmlFor="name">
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => set("name", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Type" htmlFor="type">
                <Dropdown
                  id="type"
                  value={formData.type}
                  onChange={(v: string) =>
                    set("type", v as typeof formData.type)
                  }
                  options={TYPE_OPTIONS}
                  ariaLabel="Type"
                  disabled={submitting}
                />
              </Field>

              {!isMaterial && (
                <>
                  <Field label="Role / Position" htmlFor="role">
                    <input
                      id="role"
                      type="text"
                      value={formData.role}
                      onChange={(e) => set("role", e.target.value)}
                      disabled={submitting}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Department" htmlFor="department">
                    <input
                      id="department"
                      type="text"
                      value={formData.department}
                      onChange={(e) => set("department", e.target.value)}
                      disabled={submitting}
                      className={inputClass}
                    />
                  </Field>
                </>
              )}

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

              <Field label="Availability" htmlFor="availability_status">
                <Dropdown
                  id="availability_status"
                  value={formData.availability_status}
                  onChange={(v: string) => set("availability_status", v)}
                  options={AVAILABILITY_OPTIONS}
                  ariaLabel="Availability"
                  disabled={submitting}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          {!isMaterial && (
            <FormSection
              title="Contact"
              description="How this resource is reached."
            >
              <FieldGrid>
                <Field label="Email" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="email@example.com"
                    disabled={submitting}
                    className={inputClass}
                  />
                </Field>

                <Field label="Phone Number" htmlFor="phone_number">
                  <input
                    id="phone_number"
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => set("phone_number", e.target.value)}
                    placeholder="+968 xxxx xxxx"
                    disabled={submitting}
                    className={inputClass}
                  />
                </Field>
              </FieldGrid>
            </FormSection>
          )}

          <FormSection
            title={isMaterial ? "Inventory & Cost" : "Capacity & Cost"}
            description={
              isMaterial
                ? "How much is held and what it costs."
                : "How much this resource can take on and what it costs."
            }
          >
            <FieldGrid>
              <Field
                label="Rate"
                htmlFor="rate"
                hint="Cost per hour in Omani Rial (OMR)."
              >
                <input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => set("rate", parseFloat(e.target.value) || 0)}
                  disabled={submitting}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>

              {isMaterial ? (
                <>
                  <Field label="Unit" htmlFor="unit">
                    <input
                      id="unit"
                      type="text"
                      value={formData.unit}
                      onChange={(e) => set("unit", e.target.value)}
                      placeholder="e.g. tonnes, m³"
                      disabled={submitting}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Quantity" htmlFor="quantity">
                    <input
                      id="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) =>
                        set("quantity", parseFloat(e.target.value) || 0)
                      }
                      disabled={submitting}
                      className={`${inputClass} tabular-nums`}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field
                    label="Capacity"
                    htmlFor="capacity"
                    hint="Available hours per week."
                  >
                    <input
                      id="capacity"
                      type="number"
                      min="0"
                      value={formData.capacity}
                      onChange={(e) =>
                        set("capacity", parseFloat(e.target.value) || 0)
                      }
                      disabled={submitting}
                      className={`${inputClass} tabular-nums`}
                    />
                  </Field>

                  <Field
                    label="Rating"
                    htmlFor="rating"
                    hint="0–5, where 5 is the strongest."
                  >
                    <input
                      id="rating"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.rating}
                      onChange={(e) =>
                        set("rating", parseFloat(e.target.value) || 0)
                      }
                      disabled={submitting}
                      className={`${inputClass} tabular-nums`}
                    />
                  </Field>
                </>
              )}
            </FieldGrid>
          </FormSection>

          {!isMaterial && (
            <FormSection
              title="Skills & Languages"
              description="Set a row's category to “language” to record it as a language rather than a skill."
            >
              <div className="space-y-3">
                {skills.map((skill, index) => (
                  <div
                    key={index}
                    className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
                  >
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(e) =>
                        updateSkill(index, { name: e.target.value })
                      }
                      placeholder="Skill or language"
                      aria-label={`Skill ${index + 1} name`}
                      disabled={submitting}
                      className={inputClass}
                    />
                    <Dropdown
                      value={skill.level}
                      onChange={(v: string) => updateSkill(index, { level: v })}
                      options={LEVEL_OPTIONS}
                      ariaLabel={`Skill ${index + 1} level`}
                      disabled={submitting}
                    />
                    <input
                      type="text"
                      value={skill.category}
                      onChange={(e) =>
                        updateSkill(index, { category: e.target.value })
                      }
                      placeholder="Category"
                      aria-label={`Skill ${index + 1} category`}
                      disabled={submitting}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSkills((prev) => prev.filter((_, i) => i !== index))
                      }
                      disabled={submitting}
                      aria-label={`Remove skill ${index + 1}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}

                {skills.length === 0 && (
                  <p className="text-[13px] text-muted">
                    No skills recorded yet.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setSkills((prev) => [
                      ...prev,
                      {
                        name: "",
                        level: "intermediate",
                        category: "",
                        verified: false,
                        yearsExperience: 1,
                      },
                    ])
                  }
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-[13px] font-medium text-bright-deep transition-colors hover:bg-bright-soft disabled:opacity-60"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add skill
                </button>
              </div>
            </FormSection>
          )}

          <FormFooter>
            <CancelButton href={`/resources/${resourceId}`} />
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
