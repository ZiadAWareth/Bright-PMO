"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ProjectWithRelations } from "@/types/project";
import ProjectHealthDisplay from "@/components/ProjectHealthDisplay";

interface OverviewSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
    activeView: string;
    handleHealthScoreUpdate: (score: number) => void;
}

export default function OverviewSection({
    project,
    projectId,
    router,
    activeView,
    handleHealthScoreUpdate,
}: OverviewSectionProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Code</label>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{project.project_code}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portfolio</label>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{project.portfolio.name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{project.client}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contractor</label>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{project.contractor}</p>
                        </div>
                        {activeView === "admin" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">EPS Level</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{project.eps.name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Created By</label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{`${project.creator.account.first_name} ${project.creator.account.last_name}`}</p>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
                    </div>
                    <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                            {project.tags.map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded-md">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Key Milestones</h3>
                    </div>
                    <div className="space-y-4">
                        {project.tasks
                            .filter((task) => task.is_milestone)
                            .map((milestone) => (
                                <div key={milestone.task_id} className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                                    <div
                                        className={`w-3 h-3 rounded-full ${
                                            milestone.status === "completed"
                                                ? "bg-green-500"
                                                : milestone.status === "in_progress"
                                                ? "bg-blue-500"
                                                : milestone.status === "on_hold"
                                                ? "bg-red-500"
                                                : "bg-gray-400"
                                        }`}
                                    ></div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{milestone.name}</h4>
                                            <span className="text-sm text-gray-500">{new Date(milestone.end_date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{milestone.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">
                                                Assigned to:{" "}
                                                {milestone.assigned_users
                                                    ?.map((assignment) => `${assignment.user.account?.first_name} ${assignment.user.account?.last_name}`)
                                                    .join(", ") || "Unassigned"}
                                            </span>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-500">{milestone.progress_percentage}%</span>
                                                <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-1">
                                                    <div
                                                        className="bg-blue-600 h-1 rounded-full"
                                                        style={{ width: `${milestone.progress_percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Health</h3>
                    <ProjectHealthDisplay projectId={project.project_id} onHealthUpdate={handleHealthScoreUpdate} />
                </div>

                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Quality Score</span>
                            <span className="text-sm font-medium text-blue-600">{project.qualityScore}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Risk Level</span>
                            <span className={`text-sm font-medium ${project.riskScore > 70 ? "text-red-600" : project.riskScore > 40 ? "text-yellow-600" : "text-green-600"}`}>
                                {project.riskScore > 70 ? "High" : project.riskScore > 40 ? "Medium" : "Low"}
                            </span>
                        </div>
                        {activeView === "executive" && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Expected ROI</span>
                                <span className="text-sm font-medium text-green-600">{project.roi}%</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team</h3>
                        <span className="text-sm text-gray-500">{project.team_members.length} members</span>
                    </div>
                    <div className="space-y-3">
                        {project.team_members.slice(0, 3).map((member) => (
                            <div key={member.id} className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-orange-600">
                                        {`${member.user.account.first_name} ${member.user.account.last_name}`.split(" ").map((n) => n[0]).join("")}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{`${member.user.account.first_name} ${member.user.account.last_name}`}</p>
                                    <p className="text-xs text-gray-500">{member.user.role.name}</p>
                                </div>
                                {member.is_lead && (
                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded">Lead</span>
                                )}
                            </div>
                        ))}
                        {project.team_members.length > 3 && (
                            <button className="w-full text-sm text-orange-600 hover:text-orange-700 py-2" onClick={() => router.push(`/projects/${projectId}/team`)}>
                                View all {project.team_members.length} members
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
