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
 * Create a user.
 *
 * The users module previously had no create route — accounts were added
 * elsewhere. This matches the create screens for every other module.
 */
export default function NewUserPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role_id: 0,
    department: "",
    phone_number: "",
    status: "active",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get("/api/roles", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!cancelled) setRoles(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) toast.error("Could not load roles");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (!formData.first_name.trim()) return "First name is required.";
    if (!formData.last_name.trim()) return "Last name is required.";
    if (!formData.username.trim()) return "Username is required.";
    if (!formData.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Please enter a valid email address.";
    }
    if (!formData.password) return "Password is required.";
    if (formData.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match.";
    }
    if (!formData.role_id) return "Please select a role.";
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
      await axios.post(
        "/api/users",
        {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role_id: Number(formData.role_id),
          department: formData.department.trim() || null,
          phone_number: formData.phone_number.trim() || null,
          status: formData.status,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );

      toast.success("User created");
      router.push("/users");
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Failed to create user";
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

  return (
    <ProtectedRoute>
      <DashboardLayout hideHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PageHeader
            title="New User"
            subtitle="Add a person and give them access to the workspace"
            backHref="/users"
            backLabel="Back to Users"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Profile"
            description="Who this person is."
          >
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
                  placeholder="e.g. Engineering"
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
            title="Account"
            description="Sign-in details and what this person may do."
          >
            <FieldGrid>
              <Field label="Username" required htmlFor="username">
                <input
                  id="username"
                  type="text"
                  autoComplete="off"
                  value={formData.username}
                  onChange={(e) => set("username", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Email" required htmlFor="email">
                <input
                  id="email"
                  type="email"
                  autoComplete="off"
                  value={formData.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@example.com"
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Password"
                required
                htmlFor="password"
                hint="At least 8 characters."
              >
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => set("password", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Confirm Password"
                required
                htmlFor="confirmPassword"
              >
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

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
            <CancelButton href="/users" />
            <SubmitButton
              busy={submitting}
              busyLabel="Creating…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Create User
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
