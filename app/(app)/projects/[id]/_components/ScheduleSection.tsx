"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Calendar, Target, AlertTriangle, Clock, BarChart3, ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";

interface ScheduleSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
}

export default function ScheduleSection({ project, projectId, router }: ScheduleSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Project Schedule & Deadlines</h3>
                <button onClick={() => router.push(`/projects/${projectId}/schedule`)} className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                    <ExternalLink size={16} />
                    <span>Full Schedule View</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-info-soft rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-info">This Week</h4>
                        <Calendar className="w-6 h-6 text-info" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-info">Due Tasks</span>
                            <span className="font-bold text-info">
                                {project.tasks?.filter((task) => {
                                    const taskDate = new Date(task.end_date);
                                    const today = new Date();
                                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                                    return taskDate >= today && taskDate <= weekFromNow;
                                }).length || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-info">Starting</span>
                            <span className="font-bold text-info">
                                {project.tasks?.filter((task) => {
                                    const taskDate = new Date(task.start_date);
                                    const today = new Date();
                                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                                    return taskDate >= today && taskDate <= weekFromNow;
                                }).length || 0}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-accent-violet-soft rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-accent-violet">Next Milestone</h4>
                        <Target className="w-6 h-6 text-accent-violet" />
                    </div>
                    {(() => {
                        const nextMilestone = project.tasks
                            ?.filter((task) => task.is_milestone && new Date(task.end_date) > new Date())
                            .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0];
                        return nextMilestone ? (
                            <div className="space-y-2">
                                <h5 className="font-medium text-accent-violet">{nextMilestone.name}</h5>
                                <p className="text-sm text-accent-violet">Due: {new Date(nextMilestone.end_date).toLocaleDateString()}</p>
                                <div className="w-full bg-accent-violet-soft rounded-full h-2">
                                    <div className="bg-accent-violet h-2 rounded-full" style={{ width: `${nextMilestone.progress_percentage}%` }}></div>
                                </div>
                                <p className="text-xs text-accent-violet">{nextMilestone.progress_percentage}% Complete</p>
                            </div>
                        ) : (
                            <p className="text-sm text-accent-violet">No upcoming milestones</p>
                        );
                    })()}
                </div>

                <div className="bg-danger-soft rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-danger">Attention Needed</h4>
                        <AlertTriangle className="w-6 h-6 text-danger" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-danger">Overdue</span>
                            <span className="font-bold text-danger">
                                {project.tasks?.filter((task) => new Date(task.end_date) < new Date() && task.status !== "completed").length || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-danger">High Priority</span>
                            <span className="font-bold text-danger">
                                {project.tasks?.filter((task) => task.priority === "high" && task.status !== "completed").length || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h4 className="font-semibold text-ink mb-4 flex items-center space-x-2">
                    <Clock size={20} />
                    <span>Upcoming Deadlines (Next 30 Days)</span>
                </h4>
                <div className="space-y-3">
                    {project.tasks && project.tasks.length > 0
                        ? project.tasks
                              .filter((task) => {
                                  const taskDate = new Date(task.end_date);
                                  const today = new Date();
                                  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                                  return taskDate >= today && taskDate <= thirtyDaysFromNow && task.status !== "completed";
                              })
                              .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
                              .slice(0, 10)
                              .map((task) => {
                                  const daysUntilDue = Math.ceil((new Date(task.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                  return (
                                      <div key={task.task_id} className="flex items-center justify-between p-4 border border-line rounded-lg hover:bg-surface-2 transition-colors">
                                          <div className="flex items-center space-x-4">
                                              <div className={`w-3 h-3 rounded-full ${daysUntilDue <= 3 ? "bg-danger" : daysUntilDue <= 7 ? "bg-warning" : "bg-success"}`}></div>
                                              <div>
                                                  <h5 className="font-medium text-ink flex items-center space-x-2">
                                                      <span>{task.name}</span>
                                                      {task.is_milestone && <span className="px-2 py-1 bg-accent-violet-soft text-accent-violet text-xs rounded-full">Milestone</span>}
                                                      {task.priority === "high" && <span className="px-2 py-1 bg-danger-soft text-danger text-xs rounded-full">High Priority</span>}
                                                  </h5>
                                                  <div className="flex items-center space-x-3 text-sm text-muted">
                                                      <span>Due: {new Date(task.end_date).toLocaleDateString()}</span>
                                                      <span>•</span>
                                                      <span className={daysUntilDue <= 3 ? "text-danger font-medium" : daysUntilDue <= 7 ? "text-warning font-medium" : "text-muted"}>
                                                          {daysUntilDue === 0 ? "Due today" : daysUntilDue === 1 ? "Due tomorrow" : `${daysUntilDue} days left`}
                                                      </span>
                                                      <span>•</span>
                                                      <span>{task.status.replace("_", " ")}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="flex items-center space-x-2">
                                                  <span className="text-sm font-medium text-ink">{task.progress_percentage}%</span>
                                                  <div className="w-20 bg-surface-3 rounded-full h-2">
                                                      <div className={`h-2 rounded-full ${task.status === "completed" ? "bg-success" : task.status === "in_progress" ? "bg-info" : daysUntilDue <= 3 ? "bg-danger" : "bg-faint"}`} style={{ width: `${task.progress_percentage}%` }}></div>
                                                  </div>
                                              </div>
                                              <p className="text-xs text-muted mt-1">{task.assigned_users?.length ? `${task.assigned_users.length} assigned` : "Unassigned"}</p>
                                          </div>
                                      </div>
                                  );
                              })
                        : null}

                    {(!project.tasks ||
                        project.tasks.filter((task) => {
                            const taskDate = new Date(task.end_date);
                            const today = new Date();
                            const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                            return taskDate >= today && taskDate <= thirtyDaysFromNow && task.status !== "completed";
                        }).length === 0) && (
                        <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                            <Calendar className="w-12 h-12 text-faint mx-auto mb-3" />
                            <h4 className="text-lg font-medium text-ink mb-2">No Upcoming Deadlines</h4>
                            <p className="text-muted">All tasks are either completed or due beyond the next 30 days.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gradient-to-r from-surface-2 to-surface-2 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-ink flex items-center space-x-2">
                        <BarChart3 size={20} />
                        <span>Schedule Overview</span>
                    </h4>
                    <button onClick={() => router.push(`/projects/${projectId}/schedule`)} className="text-sm text-bright hover:text-bright-deep font-medium flex items-center space-x-1">
                        <span>View Detailed Schedule</span>
                        <ExternalLink size={14} />
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-ink">
                            {Math.ceil((new Date(project.planned_end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))}
                        </p>
                        <p className="text-sm text-muted">Total Days</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-info">
                            {Math.max(0, Math.ceil((new Date().getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24)))}
                        </p>
                        <p className="text-sm text-muted">Days Elapsed</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-bright">
                            {Math.max(0, Math.ceil((new Date(project.planned_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                        </p>
                        <p className="text-sm text-muted">Days Remaining</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-success">{project.progress_percentage}%</p>
                        <p className="text-sm text-muted">Complete</p>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex items-center justify-between text-sm text-muted mb-2">
                        <span>Project Timeline</span>
                        <span>{new Date(project.start_date).toLocaleDateString()} - {new Date(project.planned_end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="w-full bg-surface-3 rounded-full h-3">
                        <div className="bg-gradient-to-r from-info to-success h-3 rounded-full transition-all duration-300" style={{ width: `${project.progress_percentage}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
