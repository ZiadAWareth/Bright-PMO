"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { DollarSign, TrendingUp, ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import { formatCurrency } from "./constants";

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-info-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-info font-medium">Total Budget</p>
                            <p className="text-2xl font-bold text-info">{formatCurrency(project.budget_amount)}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-info" />
                    </div>
                </div>
                <div className="bg-success-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success font-medium">Spent</p>
                            <p className="text-2xl font-bold text-success">{formatCurrency(project.actual_cost)}</p>
                            <p className="text-xs text-success">
                                {((project.actual_cost / project.budget_amount) * 100).toFixed(1)}% of budget
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-success" />
                    </div>
                </div>
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

            <div className="bg-surface-2 rounded-lg p-4 text-center">
                <p className="text-muted text-sm mb-3">View detailed budget breakdown, category analysis, and spending forecasts</p>
                <button onClick={() => router.push(`/projects/${projectId}/budget`)} className="inline-flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors font-medium text-sm">
                    <span>Explore detailed budget analysis</span>
                    <ExternalLink size={14} />
                </button>
            </div>
        </div>
    );
}
