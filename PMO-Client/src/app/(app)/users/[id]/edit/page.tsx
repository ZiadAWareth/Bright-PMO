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
} from "@/components/ui/form-shell";
import { Dropdown } from "@/components/ui/dropdown";
import { Spinner } from "@/components/ui/spinner";

interface Role {
  role_id: number;
  role_name?: string;
  name?: string;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

/**
 * Edit a user.
 *
 * Replaces the dialog on the user detail screen, and widens it: the dialog
 * only exposed name and role, while the update endpoint also accepts
 * department, phone and status.
 */
export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  // notConnected: the user (to prefill the form) and the roles would be loaded
  // here. Until then the form starts empty.
  const loading = false;
  const notFound = false;
  const submitting = false;
  const [error, setError] = useState<string | null>(null);
  const [roles] = useState<Role[]>([]);
  const [displayName] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    department: "",
    phone_number: "",
    role_id: 0,
    status: "active",
  });

  const set = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      setError("First name is required.");
      return;
    }
    if (!formData.last_name.trim()) {
      setError("Last name is required.");
      return;
    }
    if (!formData.role_id) {
      setError("Please select a role.");
      return;
    }

    setError(null);
    notConnected("Updating the user");
  };

  const roleOptions = [
    { value: "", label: "Select a role" },
    ...roles.map((r) => ({
      value: String(r.role_id),
      label: r.role_name ?? r.name ?? `Role ${r.role_id}`,
    })),
  ];

  if (loading) {
    return (
      <>
        <DashboardLayout hideHeader>
          <div className="space-y-6">
            <PageHeader
              title="Edit User"
              backHref="/users"
              backLabel="Back to Users"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading user…
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
              title="Edit User"
              backHref="/users"
              backLabel="Back to Users"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  User not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The user you are trying to edit could not be found.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href="/users">Back to users</CancelButton>
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
            title="Edit User"
            subtitle={displayName || undefined}
            backHref={`/users/${userId}`}
            backLabel="Back to User"
          />

          <FormError>{error}</FormError>

          <FormSection title="Profile" description="Who this person is.">
            <FieldGrid>
              <Field label="First Name" required htmlFor="first_name">
                <input
                  id="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Last Name" required htmlFor="last_name">
                <input
                  id="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
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

          <FormSection
            title="Access"
            description="What this person may do in the workspace."
          >
            <FieldGrid>
              <Field label="Role" required htmlFor="role_id">
                <Dropdown
                  id="role_id"
                  value={String(formData.role_id || "")}
                  onChange={(v: string) => set("role_id", v ? Number(v) : 0)}
                  options={roleOptions}
                  ariaLabel="Role"
                  disabled={submitting}
                />
              </Field>

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
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href={`/users/${userId}`} />
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
