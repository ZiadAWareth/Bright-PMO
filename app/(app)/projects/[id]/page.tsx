"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/form-shell";
import {
    humanize,
    priorityTone,
    projectStatusTone,
} from "@/lib/status-tone";
import {
    ArrowLeft, Edit, Users, Calendar, DollarSign, AlertTriangle, FileText,
    BarChart3, Target, Shield, CheckCircle, Clock, TrendingUp, Archive, Trash2,
    UserPlus, Upload, Download, MessageSquare, Eye, RefreshCw, ExternalLink,
    MapPin, Building, Activity, FolderTree, Plus, X, CheckCircleIcon, Calculator,
    MoreHorizontal,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { TeamUserSelect } from "@/components/TeamUserSelect";
import { ApprovalWorkflowModal } from "@/components/ApprovalWorkflowModal";
import { BudgetChangeApprovalModal } from "@/components/BudgetChangeApprovalModal";
import { useProjectData } from "./_hooks/useProjectData";
import { getRoleSpecificTabs, getRoleSpecificActions, formatCurrency, formatDate, getStatusBadge, getPriorityBadge, formatFileSize, getFileIcon, getProgressColors, getBudgetColors, getHealthColors, getRiskColors } from "./_components/constants";
import { BOMResource } from "./_components/types";

import MyTasksSection from "./_components/MyTasksSection";
import ProcurementAccessSection from "./_components/ProcurementAccessSection";
import OverviewSection from "./_components/OverviewSection";
import TasksSection from "./_components/TasksSection";
import WBSSection from "./_components/WBSSection";
import GanttSection from "./_components/GanttSection";
import TeamSection from "./_components/TeamSection";
import BudgetSection from "./_components/BudgetSection";
import ScheduleSection from "./_components/ScheduleSection";
import RisksSection from "./_components/RisksSection";
import ProcurementDetailSection from "./_components/ProcurementDetailSection";
import DocumentsSection from "./_components/DocumentsSection";
import CriticalPathSection from "./_components/CriticalPathSection";
import ClosureSection from "./_components/ClosureSection";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/ui/person-cell";
import { Dropdown } from "@/components/ui/dropdown";
import { TabRow } from "@/components/ui/tab-row";

const ProjectDetailsPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const d = useProjectData(params);

    if (d.loading || !d.activeView) {
        return (
            <ProtectedRoute>
                <DashboardLayout title="Project Details" onViewChange={d.setActiveView} activeView={d.activeView || "overview"}>
                    <div className="flex items-center justify-center min-h-96">
                        <Spinner size={48} className="text-bright-primary" />
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    if (!d.project) {
        return (
            <ProtectedRoute>
                <DashboardLayout title="Project Details" onViewChange={d.setActiveView} activeView={d.activeView}>
                    <div className="text-center py-12">
                        <h3 className="text-lg font-medium text-ink mb-2">Project not found</h3>
                        <p className="text-muted mb-4">The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
                        <button onClick={() => d.router.back()} className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">Go Back</button>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    const project = d.project;
    const roleSpecificTabs = getRoleSpecificTabs(d.activeView);
    const roleSpecificActions = getRoleSpecificActions(d.activeView);

    const budgetVariance = project.budget_amount - project.actual_cost;
    const totalRiskScore = d.risks.reduce((sum, r) => sum + (r.riskScore || 0), 0);
    const riskScorePercent = d.risks.length > 0 ? Math.round((totalRiskScore / (d.risks.length * 10)) * 100) : 0;
    const budgetUtilization = (project.actual_cost / project.budget_amount) * 100;
    const progressColors = getProgressColors(project.progress_percentage || 0);
    const budgetColors = getBudgetColors(budgetUtilization);
    const healthColors = getHealthColors(project.healthScore || 0);
    const riskColors = getRiskColors(riskScorePercent);

    return (
        <ProtectedRoute>
            <DashboardLayout
                title={project.name}
                subtitle={project.description}
                backHref="/projects"
                backLabel="Back to Projects"
                actions={
                    <>
                        <StatusBadge
                            label={humanize(project.status)}
                            tone={projectStatusTone(project.status)}
                        />
                        <StatusBadge
                            label={humanize(project.priority)}
                            tone={priorityTone(project.priority)}
                        />
                    </>
                }
                meta={
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="inline-flex items-center gap-1.5"><Building size={14} aria-hidden="true" />{project.portfolio.name}</span>
                        <span className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />{project.location}</span>
                        <span className="inline-flex items-center gap-1.5"><Users size={14} aria-hidden="true" />{project.team_members.length} members</span>
                        <span className="inline-flex items-center gap-1.5"><Calendar size={14} aria-hidden="true" />{new Date(project.start_date).toLocaleDateString()} – {new Date(project.planned_end_date).toLocaleDateString()}</span>
                    </div>
                }
                onViewChange={d.setActiveView}
                activeView={d.activeView}
            >
                <div className="mb-6">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-6">
                        <div className="flex flex-col bg-surface-2 rounded-lg p-3 min-w-0 flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-ink-3">Progress</span>
                                <span className={`text-base font-bold ${progressColors.text}`}>{project.progress_percentage}%</span>
                            </div>
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-1.5">
                                <div className={`${progressColors.bg} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${project.progress_percentage}%` }}></div>
                            </div>
                        </div>
                        <div className="flex flex-col bg-surface-2 rounded-lg p-3 min-w-0 flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-ink-3">Budget</span>
                                <span className={`text-base font-bold ${budgetColors.text}`}>{formatCurrency(project.budget_amount)}</span>
                            </div>
                            {d.activeBudgetApproval.length > 0 ? (
                                <button type="button" onClick={() => d.setShowBudgetWorkflowModal(true)} className="w-full flex items-center justify-center gap-1.5 mb-1.5 px-2 py-1 text-xs font-medium text-bright-deep bg-bright-soft border border-bright rounded-md hover:bg-bright-soft transition-colors">
                                    <Clock size={11} />Pending budget change — view workflow
                                </button>
                            ) : (
                                (["admin", "project-manager", "fin"].includes(d.activeView ?? "") || d.currentUserId === project.created_by) && (
                                    <button type="button" onClick={() => d.setShowBudgetChangeModal(true)} className="w-full flex items-center justify-center gap-1.5 mb-1.5 px-2 py-1 text-xs font-medium text-info bg-info-soft border border-info rounded-md hover:bg-info-soft transition-colors">
                                        <Edit size={11} />Request budget adjustment
                                    </button>
                                )
                            )}
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-1.5">
                                <div className={`${budgetColors.bg} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${Math.min(budgetUtilization, 100)}%` }}></div>
                            </div>
                            {(project as any).pending_budget_amount != null && (
                                <p className="text-xs text-bright mt-1">Proposed: {formatCurrency((project as any).pending_budget_amount)}</p>
                            )}
                        </div>
                        <div className="flex flex-col bg-surface-2 rounded-lg p-3 min-w-0 flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-ink-3">Budget Variance</span>
                                <span className={`text-base font-bold ${budgetVariance < 0 ? "text-danger" : "text-success"}`}>{formatCurrency(budgetVariance)}</span>
                            </div>
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-1.5">
                                <div className={`${budgetVariance < 0 ? "bg-danger" : "bg-success"} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${Math.min((Math.abs(budgetVariance) / project.budget_amount) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="flex flex-col bg-surface-2 rounded-lg p-3 min-w-0 flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-ink-3">Health Score</span>
                                <span className={`text-base font-bold ${healthColors.text}`}>{project.healthScore}%</span>
                            </div>
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-1.5">
                                <div className={`${healthColors.bg} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${project.healthScore}%` }}></div>
                            </div>
                        </div>
                        <div className="flex flex-col bg-surface-2 rounded-lg p-3 min-w-0 flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-ink-3">Risk Score</span>
                                <span className={`text-base font-bold ${riskColors.text}`}>{riskScorePercent}%</span>
                            </div>
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-1.5">
                                <div className={`${riskColors.bg} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${riskScorePercent}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-line">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted">Managed by <span className="font-medium text-ink">{project.manager ? `${project.manager.account.first_name} ${project.manager.account.last_name}` : "No manager assigned"}</span></span>
                            {d.activeView === "admin" && (
                                <span className="text-sm text-muted">{`Created by ${project.creator.account.first_name} ${project.creator.account.last_name}`} on {new Date(project.created_at).toLocaleDateString()}</span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            {/* Only the primary action stays a visible button; everything
                                else (Archive, Delete, etc.) lives behind the overflow menu
                                so this row doesn't grow with every role's action list. */}
                            {roleSpecificActions[0] && (
                                <button onClick={() => d.handleActionClick(roleSpecificActions[0].action)} className={`group flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${roleSpecificActions[0].variant === "primary" ? "bg-bright text-white hover:bg-bright-deep focus:ring-bright" : roleSpecificActions[0].variant === "danger" ? "bg-danger text-white hover:opacity-90 focus:ring-danger" : "border border-line text-ink-3 hover:bg-surface-2 hover:border-line  focus:ring-line"}`}>
                                    <span>{roleSpecificActions[0].icon}</span>
                                    <span>{roleSpecificActions[0].label}</span>
                                </button>
                            )}
                            {roleSpecificActions.length > 1 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            aria-label="More project actions"
                                            className="flex items-center justify-center h-[38px] w-[38px] rounded-lg border border-line text-ink-3 hover:bg-surface-2 hover:border-line transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line"
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {roleSpecificActions.slice(1).map((action, index) => (
                                            <DropdownMenuItem
                                                key={index}
                                                onClick={() => d.handleActionClick(action.action)}
                                                variant={action.variant === "danger" ? "destructive" : "default"}
                                            >
                                                {action.icon}
                                                <span>{action.label}</span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </div>

                {/* Approval Status */}
                {project.status === "pending_approval" && d.projectApprovals.length > 0 && (
                    <div className="bg-surface border border-line rounded-xl p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-ink flex items-center"><CheckCircle size={20} className="mr-2 text-bright" />Project Approval Status</h2>
                            <div className="flex items-center space-x-3">
                                <button type="button" onClick={() => d.setShowApprovalModal(true)} className="flex items-center gap-2 px-4 py-2 bg-info text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors"><MessageSquare size={16} />View approval workflow</button>
                                {(() => {
                                    const submissionDate = new Date(project.updated_at);
                                    const daysSinceSubmission = Math.floor((new Date().getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
                                    const isOverdue = daysSinceSubmission > 7;
                                    return (<>
                                        <div className="text-sm text-muted">
                                            <div className="flex items-center space-x-1"><Clock size={14} /><span>Submitted: {submissionDate.toLocaleDateString()}</span></div>
                                            {isOverdue && <div className="flex items-center space-x-1 text-danger mt-1"><AlertTriangle size={14} /><span className="font-medium">Overdue ({daysSinceSubmission} days)</span></div>}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isOverdue ? "bg-danger-soft text-danger  " : "bg-bright-soft text-bright  "}`}>{isOverdue ? "Overdue" : "Pending Approval"}</span>
                                    </>);
                                })()}
                            </div>
                        </div>
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-ink-3">Approval Progress</span>
                                <span className="text-sm text-muted">{d.projectApprovals.filter((a) => a.status !== "PENDING").length} of {d.projectApprovals.length} approved</span>
                            </div>
                            <div className="w-full bg-surface-3 rounded-full h-2">
                                <div className="bg-bright h-2 rounded-full transition-all duration-300" style={{ width: `${(d.projectApprovals.filter((a) => a.status !== "PENDING").length / d.projectApprovals.length) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {d.projectApprovals.map((approval) => (
                                <div key={approval.id} className={`p-4 rounded-lg border ${approval.status === "APPROVED" ? "bg-success-soft border-success  " : approval.status === "REJECTED" ? "bg-danger-soft border-danger  " : "bg-surface-2 border-line  "}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-ink-3">{approval.user.role?.name || `${approval.user.account?.first_name || ""} ${approval.user.account?.last_name || ""}`.trim() || "Unknown User"}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${approval.status === "APPROVED" ? "bg-success-soft text-success  " : approval.status === "REJECTED" ? "bg-danger-soft text-danger  " : "bg-surface-2 text-ink-2  "}`}>{approval.status}</span>
                                    </div>
                                    <div className="text-sm text-muted">{approval.user.account.first_name} {approval.user.account.last_name}</div>
                                    <div className="text-xs text-faint">{approval.user.email}</div>
                                </div>
                            ))}
                        </div>
                        {d.userApproval && d.userApproval.status === "PENDING" && (
                            <div className="border-t border-line pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-ink">Your Approval Required</h3>
                                        <p className="text-sm text-muted">As <span className="font-medium">{d.userApproval.user.role?.name || `${d.userApproval.user.account?.first_name || ""} ${d.userApproval.user.account?.last_name || ""}`.trim() || "a reviewer"}</span>, please review and approve or reject this project.</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={d.handleRejectProject} disabled={d.isUpdatingApproval} className="flex items-center space-x-2 px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                            {d.isUpdatingApproval ? <Spinner size={16} /> : <X size={16} />}<span>Reject</span>
                                        </button>
                                        <button onClick={d.handleApproveProject} disabled={d.isUpdatingApproval} className="flex items-center space-x-2 px-4 py-2 bg-success text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                            {d.isUpdatingApproval ? <Spinner size={16} /> : <CheckCircle size={16} />}<span>Approve</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {d.userApproval && d.userApproval.status !== "PENDING" && (
                            <div className="border-t border-line pt-4">
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-muted">Your decision:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${d.userApproval.status === "APPROVED" ? "bg-success-soft text-success  " : "bg-danger-soft text-danger  "}`}>{d.userApproval.status}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Budget Overrun Alert */}
                {project.actual_cost > project.budget_amount && (
                    <div className="flex items-center bg-danger-soft border border-danger text-danger rounded-lg p-4 mb-4">
                        <AlertTriangle className="w-5 h-5 mr-3 text-danger" /><span className="font-semibold">Budget Overrun:</span><span className="ml-2">Project spending has exceeded the total budget.</span>
                    </div>
                )}

                <TabRow tabs={roleSpecificTabs} value={d.activeTab} onChange={d.setActiveTab} dense />

                {/* Tab Content */}
                <div className="space-y-6">
                    {d.activeTab === "my-tasks" && <MyTasksSection project={project} projectId={d.projectId} router={d.router} currentUserId={d.currentUserId} handleOpenProgressModal={d.handleOpenProgressModal} />}
                    {d.activeTab === "procurement" && !["admin", "project-manager", "pmo", "procurement"].includes(d.activeView) && <ProcurementAccessSection activeView={d.activeView} router={d.router} projectId={d.projectId} procurements={d.procurements} />}
                    {d.activeTab === "overview" && <OverviewSection project={project} projectId={d.projectId} router={d.router} activeView={d.activeView} handleHealthScoreUpdate={d.handleHealthScoreUpdate} />}
                    {d.activeTab === "tasks" && <TasksSection project={project} projectId={d.projectId} router={d.router} />}
                    {d.activeTab === "wbs" && <WBSSection project={project} projectId={d.projectId} router={d.router} />}
                    {d.activeTab === "gantt" && <GanttSection project={project} projectId={d.projectId} router={d.router} userTasks={d.userTasks} />}
                    {d.activeTab === "team" && <TeamSection project={project} projectId={d.projectId} router={d.router} />}
                    {d.activeTab === "budget" && <BudgetSection project={project} projectId={d.projectId} router={d.router} />}
                    {d.activeTab === "schedule" && <ScheduleSection project={project} projectId={d.projectId} router={d.router} />}
                    {d.activeTab === "risks" && <RisksSection risks={d.risks} projectId={d.projectId} router={d.router} />}
                    {d.activeTab === "procurement" && ["admin", "project-manager", "pmo", "procurement"].includes(d.activeView) && <ProcurementDetailSection projectId={d.projectId} procurements={d.procurements} setProcurements={d.setProcurements} />}
                    {d.activeTab === "documents" && <DocumentsSection project={project} activeView={d.activeView} setShowExportModal={d.setShowExportModal} handleFileSelect={d.handleFileSelect} handleDownloadDocument={d.handleDownloadDocument} handleViewDocument={d.handleViewDocument} handleDeleteDocument={d.handleDeleteDocument} />}
                    {d.activeTab === "critical-path" && <CriticalPathSection project={project} projectId={d.projectId} router={d.router} />}
                    {d.activeTab === "closure" && <ClosureSection project={project} projectId={d.projectId} router={d.router} />}

                    {!["overview", "my-tasks", "tasks", "team", "wbs", "gantt", "documents", "schedule", "budget", "risks", "procurement", "closure", "critical-path"].includes(d.activeTab) && (
                        <div className="bg-surface border border-line rounded-xl p-6">
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-bright-soft rounded-full flex items-center justify-center mx-auto mb-4"><Target size={32} className="text-bright" /></div>
                                <h3 className="text-lg font-medium text-ink mb-2">{roleSpecificTabs.find((tab) => tab.id === d.activeTab)?.label} Content</h3>
                                <p className="text-muted">Content for the &quot;{roleSpecificTabs.find((tab) => tab.id === d.activeTab)?.label}&quot; tab will be implemented here.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {d.showDeleteConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => d.setShowDeleteConfirmation(false)}>
                        <div className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"  onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-danger-soft rounded-full flex items-center justify-center mr-4"><AlertTriangle className="w-6 h-6 text-danger" /></div>
                                <div><h3 className="text-lg font-semibold text-ink">Delete Project</h3><p className="text-sm text-muted">This action cannot be undone</p></div>
                            </div>
                            <p className="text-ink-3 mb-6">Are you sure you want to delete <strong>&quot;{project?.name}&quot;</strong>? This will permanently delete the project and all associated data.</p>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => d.setShowDeleteConfirmation(false)} disabled={d.isDeleting} className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50">Cancel</button>
                                <button onClick={d.handleDeleteProject} disabled={d.isDeleting} className="px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2">
                                    {d.isDeleting && <Spinner size={16} />}<span>{d.isDeleting ? "Deleting..." : "Delete Project"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Archive Confirmation Modal */}
                {d.showArchiveConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => d.setShowArchiveConfirmation(false)}>
                        <div className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"  onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-bright-soft rounded-full flex items-center justify-center mr-4"><Archive className="w-6 h-6 text-bright" /></div>
                                <div><h3 className="text-lg font-semibold text-ink">Archive Project</h3><p className="text-sm text-muted">This will move the project to archive</p></div>
                            </div>
                            <p className="text-ink-3 mb-6">Are you sure you want to archive <strong>&quot;{project?.name}&quot;</strong>? This will move the project to the archived projects section. You can unarchive it later if needed.</p>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => d.setShowArchiveConfirmation(false)} disabled={d.isArchiving} className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50">Cancel</button>
                                <button onClick={d.handleArchiveProject} disabled={d.isArchiving} className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 flex items-center space-x-2">
                                    {d.isArchiving && <Spinner size={16} />}<Archive size={16} /><span>{d.isArchiving ? "Archiving..." : "Archive Project"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Change Manager Modal */}
                {d.showChangeManagerModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => d.setShowChangeManagerModal(false)}>
                        <div className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"  onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">Change Project Manager</h3>
                                <button onClick={() => d.setShowChangeManagerModal(false)} className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2">×</button>
                            </div>
                            <div className="mb-6">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-ink-3 mb-1">Current Manager</label>
                                    <div className="w-full flex items-center justify-between px-4 py-3 border border-line rounded-xl bg-surface-2">
                                        {project?.manager ? (
                                            <div className="flex items-center gap-3">
                                                <UserAvatar name={`${project.manager.account.first_name} ${project.manager.account.last_name}`} className="h-8 w-8 text-sm" />
                                                <div className="text-left">
                                                    <div className="font-medium text-ink">{project.manager.account.first_name} {project.manager.account.last_name}</div>
                                                    <div className="text-xs text-muted">{project.manager.email}</div>
                                                    {project.manager.role?.name && <div className="text-xs text-bright font-semibold mt-0.5">{project.manager.role.name}</div>}
                                                </div>
                                            </div>
                                        ) : <span className="text-faint">No manager assigned</span>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-2">Select New Manager</label>
                                    <TeamUserSelect users={d.availableManagers} value={d.selectedManagerId} onChange={d.setSelectedManagerId} placeholder="Select a new manager..." />
                                    {d.availableManagers.length === 0 && <p className="text-sm text-muted mt-1">No available PJM users to assign as manager</p>}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => { d.setShowChangeManagerModal(false); d.setSelectedManagerId(""); }} disabled={d.isChangingManager} className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50">Cancel</button>
                                <button onClick={d.handleChangeManager} disabled={d.isChangingManager || !d.selectedManagerId} className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2">
                                    {d.isChangingManager && <Spinner size={16} />}<UserPlus size={16} /><span>{d.isChangingManager ? "Changing..." : "Change Manager"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Assign to Task Modal */}
                {d.showAssignTaskModal && project && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => { d.setShowAssignTaskModal(false); d.setSelectedTeamMember(null); d.setAssignFormData({ user_id: "", task_id: "" }); }}>
                        <div className="rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl glass-panel"  onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">Assign Team Member to Task</h3>
                                <button onClick={() => { d.setShowAssignTaskModal(false); d.setSelectedTeamMember(null); d.setAssignFormData({ user_id: "", task_id: "" }); }} className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2">×</button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); d.handleAssignToTask(d.assignFormData); }} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-ink-3 mb-1">Select Team Member</label>
                                        <Dropdown
                                          value={String(d.assignFormData.user_id ?? '')}
                                          onChange={(__v: string) => d.setAssignFormData((prev) => ({ ...prev, user_id: __v }))}
                                          options={[
                                          { value: String(""), label: "Choose a team member..." },
                                          ...project.team_members.map((member) => ({ value: String(member.user.user_id), label: `${`${member.user.account.first_name} ${member.user.account.last_name}`} (${member.user.role.name})` })),
                                        ]}
                                          name="user_id"
                                          disabled={!!d.selectedTeamMember}
                                          required={true}
                                        />
                                        {d.selectedTeamMember && <p className="text-sm text-muted mt-1">Team member pre-selected from the team section</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-ink-3 mb-1">Select Task</label>
                                        <select name="task_id" required value={d.assignFormData.task_id} onChange={(e) => d.setAssignFormData((prev) => ({ ...prev, task_id: e.target.value }))} className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent">
                                            <option value="">Choose a task...</option>
                                            {project.tasks && project.tasks.length > 0 ? project.tasks.map((task) => <option key={task.task_id} value={task.task_id}>{task.name} ({task.status}) - Due: {new Date(task.end_date).toLocaleDateString()}</option>) : <option disabled>No tasks available</option>}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button type="button" onClick={() => { d.setShowAssignTaskModal(false); d.setSelectedTeamMember(null); d.setAssignFormData({ user_id: "", task_id: "" }); }} className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">Assign to Task</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Document Confirmation Modal */}
                {d.showDeleteDocumentModal && d.documentToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => d.setShowDeleteDocumentModal(false)}>
                        <div className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"  onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-danger-soft rounded-full flex items-center justify-center mr-4"><Trash2 className="w-6 h-6 text-danger" /></div>
                                <div><h3 className="text-lg font-semibold text-ink">Delete Document</h3><p className="text-sm text-muted">This action cannot be undone</p></div>
                            </div>
                            <div className="mb-6">
                                <p className="text-ink-3 mb-3">Are you sure you want to delete this document?</p>
                                <div className="bg-surface-2 rounded-lg p-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center">{getFileIcon(d.documentToDelete.name)}</div>
                                        <div>
                                            <p className="font-medium text-ink">{d.documentToDelete.name}</p>
                                            <p className="text-sm text-muted">{formatFileSize(d.documentToDelete.size || 0)} • Uploaded {new Date(d.documentToDelete.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => { d.setShowDeleteDocumentModal(false); }} className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
                                <button onClick={d.confirmDeleteDocument} className="px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 transition-colors flex items-center space-x-2"><Trash2 size={16} /><span>Delete Document</span></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Export All Documents Modal */}
                {d.showExportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => d.setShowExportModal(false)}>
                        <div className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"  onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-info-soft rounded-full flex items-center justify-center mr-4"><Download className="w-6 h-6 text-info" /></div>
                                <div><h3 className="text-lg font-semibold text-ink">Export All Documents</h3><p className="text-sm text-muted">Download all project documents</p></div>
                            </div>
                            <div className="mb-6">
                                <p className="text-ink-3 mb-3">Are you sure you want to download all documents from this project?</p>
                                <div className="bg-surface-2 rounded-lg p-3">
                                    <div className="flex items-center justify-between text-sm"><span className="text-muted">Total documents:</span><span className="font-medium text-ink">{(project as any).documents?.length || 0}</span></div>
                                    <div className="flex items-center justify-between text-sm mt-1"><span className="text-muted">Total size:</span><span className="font-medium text-ink">{formatFileSize(((project as any).documents || []).reduce((total: number, doc: any) => total + (doc.size || 0), 0))}</span></div>
                                </div>
                                <p className="text-xs text-muted mt-2">Files will be downloaded individually to your default download folder.</p>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => d.setShowExportModal(false)} disabled={d.isExporting} className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50">Cancel</button>
                                <button onClick={d.handleExportAllDocuments} disabled={d.isExporting} className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2">
                                    {d.isExporting && <Spinner size={16} />}<Download size={16} /><span>{d.isExporting ? "Exporting..." : "Export All Documents"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Update Modal */}
                {d.showProgressModal && d.progressUpdateTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => d.setShowProgressModal(false)}>
                        <div className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"  onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-info-soft rounded-full flex items-center justify-center mr-4"><RefreshCw className="w-6 h-6 text-info" /></div>
                                <div><h3 className="text-lg font-semibold text-ink">Update {d.progressUpdateTarget.type === "project" ? "Project" : "Task"} Progress</h3><p className="text-sm text-muted">{d.progressUpdateTarget.name}</p></div>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const data = Object.fromEntries(formData.entries()); d.handleUpdateProgress(data); }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">Progress Percentage</label>
                                    <div className="relative">
                                        <input name="progress_percentage" type="number" min="0" max="100" defaultValue={d.progressUpdateTarget.type === "project" ? project?.progress_percentage : project?.tasks?.find((t) => t.task_id === d.progressUpdateTarget!.id)?.progress_percentage} required className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent pr-8" />
                                        <span className="absolute right-3 top-2 text-sm text-muted">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">Status</label>
                                    {d.progressUpdateTarget.type === "project" && d.activeView === "technical" ? (
                                        <div className="w-full px-3 py-2 border border-line rounded-lg bg-surface-2 text-muted">
                                            {project?.status?.replace("_", " ").toUpperCase()}
                                            <input name="status" type="hidden" value={project?.status || ""} />
                                        </div>
                                    ) : (
                                        <select name="status" required defaultValue={d.progressUpdateTarget.type === "project" ? project?.status : project?.tasks?.find((t) => t.task_id === d.progressUpdateTarget!.id)?.status} className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent">
                                            {d.progressUpdateTarget.type === "project" ? (<><option value="planning">Planning</option><option value="execution">Execution</option><option value="completed">Completed</option><option value="on_hold">On Hold</option><option value="at_risk">At Risk</option><option value="delayed">Delayed</option></>) : (<><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="on_hold">On Hold</option></>)}
                                        </select>
                                    )}
                                    {d.progressUpdateTarget.type === "project" && d.activeView === "technical" && <p className="text-xs text-muted mt-1">Only project managers and admins can change project status</p>}
                                </div>
                                {d.progressUpdateTarget.type === "task" && (
                                    <div>
                                        <label className="block text-sm font-medium text-ink-3 mb-1">Actual Hours (Optional)</label>
                                        <input name="actual_hours" type="number" step="0.5" min="0" defaultValue={project?.tasks?.find((t) => t.task_id === d.progressUpdateTarget!.id)?.actual_hours} className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent" />
                                    </div>
                                )}
                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button type="button" onClick={() => { d.setShowProgressModal(false); }} disabled={d.isUpdatingProgress} className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50">Cancel</button>
                                    <button type="submit" disabled={d.isUpdatingProgress} className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2">
                                        {d.isUpdatingProgress && <Spinner size={16} />}<RefreshCw size={16} /><span>{d.isUpdatingProgress ? "Updating..." : "Update Progress"}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Upload Document Modal */}
                {d.showUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => d.setShowUploadModal(false)}>
                        <div className="rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl glass-panel"  onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">Upload Document</h3>
                                <button onClick={() => d.setShowUploadModal(false)} className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2">×</button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-2">Selected Files ({d.uploadFiles.length})</label>
                                    <div className="space-y-2">
                                        {d.uploadFiles.map((file, index) => (
                                            <div key={index} className="flex items-center space-x-3 p-3 bg-surface-2 rounded-lg">
                                                <div className="w-8 h-8 bg-info-soft rounded-lg flex items-center justify-center">{getFileIcon(file.name)}</div>
                                                <div className="flex-1"><p className="text-sm font-medium text-ink">{file.name}</p><p className="text-xs text-muted">{formatFileSize(file.size)}</p></div>
                                                <button onClick={() => d.setUploadFiles(d.uploadFiles.filter((_, i) => i !== index))} className="p-1 text-faint hover:text-danger transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-2">Upload Location</label>
                                    <Dropdown
                                      value={String(d.uploadLocation.type ?? '')}
                                      onChange={(__v: string) => d.setUploadLocation({ type: __v as "project" | "wbs" | "task", id: __v === "project" ? undefined : "" })}
                                      options={[
                                      { value: String("project"), label: "Project Level" },
                                      { value: String("wbs"), label: "WBS Level" },
                                      { value: String("task"), label: "Task Level" },
                                    ]}
                                    />
                                </div>
                                {d.uploadLocation.type === "wbs" && (
                                    <div>
                                        <label className="block text-sm font-medium text-ink-3 mb-2">Select WBS</label>
                                        <Dropdown
                                          value={String(d.uploadLocation.id || "")}
                                          onChange={(__v: string) => d.setUploadLocation({ ...d.uploadLocation, id: __v })}
                                          options={[
                                          { value: String(""), label: "Select a WBS..." },
                                          ...(project?.wbs?.map((wbs) => ({ value: String(wbs.wbs_id), label: `${wbs.wbs_code} - ${wbs.name}` })) ?? []),
                                        ]}
                                        />
                                    </div>
                                )}
                                {d.uploadLocation.type === "task" && (
                                    <div>
                                        <label className="block text-sm font-medium text-ink-3 mb-2">Select Task</label>
                                        <Dropdown
                                          value={String(d.uploadLocation.id || "")}
                                          onChange={(__v: string) => d.setUploadLocation({ ...d.uploadLocation, id: __v })}
                                          options={[
                                          { value: String(""), label: "Select a task..." },
                                          ...(project?.tasks?.map((task) => ({ value: String(task.task_id), label: `${task.name} (${task.status})` })) ?? []),
                                        ]}
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-2">Description (Optional)</label>
                                    <textarea value={d.uploadDescription} onChange={(e) => d.setUploadDescription(e.target.value)} placeholder="Add a description for these documents..." rows={3} className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent resize-none" />
                                </div>
                                <div className="bg-info-soft border border-info rounded-lg p-4">
                                    <div className="flex items-start space-x-3">
                                        <FileText className="w-5 h-5 text-info mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-medium text-info mb-1">Upload Information</p>
                                            <p className="text-info">
                                                {d.uploadLocation.type === "project" && "Documents will be uploaded to the project level and visible to all team members."}
                                                {d.uploadLocation.type === "wbs" && "Documents will be associated with the selected WBS and relevant team members."}
                                                {d.uploadLocation.type === "task" && "Documents will be uploaded as task deliverables and linked to the specific task."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-6 border-t border-line mt-6">
                                <button onClick={() => d.setShowUploadModal(false)} className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
                                <button onClick={d.handleUploadModalSubmit} disabled={d.uploadFiles.length === 0 || (d.uploadLocation.type !== "project" && !d.uploadLocation.id)} className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Upload {d.uploadFiles.length} File{d.uploadFiles.length !== 1 ? "s" : ""}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* BOM Modal */}
                {d.showBOMModal && d.bomData && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                    >
                        <div className="bg-surface rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                            <div className="flex items-center justify-between p-6 border-b border-line">
                                <div>
                                    <h2 className="text-2xl font-bold text-ink">
                                        Bill of Materials (BOM)
                                    </h2>
                                    <p className="text-sm text-muted mt-1">
                                        Generated on{" "}
                                        {d.bomData.generated_date
                                            ? new Date(d.bomData.generated_date).toLocaleDateString()
                                            : "N/A"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => d.setShowBOMModal(false)}
                                    className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div className="mb-6 p-4 bg-surface-2 rounded-lg">
                                    <h3 className="font-semibold text-ink mb-2">Project Information</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><span className="text-muted">Project:</span><span className="ml-2 font-medium">{project?.name}</span></div>
                                        <div><span className="text-muted">Code:</span><span className="ml-2 font-medium">{project?.project_code}</span></div>
                                        <div><span className="text-muted">Status:</span><span className="ml-2 font-medium capitalize">{project?.status}</span></div>
                                        <div><span className="text-muted">Period:</span><span className="ml-2 font-medium">{project?.start_date ? new Date(project.start_date).toLocaleDateString() : "N/A"} - {project?.planned_end_date ? new Date(project.planned_end_date).toLocaleDateString() : "N/A"}</span></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-info-soft p-4 rounded-lg"><h4 className="text-sm font-medium text-info">Labor</h4><p className="text-xl font-bold text-info">{formatCurrency(d.bomData.totals.labor_total)}</p><p className="text-sm text-info">{d.bomData.categories.labor.length} resources</p></div>
                                    <div className="bg-success-soft p-4 rounded-lg"><h4 className="text-sm font-medium text-success">Equipment</h4><p className="text-xl font-bold text-success">{formatCurrency(d.bomData.totals.equipment_total)}</p><p className="text-sm text-success">{d.bomData.categories.equipment.length} resources</p></div>
                                    <div className="bg-accent-violet-soft p-4 rounded-lg"><h4 className="text-sm font-medium text-accent-violet">Material</h4><p className="text-xl font-bold text-accent-violet">{formatCurrency(d.bomData.totals.material_total)}</p><p className="text-sm text-accent-violet">{d.bomData.categories.material.length} resources</p></div>
                                    <div className="bg-bright-soft p-4 rounded-lg"><h4 className="text-sm font-medium text-bright">Total</h4><p className="text-xl font-bold text-bright-deep">{formatCurrency(d.bomData.totals.grand_total)}</p><p className="text-sm text-bright">{d.bomData.summary.total_resources} total resources</p></div>
                                </div>
                                {Object.entries(d.bomData.categories).map(([category, resources]) => resources.length > 0 && (
                                    <div key={category} className="mb-6">
                                        <h3 className="text-lg font-semibold text-ink mb-3 capitalize">{category} Resources</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border border-line rounded-lg">
                                                <thead className="bg-surface-2">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Name</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Type</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Rate</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">{category === "labor" ? "Hours" : category === "equipment" ? "Days" : "Quantity"}</th>
                                                        {category === "material" && <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Unit</th>}
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Total Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-surface divide-y divide-line">
                                                    {resources.map((resource: BOMResource, index: number) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-3 text-sm font-medium text-ink">{resource.name}{resource.role && <div className="text-xs text-muted">{resource.role}</div>}</td>
                                                            <td className="px-4 py-3 text-sm text-ink capitalize">{resource.type}</td>
                                                            <td className="px-4 py-3 text-sm text-ink">{formatCurrency(resource.rate)}{resource.unit && <span className="text-muted">/{resource.unit}</span>}</td>
                                                            <td className="px-4 py-3 text-sm text-ink">{category === "labor" ? resource.hours_worked : category === "equipment" ? resource.days_used : resource.quantity_used}</td>
                                                            {category === "material" && <td className="px-4 py-3 text-sm text-ink">{resource.unit ?? "—"}</td>}
                                                            <td className="px-4 py-3 text-sm font-semibold text-ink">{formatCurrency(resource.total_cost)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-6 p-4 bg-surface-2 rounded-lg">
                                    <h3 className="font-semibold text-ink mb-3">Project Summary</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div><span className="text-muted">Budget Utilization:</span><span className="ml-2 font-medium">{d.bomData.summary.budget_utilization.toFixed(1)}%</span></div>
                                        <div><span className="text-muted">Cost Variance:</span><span className={`ml-2 font-medium ${d.bomData.summary.cost_variance >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(d.bomData.summary.cost_variance)}</span></div>
                                        <div><span className="text-muted">Total Resources:</span><span className="ml-2 font-medium">{d.bomData.summary.total_resources}</span></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-6 border-t border-line">
                                <div className="text-sm text-muted">
                                    Generated on{" "}
                                    {d.bomData.generated_date
                                        ? new Date(d.bomData.generated_date).toLocaleString()
                                        : "N/A"}
                                </div>
                                <div className="flex space-x-3">
                                    <button onClick={() => d.setShowBOMModal(false)} className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Project Modal */}

                {/* Approval workflow modal */}
                {d.projectId && <ApprovalWorkflowModal isOpen={d.showApprovalModal} onClose={() => d.setShowApprovalModal(false)} projectId={d.projectId} projectName={project?.name ?? ""} projectCode={project?.project_code} currentUserId={d.currentUserId} requesterUserId={project?.created_by ?? null} onApprovalUpdated={d.refreshProjectAndApprovals} />}

                {/* Budget change workflow modal */}
                {d.projectId && <ApprovalWorkflowModal isOpen={d.showBudgetWorkflowModal} onClose={() => d.setShowBudgetWorkflowModal(false)} projectId={d.projectId} projectName={project?.name ?? ""} projectCode={project?.project_code} currentUserId={d.currentUserId} requesterUserId={project?.created_by ?? null} onApprovalUpdated={d.refreshProjectAndApprovals} approvalType="BUDGET_CHANGE" pendingBudgetAmount={(project as any)?.pending_budget_amount ?? null} currentBudgetAmount={project?.budget_amount ?? null} />}

                {/* Budget Change Request Modal */}
                {project && <BudgetChangeApprovalModal isOpen={d.showBudgetChangeModal} onClose={() => d.setShowBudgetChangeModal(false)} projectId={d.projectId} projectName={project.name} currentBudget={project.budget_amount} onSubmitted={d.refreshProjectAndApprovals} />}

                {/* Hidden file input */}
                <input id="upload-doc-input" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif" onChange={(e) => d.handleFileSelect(e.target.files, e.target)} className="hidden" />

                {/* Deletion overlay */}
                {d.isDeleting && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
                        <div className="bg-surface rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-line">
                            <div className="flex flex-col items-center space-y-4">
                                <Spinner size={56} className="text-bright-primary" />
                                <div className="text-center"><h3 className="text-lg font-semibold text-ink mb-2">Deleting Project</h3><p className="text-sm text-muted">Please wait while we delete the project and all associated data. This may take a moment...</p></div>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
};

export default ProjectDetailsPage;
