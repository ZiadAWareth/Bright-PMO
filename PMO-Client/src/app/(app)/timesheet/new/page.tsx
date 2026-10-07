"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface User {
  user_id: number;
  account?: { first_name?: string; last_name?: string };
  first_name?: string;
  last_name?: string;
}

/** The period a timesheet covers is capped at four weeks. */
const MAX_PERIOD_DAYS = 28;

const nameOf = (u: User) =>
  [u.account?.first_name ?? u.first_name, u.account?.last_name ?? u.last_name]
    .filter(Boolean)
    .join(" ") || `User ${u.user_id}`;

/**
 * Create a timesheet.
 *
 * Replaces the modal that opened over the timesheet directory. A full route
 * means the form is linkable, survives a refresh, and matches the create
 * screens for every other module.
 */
export default function NewTimesheetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The project cards on the timesheet directory link here with the project
  // already chosen, e.g. /timesheet/new?project=12.
  const presetProject = searchParams?.get("project") ?? "";

  const [currentUser, setCurrentUser] = useState<{
    user_id?: number;
    role?: { name?: string };
  } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProject, setSelectedProject] = useState(presetProject);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const canViewAll =
    Boolean(currentUser?.role?.name) &&
    ["ADMIN", "PMO", "PJM"].includes(currentUser!.role!.name!);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const auth = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };

      try {
        const meRes = await axios.get("/api/auth/me", auth);
        if (cancelled) return;
        const me = meRes.data?.user ?? meRes.data;
        setCurrentUser(me);

        const isPrivileged =
          Boolean(me?.role?.name) &&
          ["ADMIN", "PMO", "PJM"].includes(me.role.name);

        const [projectRes, userRes] = await Promise.all([
          axios.get("/api/projects", auth).catch(() => ({ data: [] })),
          isPrivileged
            ? axios.get("/api/users", auth).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;

        setProjects(Array.isArray(projectRes.data) ? projectRes.data : []);
        setUsers(Array.isArray(userRes.data) ? userRes.data : []);

        // A non-privileged user can only log their own time, so the owner is
        // fixed; a privileged one picks from the list.
        setSelectedUser(me?.user_id ? String(me.user_id) : "");
      } catch {
        if (!cancelled) toast.error("Could not load projects");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Default to the current week, which is what a new timesheet almost always
  // covers.
  useEffect(() => {
    if (startDate || endDate) return;
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, [startDate, endDate]);

  const periodDays =
    startDate && endDate
      ? Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : null;

  const validate = (): string | null => {
    if (!selectedProject) return "Please select a project.";
    if (!startDate) return "Start date is required.";
    if (!endDate) return "End date is required.";
    if (new Date(startDate) > new Date(endDate)) {
      return "Start date cannot be after end date.";
    }
    if (periodDays !== null && periodDays - 1 > MAX_PERIOD_DAYS) {
      return "Timesheet period cannot exceed 4 weeks.";
    }
    if (canViewAll && !selectedUser) return "Please select a user.";
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
      const auth = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };

      // A timesheet is unique per user, project and period, so check before
      // creating rather than surfacing a database error afterwards.
      const checkUrl = canViewAll
        ? "/api/timesheets?view_all=true"
        : "/api/timesheets";
      const existing = await axios.get(checkUrl, auth);
      const clash = (
        Array.isArray(existing.data) ? existing.data : []
      ).find(
        (ts: {
          user?: { user_id?: number };
          project_id: number;
          start_date: string;
        }) =>
          (canViewAll ? ts.user?.user_id === parseInt(selectedUser) : true) &&
          ts.project_id === parseInt(selectedProject) &&
          new Date(ts.start_date).toDateString() ===
            new Date(startDate).toDateString(),
      );

      if (clash) {
        const message =
          "A timesheet already exists for this user and date range.";
        setError(message);
        toast.error(message);
        return;
      }

      const payload: Record<string, unknown> = {
        project_id: parseInt(selectedProject),
        start_date: startDate,
        end_date: endDate,
        status: "DRAFT",
      };

      // Only send user_id when creating on someone else's behalf.
      if (canViewAll && selectedUser !== String(currentUser?.user_id ?? "")) {
        payload.user_id = parseInt(selectedUser);
      }

      const res = await axios.post("/api/timesheets", payload, auth);

      toast.success("Timesheet created");
      router.push(`/timesheet/${res.data.timesheet_id}`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Failed to create timesheet";
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
            title="New Timesheet"
            subtitle="Open a timesheet for a project and reporting period"
            backHref="/timesheet"
            backLabel="Back to Timesheets"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Assignment"
            description="Whose time this records, and against which project."
          >
            <FieldGrid>
              {(loadingData || canViewAll) && (
                <Field
                  label="User"
                  required
                  htmlFor="user"
                  hint="Leave as yourself unless logging on another person's behalf."
                >
                  <Dropdown
                    id="user"
                    value={selectedUser}
                    onChange={setSelectedUser}
                    options={[
                      { value: "", label: "Select a user" },
                      ...users.map((u) => ({
                        value: String(u.user_id),
                        label: nameOf(u),
                      })),
                    ]}
                    searchable
                    ariaLabel="User"
                    disabled={submitting || loadingData}
                  />
                </Field>
              )}

              <Field label="Project" required htmlFor="project">
                <Dropdown
                  id="project"
                  value={selectedProject}
                  onChange={setSelectedProject}
                  options={[
                    { value: "", label: "Select a project" },
                    ...projects.map((p) => ({
                      value: String(p.project_id),
                      label: p.name,
                    })),
                  ]}
                  searchable
                  ariaLabel="Project"
                  disabled={submitting || loadingData}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Period"
            description="The window this timesheet covers. At most four weeks."
          >
            <FieldGrid>
              <Field label="Start Date" required htmlFor="start_date">
                <input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field
                label="End Date"
                required
                htmlFor="end_date"
                hint={
                  periodDays !== null && periodDays > 0
                    ? `${periodDays} day${periodDays === 1 ? "" : "s"}`
                    : undefined
                }
              >
                <input
                  id="end_date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href="/timesheet" />
            <SubmitButton
              busy={submitting}
              busyLabel="Creating…"
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              Create Timesheet
            </SubmitButton>
          </FormFooter>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
