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
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Schedule & Deadlines</h3>
                <button onClick={() => router.push(`/projects/${projectId}/schedule`)} className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    <ExternalLink size={16} />
                    <span>Full Schedule View</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100">This Week</h4>
                        <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700 dark:text-blue-300">Due Tasks</span>
                            <span className="font-bold text-blue-900 dark:text-blue-100">
                                {project.tasks?.filter((task) => {
                                    const taskDate = new Date(task.end_date);
                                    const today = new Date();
                                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                                    return taskDate >= today && taskDate <= weekFromNow;
                                }).length || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700 dark:text-blue-300">Starting</span>
                            <span className="font-bold text-blue-900 dark:text-blue-100">
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

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100">Next Milestone</h4>
                        <Target className="w-6 h-6 text-purple-600" />
                    </div>
                    {(() => {
                        const nextMilestone = project.tasks
                            ?.filter((task) => task.is_milestone && new Date(task.end_date) > new Date())
                            .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0];
                        return nextMilestone ? (
                            <div className="space-y-2">
                                <h5 className="font-medium text-purple-900 dark:text-purple-100">{nextMilestone.name}</h5>
                                <p className="text-sm text-purple-700 dark:text-purple-300">Due: {new Date(nextMilestone.end_date).toLocaleDateString()}</p>
                                <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${nextMilestone.progress_percentage}%` }}></div>
                                </div>
                                <p className="text-xs text-purple-600">{nextMilestone.progress_percentage}% Complete</p>
                            </div>
                        ) : (
                            <p className="text-sm text-purple-700 dark:text-purple-300">No upcoming milestones</p>
                        );
                    })()}
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-red-900 dark:text-red-100">Attention Needed</h4>
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-red-700 dark:text-red-300">Overdue</span>
                            <span className="font-bold text-red-900 dark:text-red-100">
                                {project.tasks?.filter((task) => new Date(task.end_date) < new Date() && task.status !== "completed").length || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-red-700 dark:text-red-300">High Priority</span>
                            <span className="font-bold text-red-900 dark:text-red-100">
                                {project.tasks?.filter((task) => task.priority === "high" && task.status !== "completed").length || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
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
                                      <div key={task.task_id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                          <div className="flex items-center space-x-4">
                                              <div className={`w-3 h-3 rounded-full ${daysUntilDue <= 3 ? "bg-red-500" : daysUntilDue <= 7 ? "bg-yellow-500" : "bg-green-500"}`}></div>
                                              <div>
                                                  <h5 className="font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                                                      <span>{task.name}</span>
                                                      {task.is_milestone && <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 text-xs rounded-full">Milestone</span>}
                                                      {task.priority === "high" && <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs rounded-full">High Priority</span>}
                                                  </h5>
                                                  <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                                                      <span>Due: {new Date(task.end_date).toLocaleDateString()}</span>
                                                      <span>•</span>
                                                      <span className={daysUntilDue <= 3 ? "text-red-600 font-medium" : daysUntilDue <= 7 ? "text-yellow-600 font-medium" : "text-gray-600"}>
                                                          {daysUntilDue === 0 ? "Due today" : daysUntilDue === 1 ? "Due tomorrow" : `${daysUntilDue} days left`}
                                                      </span>
                                                      <span>•</span>
                                                      <span>{task.status.replace("_", " ")}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="flex items-center space-x-2">
                                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.progress_percentage}%</span>
                                                  <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                      <div className={`h-2 rounded-full ${task.status === "completed" ? "bg-green-500" : task.status === "in_progress" ? "bg-blue-500" : daysUntilDue <= 3 ? "bg-red-500" : "bg-gray-400"}`} style={{ width: `${task.progress_percentage}%` }}></div>
                                                  </div>
                                              </div>
                                              <p className="text-xs text-gray-500 mt-1">{task.assigned_users?.length ? `${task.assigned_users.length} assigned` : "Unassigned"}</p>
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
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Upcoming Deadlines</h4>
                            <p className="text-gray-600 dark:text-gray-400">All tasks are either completed or due beyond the next 30 days.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                        <BarChart3 size={20} />
                        <span>Schedule Overview</span>
                    </h4>
                    <button onClick={() => router.push(`/projects/${projectId}/schedule`)} className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center space-x-1">
                        <span>View Detailed Schedule</span>
                        <ExternalLink size={14} />
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {Math.ceil((new Date(project.planned_end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Days</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">
                            {Math.max(0, Math.ceil((new Date().getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24)))}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Days Elapsed</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-orange-600">
                            {Math.max(0, Math.ceil((new Date(project.planned_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">{project.progress_percentage}%</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Complete</p>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Project Timeline</span>
                        <span>{new Date(project.start_date).toLocaleDateString()} - {new Date(project.planned_end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-3">
                        <div className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300" style={{ width: `${project.progress_percentage}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
