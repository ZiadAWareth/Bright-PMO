"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { TeamUserSelect } from "@/features/team/components/TeamUserSelect";
import { notConnected } from "@/lib/not-connected";
import { toast } from "sonner";
import {
    Users,
    DollarSign,
    Calendar,
    ArrowLeft,
    Plus,
    UserCheck,
    AlertCircle,
    ExternalLink,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { FormSection, InfoGrid } from "@/components/ui/form-shell";

export default function ApprovalsPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [usersByRole, setUsersByRole] = useState<Record<string, any[]>>({});
    const [project, setProject] = useState<any>(null);
    const [form, setForm] = useState<{ [key: string]: string }>({
        PJM: "",
        FIN: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showNavButtons, setShowNavButtons] = useState(false);
    const [existingApprovals, setExistingApprovals] = useState<any[]>([]);
    const [creatingApprovals, setCreatingApprovals] = useState(false);

    // notConnected: the project, its approvals and the PJM/Finance users to pick
    // from would be loaded here.

    useEffect(() => {
        if (typeof window !== "undefined") {
            const p = new URLSearchParams(window.location.search);
            setShowNavButtons(p.get("from") === "setup" || p.get("from") === "previous");
        }
    }, []);

    // Create approvals (submit for approval) — workflow is managed on the project page
    const handleCreateApprovals = async () => {
        if (!form.PJM || !form.FIN) {
            toast.error("Please select a user for PJM and Finance.");
            return;
        }
        notConnected("Requesting approvals");
    };

    const approvalsCreated = existingApprovals.length > 0;

    // ── loading / not found guards ────────────────────────────────────────────
    if (loading) {
        return (
            <DashboardLayout title="Project Approvals" onViewChange={() => {}} activeView="admin">
                <div className="flex items-center justify-center min-h-96">
                    <Spinner size={32} className="text-bright-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout title="Project Approvals" onViewChange={() => {}} activeView="admin">
                <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-ink mb-2">
                        Project Not Found
                    </h2>
                    <button
                        onClick={() => router.push("/projects")}
                        className="px-6 py-3 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
                    >
                        Back to Projects
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    // ── main render ───────────────────────────────────────────────────────────
    return (
        <DashboardLayout
            title="Project Approvals"
            subtitle={`${project.name} (${project.project_code})`}
            backHref={`/projects/${projectId}/setup`}
            backLabel="Back to Setup"
            onViewChange={() => {}}
            activeView="admin"
        >
            <FormSection title="Project" className="mb-6">
                <InfoGrid
                    rows={[
                        ["Project Code", project.project_code],
                        [
                            "Budget",
                            <span key="budget" className="tabular-nums">
                                OMR {project.budget_amount?.toLocaleString() ?? "—"}
                            </span>,
                        ],
                        [
                            "Start Date",
                            new Date(project.start_date).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            }),
                        ],
                    ]}
                />
            </FormSection>

            {/* ── Approver setup (only shown before approvals are created) ── */}
            {!approvalsCreated && (
                <FormSection
                    title="Submit for Approval"
                    description="A 3-step sequential workflow will be created: Creator → PJM → Finance."
                    className="mb-6"
                >
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Step 1 — Creator (auto) */}
                        <div className="rounded-[10px] border border-dashed border-line bg-surface-2 p-4">
                            <label className="mb-1 block text-[13px] font-medium text-ink">
                                Step 1 — Creator
                            </label>
                            <p className="text-xs text-faint mb-2">Auto-set to project creator</p>
                            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-surface border border-line text-sm text-muted">
                                <UserCheck className="w-4 h-4" />
                                <span>Project Creator (you)</span>
                            </div>
                        </div>
                        {/* Step 2 — PJM — locked to project manager */}
                        <div className="rounded-[10px] border border-line bg-surface-2 p-4">
                            <label className="mb-1 block text-[13px] font-medium text-ink">
                                Step 2 — PJM (Project Manager)
                            </label>
                            <p className="text-xs text-faint mb-2">Auto-set to assigned PM</p>
                            <TeamUserSelect
                                users={usersByRole.PJM || []}
                                value={form.PJM}
                                onChange={() => {}}
                                placeholder="Project Manager"
                                disabled={true}
                            />
                        </div>
                        {/* Step 3 — FIN — selectable */}
                        <div className="rounded-[10px] border border-line bg-surface-2 p-4">
                            <label className="mb-1 block text-[13px] font-medium text-ink">
                                Step 3 — Finance (FIN)
                            </label>
                            <p className="text-xs text-faint mb-2">Select the Finance approver</p>
                            <TeamUserSelect
                                users={usersByRole.FIN || []}
                                value={form.FIN}
                                onChange={(userId) => setForm((f) => ({ ...f, FIN: userId }))}
                                placeholder="Select Finance approver"
                            />
                        </div>
                    </div>
                    <div className="flex justify-center pt-6 border-t border-line mt-6">
                        <button
                            type="button"
                            onClick={handleCreateApprovals}
                            disabled={creatingApprovals}
                            className="flex items-center space-x-2 px-6 py-3 bg-success text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
                        >
                            {creatingApprovals ? (
                                <Spinner size={16} />
                            ) : (
                                <UserCheck className="w-4 h-4" />
                            )}
                            <span>{creatingApprovals ? "Submitting…" : "Submit for Approval"}</span>
                        </button>
                    </div>
                </FormSection>
            )}

            {/* After approvals are created: direct users to the project page for workflow */}
            {approvalsCreated && (
                <div className="bg-success-soft border border-success rounded-xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-success mb-2">
                        Approval workflow started
                    </h2>
                    <p className="text-sm text-success mb-4">
                        Approvers have been set. All approval actions (approve, reject, request
                        revision) and communication between levels happen on the project page so
                        everyone stays on the same page.
                    </p>
                    <button
                        onClick={() => router.push(`/projects/${projectId}`)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-success text-white rounded-lg hover:opacity-90 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Open project & manage approvals
                    </button>
                </div>
            )}

            {/* Bottom navigation */}
            {showNavButtons && (
                <div className="mt-8 flex justify-between">
                    <button
                        onClick={() => router.push(`/projects/${projectId}/setup`)}
                        className="flex items-center space-x-2 px-6 py-3 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Setup</span>
                    </button>
                    <button
                        onClick={() => {
                            // notConnected: marks the approval step complete in the project setup.
                            router.push(`/projects/${projectId}`);
                        }}
                        className="flex items-center space-x-2 px-6 py-3 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
                    >
                        <span>Next: Project Overview</span>
                        <Plus size={16} />
                    </button>
                </div>
            )}
        </DashboardLayout>
    );
}
