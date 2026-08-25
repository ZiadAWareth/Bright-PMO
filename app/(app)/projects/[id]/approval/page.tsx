"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { TeamUserSelect } from "@/components/TeamUserSelect";
import axios from "axios";
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
    const [loading, setLoading] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(false);
    const [existingApprovals, setExistingApprovals] = useState<any[]>([]);
    const [creatingApprovals, setCreatingApprovals] = useState(false);

    const token = () =>
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const authHeader = () => ({ Authorization: `Bearer ${token()}` });

    useEffect(() => {
        async function fetchData() {
            try {
                const projectRes = await axios.get(`/api/projects/${projectId}`, {
                    headers: authHeader(),
                });
                setProject(projectRes.data);

                const approvalsRes = await axios.get(
                    `/api/projects/${projectId}/approval`,
                    { headers: authHeader() }
                );
                setExistingApprovals(approvalsRes.data);

                const usersRes = await axios.get(`/api/users`, {
                    headers: authHeader(),
                });
                const allUsers = usersRes.data;

                const managerUser = allUsers.find(
                    (u: any) => u.user_id === projectRes.data.manager_id
                );

                setUsersByRole({
                    PJM: managerUser ? [managerUser] : [],
                    FIN: allUsers.filter((u: any) => u.role?.name === "FIN"),
                });

                setForm((f) => ({
                    ...f,
                    PJM: projectRes.data.manager_id?.toString() || "",
                }));
            } catch {
                toast.error("Failed to load project or users");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [projectId]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const p = new URLSearchParams(window.location.search);
            setShowNavButtons(p.get("from") === "setup" || p.get("from") === "previous");
        }
    }, []);

    const refreshApprovals = async () => {
        const res = await axios.get(`/api/projects/${projectId}/approval`, {
            headers: authHeader(),
        });
        setExistingApprovals(res.data);
    };

    // Create approvals (submit for approval) — workflow is managed on the project page
    const handleCreateApprovals = async () => {
        if (!form.PJM || !form.FIN) {
            toast.error("Please select a user for PJM and Finance.");
            return;
        }
        setCreatingApprovals(true);
        try {
            const response = await axios.post(
                `/api/projects/${projectId}/approval`,
                { userIds: [parseInt(form.PJM), parseInt(form.FIN)] },
                { headers: authHeader() }
            );
            toast.success(response.data.message);
            await refreshApprovals();
        } catch (error: any) {
            if (error.response?.status === 409) {
                toast.error(error.response.data.error);
                await refreshApprovals();
            } else {
                toast.error("Failed to create approvals");
            }
        } finally {
            setCreatingApprovals(false);
        }
    };

    const approvalsCreated = existingApprovals.length > 0;

    // ── loading / not found guards ────────────────────────────────────────────
    if (loading) {
        return (
            <DashboardLayout title="Project Approvals" onViewChange={() => {}} activeView="admin">
                <div className="flex items-center justify-center min-h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout title="Project Approvals" onViewChange={() => {}} activeView="admin">
                <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Project Not Found
                    </h2>
                    <button
                        onClick={() => router.push("/projects")}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Projects
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    // ── main render ───────────────────────────────────────────────────────────
    return (
        <DashboardLayout title="Project Approvals" onViewChange={() => {}} activeView="admin">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
                <button
                    onClick={() => router.push(`/projects/${projectId}/setup`)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Project Approvals
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {project.name} ({project.project_code})
                    </p>
                </div>
            </div>

            {/* Project info banner */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div className="bg-white/10 rounded-lg p-4 flex items-center space-x-3">
                        <Users className="w-5 h-5" />
                        <div>
                            <p className="text-sm font-medium">Project Code</p>
                            <p className="text-blue-100 text-sm">{project.project_code}</p>
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 flex items-center space-x-3">
                        <DollarSign className="w-5 h-5" />
                        <div>
                            <p className="text-sm font-medium">Budget</p>
                            <p className="text-blue-100 text-sm">
                                OMR {project.budget_amount?.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 flex items-center space-x-3">
                        <Calendar className="w-5 h-5" />
                        <div>
                            <p className="text-sm font-medium">Start Date</p>
                            <p className="text-blue-100 text-sm">
                                {new Date(project.start_date).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Approver setup (only shown before approvals are created) ── */}
            {!approvalsCreated && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Submit for Approval
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        A 3-step sequential workflow will be created: Creator → PJM → Finance.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Step 1 — Creator (auto) */}
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 border border-dashed border-gray-300 dark:border-gray-700">
                            <label className="block font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Step 1 — Creator
                            </label>
                            <p className="text-xs text-gray-400 mb-2">Auto-set to project creator</p>
                            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
                                <UserCheck className="w-4 h-4" />
                                <span>Project Creator (you)</span>
                            </div>
                        </div>
                        {/* Step 2 — PJM — locked to project manager */}
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                            <label className="block font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Step 2 — PJM (Project Manager)
                            </label>
                            <p className="text-xs text-gray-400 mb-2">Auto-set to assigned PM</p>
                            <TeamUserSelect
                                users={usersByRole.PJM || []}
                                value={form.PJM}
                                onChange={() => {}}
                                placeholder="Project Manager"
                                disabled={true}
                            />
                        </div>
                        {/* Step 3 — FIN — selectable */}
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                            <label className="block font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Step 3 — Finance (FIN)
                            </label>
                            <p className="text-xs text-gray-400 mb-2">Select the Finance approver</p>
                            <TeamUserSelect
                                users={usersByRole.FIN || []}
                                value={form.FIN}
                                onChange={(userId) => setForm((f) => ({ ...f, FIN: userId }))}
                                placeholder="Select Finance approver"
                            />
                        </div>
                    </div>
                    <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                        <button
                            type="button"
                            onClick={handleCreateApprovals}
                            disabled={creatingApprovals}
                            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {creatingApprovals ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                                <UserCheck className="w-4 h-4" />
                            )}
                            <span>{creatingApprovals ? "Submitting…" : "Submit for Approval"}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* After approvals are created: direct users to the project page for workflow */}
            {approvalsCreated && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                        Approval workflow started
                    </h2>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                        Approvers have been set. All approval actions (approve, reject, request
                        revision) and communication between levels happen on the project page so
                        everyone stays on the same page.
                    </p>
                    <button
                        onClick={() => router.push(`/projects/${projectId}`)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                        className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Setup</span>
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                await axios.patch(
                                    `/api/projects/${projectId}/setup`,
                                    { execution: true },
                                    { headers: authHeader() }
                                );
                                router.push(`/projects/${projectId}`);
                            } catch {
                                toast.error("Failed to mark approval as complete.");
                            }
                        }}
                        className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <span>Next: Project Overview</span>
                        <Plus size={16} />
                    </button>
                </div>
            )}
        </DashboardLayout>
    );
}
