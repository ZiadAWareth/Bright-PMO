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
  InfoGrid,
  PageHeader,
  SubmitButton,
  textareaClass,
} from "@/components/ui/form-shell";
import { Dropdown } from "@/components/ui/dropdown";
import { Spinner } from "@/components/ui/spinner";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

/**
 * Edit a timesheet.
 *
 * Only status and comments are editable: the update endpoint accepts nothing
 * else, and the period, project and owner are what make a timesheet unique —
 * changing them would silently collide with another record. Those are shown
 * read-only for context rather than hidden, so the screen still answers "which
 * timesheet am I editing?".
 *
 * Hours are not editable here either; they come from the time entries on the
 * timesheet's own detail screen.
 */
export default function EditTimesheetPage() {
  const router = useRouter();
  const params = useParams();
  const timesheetId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("DRAFT");
  const [comments, setComments] = useState("");
  const [context, setContext] = useState<[string, React.ReactNode][]>([]);

  useEffect(() => {
    if (!timesheetId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get(`/api/timesheets/${timesheetId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (cancelled) return;

        const t = res.data?.timesheet ?? res.data;
        if (!t) {
          setNotFound(true);
          return;
        }

        setStatus(t.status ?? "DRAFT");
        setComments(t.comments ?? "");

        const owner = t.user?.account
          ? [t.user.account.first_name, t.user.account.last_name]
              .filter(Boolean)
              .join(" ")
          : "—";

        setContext([
          ["Project", t.project?.name ?? `Project #${t.project_id}`],
          ["Owner", owner],
          [
            "Period",
            `${formatDate(t.start_date)} – ${formatDate(t.end_date)}`,
          ],
          [
            "Total Hours",
            <span key="hours" className="tabular-nums">
              {t.total_hours ?? 0}
            </span>,
          ],
        ]);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [timesheetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSubmitting(true);
    try {
      await axios.put(
        `/api/timesheets/${timesheetId}`,
        { status, comments: comments.trim() || null },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      toast.success("Timesheet updated");
      router.push(`/timesheet/${timesheetId}`);
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Failed to update timesheet";
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
              title="Edit Timesheet"
              backHref="/timesheet"
              backLabel="Back to Timesheets"
            />
            <div className="flex items-center justify-center py-24">
              <Spinner size={32} className="text-bright" />
              <span className="ml-3 text-[13.5px] text-muted">
                Loading timesheet…
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
              title="Edit Timesheet"
              backHref="/timesheet"
              backLabel="Back to Timesheets"
            />
            <FormSection>
              <div className="py-10 text-center">
                <AlertCircle
                  size={40}
                  className="mx-auto mb-4 text-faint"
                  aria-hidden="true"
                />
                <h2 className="text-[15px] font-semibold text-ink">
                  Timesheet not found
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  The timesheet you are trying to edit could not be found, or
                  you do not have permission to modify it.
                </p>
                <div className="mt-5 flex justify-center">
                  <CancelButton href="/timesheet">
                    Back to timesheets
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
            title="Edit Timesheet"
            subtitle="Update the status and notes for this reporting period"
            backHref={`/timesheet/${timesheetId}`}
            backLabel="Back to Timesheet"
          />

          <FormError>{error}</FormError>

          <FormSection
            title="Timesheet"
            description="The period, project and owner are fixed once a timesheet exists."
          >
            <InfoGrid rows={context} />
          </FormSection>

          <FormSection
            title="Status & Notes"
            description="Where this timesheet stands, and anything worth recording."
          >
            <FieldGrid>
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

              <Field label="Comments" htmlFor="comments" full>
                <textarea
                  id="comments"
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Notes for the approver…"
                  disabled={submitting}
                  className={textareaClass}
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormFooter>
            <CancelButton href={`/timesheet/${timesheetId}`} />
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
