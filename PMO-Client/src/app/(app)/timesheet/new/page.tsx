"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save } from "lucide-react";
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

  // notConnected: the projects and (for managers) the users to log time for
  // would be loaded here. Until then there are none to pick.
  const [projects] = useState<Project[]>([]);
  const [users] = useState<User[]>([]);

  const loadingData = false;
  const submitting = false;
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProject, setSelectedProject] = useState(presetProject);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Every option is open until roles come from the backend.
  const canViewAll = true;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    notConnected("Creating the timesheet");
  };

  return (
    <>
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
    </>
  );
}
