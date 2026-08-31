"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { DollarSign, X, UserCheck } from "lucide-react";
import { TeamUserSelect } from "@/components/TeamUserSelect";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar, personName } from "@/components/ui/person-cell";

interface UserOption {
    user_id: number;
    account: { first_name: string; last_name: string };
    email: string;
    role?: { name?: string };
}

interface BudgetChangeApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName: string;
    currentBudget: number;
    onSubmitted: () => void;
}

const authHeader = () => ({
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
});

const formatOMR = (n: number) =>
    `OMR ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function BudgetChangeApprovalModal({
    isOpen,
    onClose,
    projectId,
    projectName,
    currentBudget,
    onSubmitted,
}: BudgetChangeApprovalModalProps) {
    const [newBudgetAmount, setNewBudgetAmount] = useState("");
    const [reason, setReason] = useState("");
    const [selectedPmoId, setSelectedPmoId] = useState("");
    const [selectedFinId, setSelectedFinId] = useState("");
    const [pmoUsers, setPmoUsers] = useState<UserOption[]>([]);
    const [finUsers, setFinUsers] = useState<UserOption[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setNewBudgetAmount("");
            setReason("");
            setSelectedPmoId("");
            setSelectedFinId("");
        }
    }, [isOpen]);

    // Fetch PMO and Finance users when modal opens
    useEffect(() => {
        if (!isOpen) return;
        const fetchUsers = async () => {
            setLoadingUsers(true);
            try {
                const res = await axios.get("/api/users", { headers: authHeader() });
                const all: UserOption[] = res.data;

                const pmo = all.filter((u) =>
                    ["pmo", "dir", "admin", "administrator"].includes(
                        u.role?.name?.toLowerCase() ?? ""
                    )
                );
                const fin = all.filter(
                    (u) => u.role?.name?.toLowerCase() === "fin"
                );

                setPmoUsers(pmo);
                setFinUsers(fin);

                // Auto-select PMO if there is only one candidate
                if (pmo.length === 1) {
                    setSelectedPmoId(pmo[0].user_id.toString());
                }
            } catch {
                toast.error("Failed to load approvers");
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, [isOpen]);

    const handleSubmit = async () => {
        const parsed = parseFloat(newBudgetAmount);
        if (!newBudgetAmount || isNaN(parsed) || parsed <= 0) {
            toast.error("Please enter a valid budget amount");
            return;
        }
        if (!selectedPmoId || !selectedFinId) {
            toast.error("Please select both PMO and Finance approvers");
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(
                `/api/projects/${projectId}/approval`,
                {
                    type: "BUDGET_CHANGE",
                    pendingBudgetAmount: parsed,
                    userIds: [parseInt(selectedPmoId), parseInt(selectedFinId)],
                },
                { headers: authHeader() }
            );
            toast.success("Budget change submitted for approval");
            onClose();
            onSubmitted();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.error ?? "Failed to submit budget change"
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const singlePmo = pmoUsers.length === 1 ? pmoUsers[0] : null;
    const isValid = newBudgetAmount && parseFloat(newBudgetAmount) > 0 && selectedPmoId && selectedFinId;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                        <DollarSign size={18} className="text-info" />
                        Request Budget Change
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-faint hover:text-ink-3 hover:bg-surface-2 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Current budget context */}
                <div className="bg-surface-2 rounded-lg p-3 mb-5 flex justify-between items-center text-sm">
                    <span className="text-muted">Current Budget</span>
                    <span className="font-semibold text-ink">
                        {formatOMR(currentBudget)}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* New budget amount */}
                    <div>
                        <label className="block text-sm font-medium text-ink-3 mb-1">
                            New Planned Budget (OMR) <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 6,500,000"
                            value={newBudgetAmount ? Number(newBudgetAmount).toLocaleString("en-US") : ""}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                                setNewBudgetAmount(raw);
                            }}
                            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info"
                        />
                        {newBudgetAmount && !isNaN(parseFloat(newBudgetAmount)) && (
                            <p className="text-xs text-info mt-1">
                                → {formatOMR(parseFloat(newBudgetAmount))}
                                {parseFloat(newBudgetAmount) !== currentBudget && (
                                    <span className={`ml-2 ${parseFloat(newBudgetAmount) > currentBudget ? "text-bright" : "text-success"}`}>
                                        ({parseFloat(newBudgetAmount) > currentBudget ? "+" : ""}
                                        {formatOMR(parseFloat(newBudgetAmount) - currentBudget)})
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-ink-3 mb-1">
                            Reason / Justification
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Briefly explain why the budget needs to change"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info resize-none"
                        />
                    </div>

                    {/* PMO Approver */}
                    <div>
                        <label className="block text-sm font-medium text-ink-3 mb-1">
                            PMO Approver <span className="text-danger">*</span>
                        </label>
                        {loadingUsers ? (
                            <div className="h-10 bg-surface-2 rounded-lg animate-pulse" />
                        ) : singlePmo ? (
                            // Auto-selected — show as read-only card
                            <div className="flex items-center gap-3 px-3 py-2 bg-info-soft border border-info rounded-lg">
                                <UserAvatar name={personName(singlePmo)} className="h-8 w-8 text-sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-ink">
                                        {singlePmo.account.first_name} {singlePmo.account.last_name}
                                    </p>
                                    <p className="text-xs text-muted truncate">{singlePmo.email}</p>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-info font-medium shrink-0">
                                    <UserCheck size={12} />
                                    Auto-selected
                                </div>
                            </div>
                        ) : (
                            <TeamUserSelect
                                users={pmoUsers}
                                value={selectedPmoId}
                                onChange={setSelectedPmoId}
                                placeholder="Select PMO approver…"
                            />
                        )}
                    </div>

                    {/* Finance Approver — searchable */}
                    <div>
                        <label className="block text-sm font-medium text-ink-3 mb-1">
                            Finance Approver <span className="text-danger">*</span>
                        </label>
                        {loadingUsers ? (
                            <div className="h-10 bg-surface-2 rounded-lg animate-pulse" />
                        ) : (
                            <TeamUserSelect
                                users={finUsers}
                                value={selectedFinId}
                                onChange={setSelectedFinId}
                                placeholder="Search Finance approver…"
                                searchable
                            />
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-ink-3 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !isValid}
                        className="px-4 py-2 text-sm font-medium text-white bg-info rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {submitting ? (
                            <><Spinner size={14} /> Submitting…</>
                        ) : (
                            "Submit for Approval"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
