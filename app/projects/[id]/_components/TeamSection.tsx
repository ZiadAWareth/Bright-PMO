"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";

interface TeamSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
}

export default function TeamSection({ project, projectId, router }: TeamSectionProps) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Team</h3>
                <button onClick={() => router.push(`/projects/${projectId}/team`)} className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    <ExternalLink size={16} />
                    <span>View Detailed Team</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.team_members.map((member) => (
                    <div key={member.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                                <span className="text-lg font-medium text-orange-600">
                                    {`${member.user.account.first_name} ${member.user.account.last_name}`.split(" ").map((n) => n[0]).join("")}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{`${member.user.account.first_name} ${member.user.account.last_name}`}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{member.user.role.name}</p>
                            </div>
                            {member.is_lead && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded">Lead</span>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Workload:</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-gray-900 dark:text-gray-100">{member.workload}%</span>
                                    <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${member.workload > 90 ? "bg-red-500" : member.workload > 75 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${member.workload}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Join Date:</span>
                                <span className="text-gray-900 dark:text-gray-100">{new Date(member.joined_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
