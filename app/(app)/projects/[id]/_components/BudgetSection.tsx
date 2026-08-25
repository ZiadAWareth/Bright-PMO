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
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Budget Overview</h3>
                <button onClick={() => router.push(`/projects/${projectId}/budget`)} className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    <ExternalLink size={16} />
                    <span>View Detailed Budget</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Budget</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(project.budget_amount)}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Spent</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(project.actual_cost)}</p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                                {((project.actual_cost / project.budget_amount) * 100).toFixed(1)}% of budget
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Budget Progress</h4>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{((project.actual_cost / project.budget_amount) * 100).toFixed(1)}% utilized</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                        className={`h-3 rounded-full transition-all duration-300 ${(project.actual_cost / project.budget_amount) * 100 > 90 ? "bg-red-500" : (project.actual_cost / project.budget_amount) * 100 > 75 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min((project.actual_cost / project.budget_amount) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">View detailed budget breakdown, category analysis, and spending forecasts</p>
                <button onClick={() => router.push(`/projects/${projectId}/budget`)} className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm">
                    <span>Explore detailed budget analysis</span>
                    <ExternalLink size={14} />
                </button>
            </div>
        </div>
    );
}
