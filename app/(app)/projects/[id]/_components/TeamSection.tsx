"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import { UserAvatar } from "@/components/ui/person-cell";

interface TeamSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
}

export default function TeamSection({ project, projectId, router }: TeamSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Project Team</h3>
                <button onClick={() => router.push(`/projects/${projectId}/team`)} className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                    <ExternalLink size={16} />
                    <span>View Detailed Team</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.team_members.map((member) => (
                    <div key={member.id} className="border border-line rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <UserAvatar
                                name={`${member.user.account.first_name} ${member.user.account.last_name}`}
                                className="h-12 w-12 text-lg"
                            />
                            <div className="flex-1">
                                <h4 className="font-medium text-ink">{`${member.user.account.first_name} ${member.user.account.last_name}`}</h4>
                                <p className="text-sm text-muted">{member.user.role.name}</p>
                            </div>
                            {member.is_lead && (
                                <span className="px-2 py-1 bg-info-soft text-info text-xs rounded">Lead</span>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted">Workload:</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-ink">{member.workload}%</span>
                                    <div className="w-16 bg-surface-3 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${member.workload > 90 ? "bg-danger" : member.workload > 75 ? "bg-warning" : "bg-success"}`} style={{ width: `${member.workload}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted">Join Date:</span>
                                <span className="text-ink">{new Date(member.joined_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
