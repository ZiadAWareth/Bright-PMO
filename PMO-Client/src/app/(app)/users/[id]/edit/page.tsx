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

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [displayName, setDisplayName] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    department: "",
    phone_number: "",
    role_id: 0,
    status: "active",
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const auth = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };

      try {
        const [userRes, rolesRes] = await Promise.all([
          axios.get(`/api/users/${userId}`, auth),
          axios.get("/api/roles", auth).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;

        const u = userRes.data?.user ?? userRes.data;
        if (!u) {
          setNotFound(true);
          return;
        }

        const first = u.account?.first_name ?? "";
        const last = u.account?.last_name ?? "";
        setDisplayName([first, last].filter(Boolean).join(" "));

        setFormData({
          first_name: first,
          last_name: last,
          department: u.account?.department ?? "",
          phone_number: u.account?.phone_number ?? "",
          role_id: u.role?.role_id ?? u.role_id ?? 0,
          status: u.status ?? "active",
        });

        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const set = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
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
    setSubmitting(true);
    try {
      await axios.put(
        `/api/users/${userId}`,
        {
          account: {
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            department: formData.department.trim() || null,
            phone_number: formData.phone_number.trim() || null,
          },
          role_id: Number(formData.role_id),
          status: formData.status,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );

      toast.success("User updated");
      router.push(`/users/${userId}`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Failed to update user";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
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
      <ProtectedRoute>
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
      </ProtectedRoute>
    );
  }

  if (notFound) {
    return (
      <ProtectedRoute>
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
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
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
    </ProtectedRoute>
  );
}
