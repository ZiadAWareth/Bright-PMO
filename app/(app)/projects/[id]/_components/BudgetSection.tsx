"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { DollarSign, TrendingUp, ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import { formatCurrency } from "./constants";
import { StatCard } from "@/components/ui/form-shell";

interface BudgetSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
}

export default function BudgetSection({ project, projectId, router }: BudgetSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Project Budget Overview</h3>
                <button onClick={() => router.push(`/projects/${projectId}/budget`)} className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                    <ExternalLink size={16} />
                    <span>View Detailed Budget</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <StatCard
                    label="Total Budget"
                    value={formatCurrency(project.budget_amount)}
                    icon={DollarSign}
                    tone="info"
                />
                <StatCard
                    label="Spent"
                    value={formatCurrency(project.actual_cost)}
                    hint={`${((project.actual_cost / project.budget_amount) * 100).toFixed(1)}% of budget`}
                    icon={TrendingUp}
                    tone="success"
                />
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-ink">Budget Progress</h4>
                    <span className="text-sm text-muted">{((project.actual_cost / project.budget_amount) * 100).toFixed(1)}% utilized</span>
                </div>
                <div className="w-full bg-surface-3 rounded-full h-3">
                    <div
                        className={`h-3 rounded-full transition-all duration-300 ${(project.actual_cost / project.budget_amount) * 100 > 90 ? "bg-danger" : (project.actual_cost / project.budget_amount) * 100 > 75 ? "bg-warning" : "bg-success"}`}
                        style={{ width: `${Math.min((project.actual_cost / project.budget_amount) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
