"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
    CheckCircle,
    AlertCircle,
    Clock,
    MessageSquare,
    Lock,
    X,
    RefreshCw,
    DollarSign,
} from "lucide-react";

interface ApprovalWorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName: string;
    projectCode?: string;
    /** The logged-in user's ID — used to show action buttons only to the designated reviewer */
    currentUserId?: number | null;
    /** Callback when an approval action is taken so the project page can refresh */
    onApprovalUpdated?: () => void;
    /** When set to 'BUDGET_CHANGE', only budget-change approvals are shown */
    approvalType?: "PROJECT_CREATION" | "BUDGET_CHANGE";
    /** The proposed new budget amount (only used when approvalType = BUDGET_CHANGE) */
    pendingBudgetAmount?: number | null;
    /** The current approved budget amount (only used when approvalType = BUDGET_CHANGE) */
    currentBudgetAmount?: number | null;
    /** Project creator/requester user id (used to control re-submit actions) */
    requesterUserId?: number | null;
}

const authHeader = () => ({
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
});

const formatMoney = (n: number) =>
    `OMR ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function pickLatestByStep(approvals: any[]): any[] {
    const byStep = new Map<number, any>();
    for (const approval of approvals) {
        const existing = byStep.get(approval.step);
        if (!existing || approval.id > existing.id) {
            byStep.set(approval.step, approval);
        }
    }
    return Array.from(byStep.values()).sort((a, b) => a.step - b.step);
}

export function ApprovalWorkflowModal({
    isOpen,
    onClose,
    projectId,
    projectName,
    projectCode,
    currentUserId,
    onApprovalUpdated,
    approvalType,
    pendingBudgetAmount,
    currentBudgetAmount,
    requesterUserId,
}: ApprovalWorkflowModalProps) {
    const [existingApprovals, setExistingApprovals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionState, setActionState] = useState<
        Record<number, { loading: boolean; showComments: boolean; comments: string }>
    >({});
    const [reRequestLoading, setReRequestLoading] = useState(false);
    // Budget re-submit state (used after REVISION_REQUESTED on a BUDGET_CHANGE)
    const [revisedBudget, setRevisedBudget] = useState("");
    const [reSubmitLoading, setReSubmitLoading] = useState(false);

    const isBudgetChange = approvalType === "BUDGET_CHANGE";

    const refreshApprovals = async () => {
        try {
            const res = await axios.get(`/api/projects/${projectId}/approval`, {
                headers: authHeader(),
            });
            // Filter by type if specified
            const all: any[] = res.data;
            const filtered = approvalType
                ? all.filter((a) => a.type === approvalType)
                : all;
            // Keep only latest record per step to avoid showing stale historical cycles.
            setExistingApprovals(pickLatestByStep(filtered));
        } catch {
            toast.error("Failed to load approvals");
        }
    };

    useEffect(() => {
        if (!isOpen || !projectId) return;
        setLoading(true);
        refreshApprovals().finally(() => setLoading(false));
    }, [isOpen, projectId]);

    const stepApproval = (step: number) =>
        existingApprovals.find((a: any) => a.step === step);

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
            APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
            REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
            REVISION_REQUESTED: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
            WAITING: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
        };
        return map[status] ?? map.WAITING;
    };

    const stepLabel = (stepNum: number) => {
        if (isBudgetChange) {
            if (stepNum === 1) return "PMO Review";
            return "Finance Review";
        }
        if (stepNum === 1) return "Creator Review";
        if (stepNum === 2) return "PJM Review";
        return "Finance Review";
    };

    const lockMessage = (stepNum: number) => {
        if (isBudgetChange) {
            return "Waiting for PMO review (Step 1) to complete first.";
        }
        if (stepNum === 2) return "Waiting for the project creator (Step 1) to approve first.";
        if (stepNum === 3) return "Waiting for PJM review (Step 2) to complete first.";
        return "Locked";
    };

    const handleAction = async (
        approval: any,
        status: "APPROVED" | "REJECTED" | "REVISION_REQUESTED"
    ) => {
        const id = approval.id;
        const comments = actionState[id]?.comments ?? "";
        if (status === "REVISION_REQUESTED" && !comments.trim()) {
            toast.error("Please enter revision notes before requesting changes.");
            return;
        }
        setActionState((s) => ({ ...s, [id]: { ...s[id], loading: true } }));
        try {
            await axios.patch(
                `/api/projects/${projectId}/approval/${id}`,
                { status, comments },
                { headers: authHeader() }
            );
            toast.success(
                status === "APPROVED"
                    ? "Approved successfully!"
                    : status === "REJECTED"
                    ? "Rejected."
                    : "Revision requested — creator will be notified."
            );
            await refreshApprovals();
            onApprovalUpdated?.();
        } catch (error: any) {
            toast.error(error.response?.data?.error ?? "Action failed");
        } finally {
            setActionState((s) => ({
                ...s,
                [id]: { ...s[id], loading: false, showComments: false, comments: "" },
            }));
        }
    };

    const handleReRequestReview = async () => {
        setReRequestLoading(true);
        try {
            await axios.post(
                `/api/projects/${projectId}/approval/re-request`,
                {},
                { headers: authHeader() }
            );
            toast.success("Re-review requested. The reviewer has been notified.");
            await refreshApprovals();
            onApprovalUpdated?.();
        } catch (error: any) {
            toast.error(error.response?.data?.error ?? "Failed to request re-review");
        } finally {
            setReRequestLoading(false);
        }
    };

    const handleBudgetReSubmit = async () => {
        const parsed = parseFloat(revisedBudget);
        if (!revisedBudget || isNaN(parsed) || parsed <= 0) {
            toast.error("Please enter a valid budget amount");
            return;
        }
        setReSubmitLoading(true);
        try {
            await axios.post(
                `/api/projects/${projectId}/approval/re-request`,
                { pendingBudgetAmount: parsed, approvalType: "BUDGET_CHANGE" },
                { headers: authHeader() }
            );
            toast.success("Revised budget re-submitted for PMO review.");
            setRevisedBudget("");
            await refreshApprovals();
            onApprovalUpdated?.();
        } catch (error: any) {
            toast.error(error.response?.data?.error ?? "Failed to re-submit budget change");
        } finally {
            setReSubmitLoading(false);
        }
    };

    const hasRevisionRequested = existingApprovals.some(
        (a: any) => a.status === "REVISION_REQUESTED"
    );

    // Re-submit is allowed for:
    // 1) project creator (even if also an approver), OR
    // 2) current user who is not one of the active-chain approvers (original requester pattern).
    const isRequester =
        currentUserId != null &&
        (
            (requesterUserId != null && currentUserId === requesterUserId) ||
            !existingApprovals.some((a: any) => a.user_id === currentUserId)
        );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <div className="flex items-center gap-2">
                        {isBudgetChange
                            ? <DollarSign className="w-6 h-6 text-blue-600" />
                            : <CheckCircle className="w-6 h-6 text-blue-600" />
                        }
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {isBudgetChange ? "Budget Change Approval" : "Approval Workflow"}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {projectName}
                                {projectCode ? ` (${projectCode})` : ""}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0">
                    {/* Budget change context banner */}
                    {isBudgetChange && (currentBudgetAmount != null || pendingBudgetAmount != null) && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3 text-sm">
                            <DollarSign className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="flex gap-4 flex-wrap">
                                {currentBudgetAmount != null && (
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Current: <strong className="text-gray-900 dark:text-gray-100">{formatMoney(currentBudgetAmount)}</strong>
                                    </span>
                                )}
                                {pendingBudgetAmount != null && (
                                    <span className="text-blue-700 dark:text-blue-300">
                                        Proposed: <strong>{formatMoney(pendingBudgetAmount)}</strong>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
                        </div>
                    ) : existingApprovals.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            {isBudgetChange
                                ? "No active budget change approval for this project."
                                : "No approval workflow for this project yet. Submit for approval from the project setup page."}
                        </p>
                    ) : (
                        <>
                            {/* Re-request review — project creation flow */}
                            {hasRevisionRequested && !isBudgetChange && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-orange-600" />
                                        <span className="text-sm text-orange-800 dark:text-orange-200">
                                            A reviewer requested changes. After editing the project,
                                            request re-review here.
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleReRequestReview}
                                        disabled={reRequestLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                    >
                                        {reRequestLoading ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4" />
                                        )}
                                        Request re-review
                                    </button>
                                </div>
                            )}

                            {/* Budget re-submit banner — only shown to the requester, never to approvers */}
                            {hasRevisionRequested && isBudgetChange && isRequester && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-orange-600 shrink-0" />
                                        <span className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                                            The reviewer requested a change to the proposed budget. Enter the revised amount and re-submit.
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 dark:text-gray-400">OMR</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={revisedBudget ? Number(revisedBudget.replace(/,/g, "")).toLocaleString("en-US") : ""}
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                                                    setRevisedBudget(raw);
                                                }}
                                                className="w-full pl-12 pr-3 py-2 border border-orange-300 dark:border-orange-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                            />
                                        </div>
                                        <button
                                            onClick={handleBudgetReSubmit}
                                            disabled={reSubmitLoading || !revisedBudget}
                                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 shrink-0"
                                        >
                                            {reSubmitLoading ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            ) : (
                                                <RefreshCw className="w-4 h-4" />
                                            )}
                                            Re-submit
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Render steps: 3-step for PROJECT_CREATION, 2-step for BUDGET_CHANGE */}
                            {(isBudgetChange
                                ? [stepApproval(1), stepApproval(2)]
                                : [stepApproval(1), stepApproval(2), stepApproval(3)]
                            ).map((approval) => {
                                if (!approval) return null;
                                const stepNum: number = approval.step;
                                const isLocked = approval.status === "WAITING";
                                const isDone = ["APPROVED", "REJECTED"].includes(approval.status);
                                // No creator self-confirmation step in budget change flow
                                const isCreatorStep = !isBudgetChange && stepNum === 1;
                                const aState = actionState[approval.id] ?? {
                                    loading: false,
                                    showComments: false,
                                    comments: "",
                                };
                                const userName = approval.user?.account
                                    ? `${approval.user.account.first_name} ${approval.user.account.last_name}`
                                    : approval.user?.role?.name ?? "Unknown";

                                return (
                                    <div
                                        key={approval.id}
                                        className={`rounded-xl border-l-4 p-4 shadow-sm ${
                                            isLocked
                                                ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 opacity-80"
                                                : approval.status === "APPROVED"
                                                ? "border-green-500 bg-green-50/50 dark:bg-green-900/20"
                                                : approval.status === "REJECTED"
                                                ? "border-red-500 bg-red-50/50 dark:bg-red-900/20"
                                                : approval.status === "REVISION_REQUESTED"
                                                ? "border-orange-500 bg-orange-50/50 dark:bg-orange-900/20"
                                                : "border-blue-500 bg-white dark:bg-gray-800"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                                                    {stepNum}
                                                </span>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {stepLabel(stepNum)}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {userName} · {approval.user?.role?.name}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isLocked && <Lock className="w-4 h-4 text-gray-400" />}
                                                <span
                                                    className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadge(
                                                        approval.status
                                                    )}`}
                                                >
                                                    {approval.status.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                        </div>

                                        {approval.comments && (
                                            <div className="bg-orange-100/50 dark:bg-orange-900/30 rounded-lg p-3 mb-3 flex gap-2">
                                                <MessageSquare className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">
                                                        Reviewer notes
                                                    </p>
                                                    <p className="text-sm text-orange-800 dark:text-orange-300">
                                                        {approval.comments}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {approval.reviewed_at && (
                                            <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Reviewed{" "}
                                                {new Date(approval.reviewed_at).toLocaleString()}
                                            </p>
                                        )}

                                        {!isLocked && !isDone && currentUserId != null && approval.user_id === currentUserId && (
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
                                                {aState.showComments && (
                                                    <textarea
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                                        rows={3}
                                                        placeholder="Describe what needs to be revised…"
                                                        value={aState.comments}
                                                        onChange={(e) =>
                                                            setActionState((s) => ({
                                                                ...s,
                                                                [approval.id]: {
                                                                    ...s[approval.id],
                                                                    comments: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                )}
                                                <div className="flex gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => handleAction(approval, "APPROVED")}
                                                        disabled={aState.loading}
                                                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        {isCreatorStep
                                                            ? "Looks good — advance to PJM"
                                                            : isBudgetChange && stepNum === 1
                                                            ? "Approve — advance to Finance"
                                                            : "Approve"}
                                                    </button>
                                                    {!isCreatorStep && (
                                                        <>
                                                            {!aState.showComments ? (
                                                                <button
                                                                    onClick={() =>
                                                                        setActionState((s) => ({
                                                                            ...s,
                                                                            [approval.id]: {
                                                                                ...s[approval.id],
                                                                                showComments: true,
                                                                            },
                                                                        }))
                                                                    }
                                                                    className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 flex items-center gap-2"
                                                                >
                                                                    <MessageSquare className="w-4 h-4" />
                                                                    Request revision
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() =>
                                                                        handleAction(
                                                                            approval,
                                                                            "REVISION_REQUESTED"
                                                                        )
                                                                    }
                                                                    disabled={aState.loading}
                                                                    className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                                                                >
                                                                    <MessageSquare className="w-4 h-4" />
                                                                    Send revision request
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleAction(approval, "REJECTED")}
                                                                disabled={aState.loading}
                                                                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                                            >
                                                                <AlertCircle className="w-4 h-4" />
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {isLocked && (
                                            <p className="text-sm text-gray-400 flex items-center gap-2 mt-2">
                                                <Lock className="w-4 h-4" />
                                                {lockMessage(stepNum)}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
