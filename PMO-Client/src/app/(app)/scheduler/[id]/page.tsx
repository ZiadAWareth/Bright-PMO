"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FormSection,
  InfoGrid,
  StatusBadge,
  EmptyState,
  RowAction,
  actionPrimary,
  actionSecondary,
} from "@/components/ui/form-shell";
import {
  feasibilityTone,
  humanize,
  priorityTone,
  scheduleStatusTone,
} from "@/lib/status-tone";
import {
  ArrowLeft,
  Plus,
  Download,
  Upload,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Copy,
  Users,
  Calendar,
  DollarSign,
  Clock,
  User,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  MoreHorizontal,
  Save,
  X,
  Loader2,
  Link,
  CheckSquare,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { notConnected } from "@/lib/not-connected";
import { TeamUserSelect } from '@/features/team/components/TeamUserSelect';
import { AddEntityModal } from '@/components/form/AddEntityModal';
import ResourceAssignmentModal from '@/features/waterfall/schedule/components/ResourceAssignmentModal';
import ScheduleResourceAssignmentModal from '@/features/scheduler/components/ScheduleResourceAssignmentModal';
import ScheduleTaskDependencyModal from '@/features/scheduler/components/ScheduleTaskDependencyModal';
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar, personName } from "@/components/ui/person-cell";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/ui/dropdown";
// import ScheduleApprovalModal from '@/components/ScheduleApprovalModal';

interface WBSItem {
  id: string;
  type: 'wbs' | 'task';
  title: string;
  description?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  children?: WBSItem[];
  expanded?: boolean;
  level: number;
  wbs_code: string;
  parent_wbs_id?: string;
  tasks?: any[]; // Added tasks property
}

interface ResourceAssignment {
  resource_id: string;
  name: string;
  role: string;
  allocation_percentage: number;
  skills: string[];
}

interface TeamMember {
  team_member_id: number;
  schedule_id: number;
  user_id: number;
  role: string;
  department: string;
  is_lead: boolean;
  workload: number;
  created_at: string;
  updated_at: string;
  user: {
    user_id: number;
    username: string;
    email: string;
    account: {
      first_name: string;
      last_name: string;
    };
    role: {
      name: string;
    };
  };
}

/** Dates arrive as ISO strings and are sometimes empty; never render "Invalid Date". */
function formatScheduleDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

interface Schedule {
  schedule_id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  priority: string;
  feasibility_score: number;
  estimated_budget: number;
  target_completion_date: string;
  notes: string;
  total_tasks: number;
  total_resources: number;
  total_wbs_items: number;
  created_at: string;
  updated_at: string;
}

interface ScheduleWBSItem {
  wbs_id: number;
  schedule_id: number;
  wbs_code: string;
  name: string;
  description?: string;
  parent_wbs_id?: number;
  level: number;
  start_date: string;
  end_date: string;
  budget_amount: number;
  progress_percentage: number;
  status: string;
  created_at: string;
  updated_at: string;
  children?: ScheduleWBSItem[];
}

// Utility: Build WBS tree from flat array
function buildWBSTree(items: WBSItem[]): WBSItem[] {
  const map = new Map<string, WBSItem>();
  const roots: WBSItem[] = [];

  // Initialize map and children arrays
  items.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  // Build tree
  items.forEach(item => {
    if (item.parent_wbs_id) {
      const parent = map.get(item.parent_wbs_id);
      if (parent) {
        parent.children!.push(map.get(item.id)!);
      }
    } else {
      roots.push(map.get(item.id)!);
    }
  });

  return roots;
}

function wbsLevelDotColor(level: number) {
  switch (level % 3) {
    case 0:
      return "bg-accent-violet";
    case 1:
      return "bg-info";
    default:
      return "bg-success";
  }
}

const ScheduleDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [wbsItems, setWbsItems] = useState<WBSItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WBSItem | null>(null);
  const [editingItem, setEditingItem] = useState<WBSItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'wbs' | 'task'>('wbs');
  const [showFilters, setShowFilters] = useState(false);
  const [showWBSModal, setShowWBSModal] = useState(false);
  const [creatingWBS, setCreatingWBS] = useState(false);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [showAddTeamMemberModal, setShowAddTeamMemberModal] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [availabilityStart, setAvailabilityStart] = useState<string>("");
  const [availabilityEnd, setAvailabilityEnd] = useState<string>("");
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserWorkload, setSelectedUserWorkload] = useState<number>(100);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'wbs' | 'task' | 'team-member'; name: string } | null>(null);
  // Add state for assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningTask, setAssigningTask] = useState<any>(null);
  const [selectedAssignUser, setSelectedAssignUser] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  // Add state for resource assignment modal
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceModalTask, setResourceModalTask] = useState<any>(null);
  const [availableResources, setAvailableResources] = useState<any[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);

  // Add state for task dependency modal
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [dependencyModalTask, setDependencyModalTask] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [readonly, setReadonly] = useState(false);
  const [userApproval, setUserApproval] = useState<any>(null);

  useEffect(() => {
    if (scheduleId) {
      fetchSchedule();
      fetchWBSData();
      fetchTeamMembers();
      fetchAllTasks();
    }
  }, [scheduleId]);

  const fetchSchedule = async () => {
    // notConnected: loads the schedule. Until then there is none, so the page
    // shows its empty state.
  };

  const fetchWBSData = async () => {
    // notConnected: loads the schedule's WBS items.
  };

  const fetchTeamMembers = async () => {
    // notConnected: loads the schedule's team members.
  };

  const fetchAllTasks = async () => {
    // notConnected: loads every task in the schedule.
  };

  const toggleExpanded = (itemId: string) => {
    setWbsItems(prev => updateItemExpanded(prev, itemId));
  };

  const updateItemExpanded = (items: WBSItem[], itemId: string): WBSItem[] => {
    return items.map(item => {
      if (item.id === itemId) {
        return { ...item, expanded: !item.expanded };
      }
      if (item.children) {
        return { ...item, children: updateItemExpanded(item.children, itemId) };
      }
      return item;
    });
  };

  const handleItemSelect = (item: WBSItem) => {
    setSelectedItem(item);
    setEditingItem(null);
  };

  const handleInlineEdit = (item: WBSItem, field: string, value: any) => {
    setEditingItem({ ...item, [field]: value });
  };



  const updateItemInTree = (items: WBSItem[], updatedItem: WBSItem): WBSItem[] => {
    return items.map(item => {
      if (item.id === updatedItem.id) {
        return updatedItem;
      }
      if (item.children) {
        return { ...item, children: updateItemInTree(item.children, updatedItem) };
      }
      return item;
    });
  };

  const handleBulkSelect = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const startEditing = (itemId: string, field: string, currentValue: any) => {
    setEditingField({ id: itemId, field });
    setEditValue(currentValue?.toString() || "");
  };

  const saveInlineEdit = async (item: WBSItem | any, field: string, value: string) => {
    setEditingField(null);
    notConnected("Saving the change");
  };

  const handleKeyPress = (e: React.KeyboardEvent, item: WBSItem, field: string) => {
    if (e.key === 'Enter') {
      saveInlineEdit(item, field, editValue);
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue("");
    }
  };

  const handleBlur = (item: WBSItem, field: string) => {
    saveInlineEdit(item, field, editValue);
  };

  const handleDeleteClick = (item: { id: string; type: 'wbs' | 'task' | 'team-member'; name: string }) => {
    setItemToDelete(item);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirmation(false);
    notConnected("Deleting");
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setItemToDelete(null);
    setDeletingItem(null);
  };

  const renderWBSItem = (item: WBSItem, visualLevel: number = 0) => {
    // Calculate visual indentation based on the item's actual level
    // Level 1 (root) = 0px indent, Level 2 = 24px, Level 3 = 48px, etc.
    const indentWidth = (item.level - 1) * 24; // 24px per level, starting from level 1
    const dotColor = wbsLevelDotColor(item.level);

    return (
      <div key={item.id} className={`${item.level > 1 ? 'mt-4' : 'mb-6'}`}>
        <div className="grid items-center gap-4 rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3" style={{ paddingLeft: `${indentWidth}px` }}>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
              <h3 className="truncate text-[14.5px] font-semibold text-ink">
                {item.title}
              </h3>
            </div>

            <div className="flex items-center gap-4">
              {/* Budget Information with Edit Functionality */}
              <div className="text-right">
                <div className="grid grid-cols-3 gap-6 text-xs">
                  {/* Budget - Clickable for editing */}
                  <div
                    className={`cursor-pointer hover:bg-surface-2 rounded px-2 py-1 transition-colors ${
                      editingField?.id === item.id && editingField?.field === 'budget' ? 'bg-bright-soft ring-1 ring-bright' : ''
                    }`}
                    onClick={!readonly ? () => startEditing(item.id, 'budget', item.budget) : undefined}
                  >
                    <div className="text-muted">Budget</div>
                    {editingField?.id === item.id && editingField?.field === 'budget' ? (
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] text-muted">OMR</span>
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, item, 'budget')}
                          onBlur={() => handleBlur(item, 'budget')}
                          className="w-20 px-1 py-0.5 text-xs border border-line rounded bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-bright [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          autoFocus
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <div className="font-semibold text-ink">OMR {(item.budget || 0).toLocaleString()}</div>
                    )}
                  </div>

                  {/* Start Date - Clickable for editing */}
                  <div
                    className={`cursor-pointer hover:bg-surface-2 rounded px-2 py-1 transition-colors ${
                      editingField?.id === item.id && editingField?.field === 'start_date' ? 'bg-bright-soft ring-1 ring-bright' : ''
                    }`}
                    onClick={!readonly ? () => startEditing(item.id, 'start_date', item.start_date) : undefined}
                  >
                    <div className="text-muted">Start</div>
                    {editingField?.id === item.id && editingField?.field === 'start_date' ? (
                      <input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, item, 'start_date')}
                        onBlur={() => handleBlur(item, 'start_date')}
                        className="w-28 px-1 py-0.5 text-xs border border-line rounded bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-bright"
                        autoFocus
                      />
                    ) : (
                      <div className="font-semibold text-ink">
                        {item.start_date ? new Date(item.start_date).toLocaleDateString() : '-'}
                      </div>
                    )}
                  </div>

                  {/* End Date - Clickable for editing */}
                  <div
                    className={`cursor-pointer hover:bg-surface-2 rounded px-2 py-1 transition-colors ${
                      editingField?.id === item.id && editingField?.field === 'end_date' ? 'bg-bright-soft ring-1 ring-bright' : ''
                    }`}
                    onClick={!readonly ? () => startEditing(item.id, 'end_date', item.end_date) : undefined}
                  >
                    <div className="text-muted">End</div>
                    {editingField?.id === item.id && editingField?.field === 'end_date' ? (
                      <input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, item, 'end_date')}
                        onBlur={() => handleBlur(item, 'end_date')}
                        className="w-28 px-1 py-0.5 text-xs border border-line rounded bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-bright"
                        autoFocus
                      />
                    ) : (
                      <div className="font-semibold text-ink">
                        {item.end_date ? new Date(item.end_date).toLocaleDateString() : '-'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={!readonly ? (e) => { e.stopPropagation(); handleDeleteClick({ id: item.id, type: 'wbs', name: item.title }); } : undefined}
                className={`p-1 rounded-full hover:bg-danger-soft hover:text-danger text-muted transition-colors${readonly ? ' opacity-50 cursor-not-allowed' : ''}`}
                title="Delete WBS"
                disabled={readonly}
              >
                <Trash2 size={16} />
              </button>

              {/* Expand/Collapse Button */}
              {(item.children && item.children.length > 0) || (item.tasks && item.tasks.length > 0) ? (
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="p-1 rounded-full hover:bg-surface-2 text-muted transition-colors"
                >
                  {item.expanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Render children if expanded */}
        {item.expanded && item.children && item.children.length > 0 && (
          <div className="mt-4">
            {item.children.map(child => renderWBSItem(child, visualLevel + 1))}
          </div>
        )}
        {/* Render tasks as cards */}
        {item.expanded && item.tasks && item.tasks.length > 0 && (
          <div className="mt-2">
            {item.tasks.map((task: any) => {
              // Get assigned user IDs
              const assignedUserIds = (task.assigned_users || []).map((au: any) => au.user_id || au.user?.user_id);
              // Filter team members not assigned to this task
              const availableMembers = teamMembers.filter(
                (member) => !assignedUserIds.includes(member.user_id)
              );
              return (
                <div
                  key={task.task_id}
                  className="mt-4"
                  style={{ marginLeft: `${(item.level) * 24}px` }}
                >
                  <div className="rounded-xl border border-line bg-surface-2 p-4">
                    {/* Row: Title/Description | Details | Actions */}
                    <div className="flex items-center justify-between w-full gap-4">
                      {/* Title & Description */}
                      <div className="flex flex-1 min-w-0 items-start gap-2">
                        <CheckSquare className="w-4 h-4 text-muted mt-0.5 shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <h3 className="text-[13.5px] font-semibold text-ink truncate">{task.name}</h3>
                          {task.description && (
                            <div className="text-xs text-muted truncate">{task.description}</div>
                          )}
                        </div>
                      </div>
                      {/* Details */}
                      <div className="flex items-center space-x-6 ml-6">
                        {/* Budget - Clickable for editing */}
                        <div
                          className={`cursor-pointer hover:bg-surface-3 rounded px-2 py-1 transition-colors flex flex-col items-end ${
                            editingField?.id === `task-${task.task_id}` && editingField?.field === 'budget' ? 'bg-bright-soft ring-1 ring-bright' : ''
                          }`}
                          onClick={!readonly ? () => startEditing(`task-${task.task_id}`, 'budget', task.budget) : undefined}
                        >
                          <span className="text-[10px] text-muted">Budget</span>
                          {editingField?.id === `task-${task.task_id}` && editingField?.field === 'budget' ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-[10px] text-muted">OMR</span>
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyPress(e, { ...task, id: `task-${task.task_id}` }, 'budget')}
                                onBlur={() => handleBlur({ ...task, id: `task-${task.task_id}` }, 'budget')}
                                className="w-16 px-1 py-0.5 text-[10px] border border-line rounded bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-bright [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                autoFocus
                                placeholder="0"
                              />
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-ink">OMR {(task.budget || 0).toLocaleString()}</span>
                          )}
                        </div>
                        {/* Start Date - Clickable for editing */}
                        <div
                          className={`cursor-pointer hover:bg-surface-3 rounded px-2 py-1 transition-colors flex flex-col items-end ${
                            editingField?.id === `task-${task.task_id}` && editingField?.field === 'start_date' ? 'bg-bright-soft ring-1 ring-bright' : ''
                          }`}
                          onClick={!readonly ? () => startEditing(`task-${task.task_id}`, 'start_date', task.start_date) : undefined}
                        >
                          <span className="text-[10px] text-muted">Start</span>
                          {editingField?.id === `task-${task.task_id}` && editingField?.field === 'start_date' ? (
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleKeyPress(e, { ...task, id: `task-${task.task_id}` }, 'start_date')}
                              onBlur={() => handleBlur({ ...task, id: `task-${task.task_id}` }, 'start_date')}
                              className="w-20 px-1 py-0.5 text-[10px] border border-line rounded bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-bright"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs font-semibold text-ink">{task.start_date ? new Date(task.start_date).toLocaleDateString() : '-'}</span>
                          )}
                        </div>
                        {/* End Date - Clickable for editing */}
                        <div
                          className={`cursor-pointer hover:bg-surface-3 rounded px-2 py-1 transition-colors flex flex-col items-end ${
                            editingField?.id === `task-${task.task_id}` && editingField?.field === 'end_date' ? 'bg-bright-soft ring-1 ring-bright' : ''
                          }`}
                          onClick={!readonly ? () => startEditing(`task-${task.task_id}`, 'end_date', task.end_date) : undefined}
                        >
                          <span className="text-[10px] text-muted">End</span>
                          {editingField?.id === `task-${task.task_id}` && editingField?.field === 'end_date' ? (
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleKeyPress(e, { ...task, id: `task-${task.task_id}` }, 'end_date')}
                              onBlur={() => handleBlur({ ...task, id: `task-${task.task_id}` }, 'end_date')}
                              className="w-20 px-1 py-0.5 text-[10px] border border-line rounded bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-bright"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs font-semibold text-ink">{task.end_date ? new Date(task.end_date).toLocaleDateString() : '-'}</span>
                          )}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-6">
                        <button
                          onClick={!readonly ? (e) => { e.stopPropagation(); handleDeleteClick({ id: `${task.task_id}`, type: 'task', name: task.name }); } : undefined}
                          className={`p-1 rounded-full hover:bg-danger-soft hover:text-danger text-muted transition-colors${readonly ? ' opacity-50 cursor-not-allowed' : ''}`}
                          title="Delete Task"
                          disabled={readonly}
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          className="p-1 rounded bg-info-soft hover:opacity-80 text-info text-xs flex items-center gap-1"
                          onClick={!readonly ? (e) => {
                            e.stopPropagation();
                            setAssigningTask(task);
                            setShowAssignModal(true);
                            setSelectedAssignUser(availableMembers.length > 0 ? availableMembers[0].user_id.toString() : "");
                          } : undefined}
                          disabled={readonly || availableMembers.length === 0}
                          title={availableMembers.length === 0 ? 'All team members assigned' : 'Assign team member'}
                        >
                          <User size={14} /> Assign
                        </button>
                        <button
                          className="p-1 rounded bg-success-soft hover:opacity-80 text-success text-xs flex items-center gap-1"
                          onClick={!readonly ? () => handleOpenResourceModal(task) : undefined}
                          title="Assign Resource"
                          disabled={readonly}
                        >
                          <Users size={14} /> Resource
                        </button>
                        <button
                          className="p-1 rounded bg-accent-violet-soft hover:opacity-80 text-accent-violet text-xs flex items-center gap-1"
                          onClick={!readonly ? () => handleOpenDependencyModal(task) : undefined}
                          title="Manage Dependencies"
                          disabled={readonly}
                        >
                          <Link size={14} /> Dependencies
                        </button>
                      </div>
                    </div>
                    {/* Divider */}
                    <hr className="my-3 border-t border-line w-full" />
                    {/* Team Members */}
                    {Array.isArray(task.user_assignments) && task.user_assignments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {task.user_assignments.map((assignment: any) => {
                          const user = assignment.user;
                          return (
                            <div key={user.user_id} className="flex items-center bg-surface rounded-lg border border-line px-2 py-1 text-ink-2">
                              <UserAvatar
                                name={personName(user)}
                                className="mr-2 h-7 w-7 text-xs"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-xs leading-tight">{user.account.first_name} {user.account.last_name}</span>
                                <span className="text-[10px] text-muted">{assignment.role || user.role?.name || 'Team Member'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Assigned Resources */}
                    {Array.isArray(task.assignments) && task.assignments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {task.assignments.map((assignment: any) => {
                          const resource = assignment.resource;
                          const initials = `${resource.name?.[0] || ''}`.toUpperCase();
                          return (
                            <div key={assignment.id} className="flex items-center gap-2 bg-success-soft text-success rounded-full px-3 py-1 text-xs font-medium border border-success">
                              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-success text-white font-bold">
                                {initials}
                              </span>
                              <span>{resource.name}</span>
                              <span className="ml-1 text-success">({resource.type})</span>
                              <span className="ml-2">{assignment.allocation_percentage}%</span>
                              {resource.rate && (
                                <span className="ml-2">@ {resource.rate}/hr</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const createScheduleWBS = async (formData: {
    name: string;
    description: string;
    level: number;
    start_date: string;
    end_date: string;
    parent_wbs_id?: number | null;
  }) => {
    notConnected("Creating the WBS item");
  };

  const createScheduleTask = async (formData: any) => {
    notConnected("Creating the task");
  };

  // Fetch all users for the select
  const fetchAllUsers = async () => {
    // notConnected: loads the users who can join the team.
  };

  // Fetch users when component mounts and when modal opens
  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (showAddTeamMemberModal) {
      fetchAllUsers();
    }
  }, [showAddTeamMemberModal]);

  // Function to fetch available resources for the schedule
  const fetchAvailableResources = async () => {
    // notConnected: loads the resources that can be assigned.
  };

  // Handler to open resource assignment modal for a task
  const handleOpenResourceModal = (task: any) => {
    setResourceModalTask(task);
    setExistingAssignments(task.assignments || []);
    setShowResourceModal(true);
    fetchAvailableResources();
  };

  // Handler for saving resource assignment
  const handleResourceAssign = async (data: any) => {
    notConnected("Assigning the resource");
  };

  // Handler to open dependency modal for a task
  const handleOpenDependencyModal = (task: any) => {
    setDependencyModalTask(task);
    setShowDependencyModal(true);
  };

  // Handler to submit the schedule plan
  const handleSubmitPlan = () => {
    setShowApprovalModal(true);
  };

  // Fetch approvals and current user
  // After fetching the schedule (which now includes approvals):
  // notConnected: the schedule's approvals, the signed-in user and their pending
  // approval (which makes the schedule read-only) would be loaded here.

  // Handler for approve
  const handleApprove = async () => {
    if (!userApproval) return;
    notConnected("Approving the schedule");
  };

  // Handler for reject
  const handleReject = async () => {
    if (!userApproval) return;
    notConnected("Rejecting the schedule");
  };

  if (loading) {
    return (
      <>
        <DashboardLayout
          title="Schedule Details"
          backHref="/scheduler"
          backLabel="Back to Scheduler"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Spinner size={64} className="text-bright-primary" />
          </div>
        </DashboardLayout>
      </>
    );
  }

  if (!schedule) {
    return (
      <>
        <DashboardLayout
          title="Schedule Not Found"
          backHref="/scheduler"
          backLabel="Back to Scheduler"
        >
          <div className="text-center">
            <p className="text-muted mb-6">The schedule you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => router.push("/scheduler")} className="bg-gradient-to-r from-bright to-bright-deep hover:from-bright-deep hover:to-bright">
              Back to Schedules
            </Button>
          </div>
        </DashboardLayout>
      </>
    );
  }

  const scheduleRows: [string, React.ReactNode][] = [
    [
      "Status",
      <StatusBadge
        key="status"
        label={humanize(schedule.status)}
        tone={scheduleStatusTone(schedule.status)}
      />,
    ],
    [
      "Priority",
      <StatusBadge
        key="priority"
        label={humanize(schedule.priority)}
        tone={priorityTone(schedule.priority)}
      />,
    ],
    ["Start Date", formatScheduleDate(schedule.start_date)],
    ["End Date", formatScheduleDate(schedule.end_date)],
    ["Target Completion", formatScheduleDate(schedule.target_completion_date)],
    [
      "Feasibility",
      <StatusBadge
        key="feasibility"
        label={`${schedule.feasibility_score}%`}
        tone={feasibilityTone(schedule.feasibility_score)}
      />,
    ],
    [
      "Estimated Budget",
      <span key="budget" className="tabular-nums">
        {schedule.estimated_budget
          ? `OMR ${schedule.estimated_budget.toLocaleString()}`
          : "—"}
      </span>,
    ],
    [
      "WBS Items",
      <span key="wbs" className="tabular-nums">{schedule.total_wbs_items}</span>,
    ],
    [
      "Tasks",
      <span key="tasks" className="tabular-nums">{schedule.total_tasks}</span>,
    ],
    [
      "Resources",
      <span key="resources" className="tabular-nums">{schedule.total_resources}</span>,
    ],
  ];

  return (
    <>
      <DashboardLayout
        title={schedule.name}
        subtitle={schedule.description}
        backHref="/scheduler"
        backLabel="Back to Scheduler"
        actions={
          <>
            <Button
              onClick={() => setShowWBSModal(true)}
              disabled={readonly}
              className="flex items-center gap-2 bg-bright hover:bg-bright-deep disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Add WBS
            </Button>
            <Button
              onClick={() => setShowTaskModal(true)}
              disabled={readonly}
              variant="outline"
              className="flex items-center gap-2 border-line hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Add Task
            </Button>
            <Button
              onClick={() => handleSubmitPlan()}
              className="flex items-center gap-2 bg-success text-white hover:opacity-90"
            >
              <CheckCircle size={16} />
              Submit Plan
            </Button>
          </>
        }
      >
        <div className="flex flex-col min-h-screen">
          <details className="group mb-4 flex-shrink-0">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink">
              <ChevronRight
                size={14}
                className="transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
              Schedule details
            </summary>
            <div className="mt-3">
              <FormSection title="Schedule Information">
                <InfoGrid rows={scheduleRows} />

                {schedule.notes && (
                  <div className="mt-5 border-t border-line-2 pt-4">
                    <div className="mb-1 text-[13px] text-muted">Notes</div>
                    <p className="whitespace-pre-line text-[13.5px] text-ink">
                      {schedule.notes}
                    </p>
                  </div>
                )}
              </FormSection>
            </div>
          </details>

          {/* Approval Section */}
          {userApproval && currentUser && (
            <div className="mb-4 rounded-xl border border-line border-l-[3px] border-l-info bg-surface p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-info shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-[14.5px] font-semibold text-ink">Pending Approval Required</h3>
                    <p className="text-[13px] text-muted">You have a pending approval for this schedule</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApprove} variant="default" className="bg-success hover:opacity-90 text-white">
                    Approve
                  </Button>
                  <Button onClick={handleReject} variant="destructive">
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content: WBS/tasks and Team Members side by side */}
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* WBS Content */}
            <div className="min-w-0">
              {wbsItems.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No WBS items yet"
                  description="Break the schedule into WBS items, then add tasks under them."
                  action={
                    !readonly && (
                      <button type="button" className={actionPrimary} onClick={() => setShowWBSModal(true)}>
                        <Plus size={16} aria-hidden="true" />
                        Add WBS
                      </button>
                    )
                  }
                />
              ) : (
                <div className="space-y-4">
                  {wbsItems.map(item => (
                    <div key={item.id}>
                      {renderWBSItem(item)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Members */}
            <FormSection className="lg:sticky lg:top-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                  Team Members
                  <span className="ml-1.5 tabular-nums text-muted">{teamMembers.length}</span>
                </h2>
                <AddEntityModal
                  entityName="Team Member"
                  fields={[
                    {
                      name: "user_id",
                      label: "User",
                      type: "select",
                      required: true,
                      options: allUsers.map((user) => ({
                        value: user.user_id.toString(),
                        label: `${user.account.first_name} ${user.account.last_name} (@${user.username})`,
                      })),
                    },
                    {
                      name: "role",
                      label: "Role",
                      type: "text",
                      required: true,
                    },
                    {
                      name: "department",
                      label: "Department",
                      type: "text",
                      required: true,
                    },
                    {
                      name: "workload",
                      label: "Workload (%)",
                      type: "number",
                      required: true,
                      min: 0,
                      max: 100,
                    },
                    {
                      name: "is_lead",
                      label: "Is Lead",
                      type: "checkbox",
                      required: false,
                    },
                  ]}
                  onSubmit={async () => notConnected("Adding a team member")}
                  triggerButton={
                    <button
                      type="button"
                      className={`${actionSecondary} h-8 px-2.5`}
                      disabled={readonly}
                      data-testid="add-team-member"
                    >
                      <Plus size={14} aria-hidden="true" />
                      Add
                    </button>
                  }
                />
              </div>

              {teamMembers.length === 0 ? (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-line px-4 py-8 text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-faint">
                    <Users size={18} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[13.5px] font-medium text-ink">No team members yet</p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    Add the people who will work on this schedule.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line-2">
                  {teamMembers.map(member => {
                    const name = personName(member.user);
                    const workload = Number(member.workload) || 0;
                    return (
                      <li
                        key={member.team_member_id}
                        className="py-3.5 first:pt-0 last:pb-0"
                        data-testid={`team-member-${member.team_member_id}`}
                      >
                        <div className="flex items-start gap-3">
                          <UserAvatar name={name} className="h-9 w-9 text-[12px]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[13.5px] font-semibold text-ink" title={member.user.email}>
                                {name}
                              </span>
                              {member.is_lead && <StatusBadge label="Lead" tone="brand" />}
                            </div>
                            <div className="truncate text-[12px] text-muted">
                              {[member.role, member.department].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          {!readonly && (
                            <RowAction
                              icon={Trash2}
                              label="Remove team member"
                              tone="danger"
                              onClick={() =>
                                handleDeleteClick({
                                  id: member.team_member_id.toString(),
                                  type: 'team-member',
                                  name,
                                })
                              }
                            />
                          )}
                        </div>
                        <div className="mt-2.5 flex items-center gap-3 pl-12">
                          <div
                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
                            role="progressbar"
                            aria-label={`${name} workload`}
                            aria-valuenow={workload}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className={`h-full rounded-full ${workload > 100 ? 'bg-danger' : 'bg-bright'}`}
                              style={{ width: `${Math.min(workload, 100)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-[12px] font-medium tabular-nums text-ink-3">
                            {workload}%
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </FormSection>
          </div>
        </div>

        {/* WBS Modal */}
        {showWBSModal && (
          <Modal
            open={showWBSModal}
            onClose={() => setShowWBSModal(false)}
            title="Create New WBS Item"
            description="Add a custom work breakdown structure item to the schedule"
            maxWidthClass="max-w-2xl"
          >
            <CreateScheduleWBSForm
              onClose={() => setShowWBSModal(false)}
              onSave={createScheduleWBS}
              schedule={schedule}
              creating={creatingWBS}
              wbsData={wbsItems}
            />
          </Modal>
        )}

        {/* Task Creation Modal */}
        {showTaskModal && (
          <CreateScheduleTaskModal
            open={showTaskModal}
            onClose={() => setShowTaskModal(false)}
            onSave={createScheduleTask}
            wbsData={wbsItems}
            creating={creatingTask}
            schedule={schedule}
          />
        )}

        {/* Add Team Member Modal */}
        {showAddTeamMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-surface rounded-xl shadow-xl p-8 w-full max-w-md relative">
              <button
                aria-label="Close dialog" className="absolute top-2 right-2 text-faint hover:text-ink-3" onClick={() => setShowAddTeamMemberModal(false)}>
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold mb-4">Add Team Member</h2>
              <div className="mb-4">
                <TeamUserSelect
                  users={allUsers}
                  value={selectedUserId}
                  onChange={setSelectedUserId}
                  placeholder="Select a user..."
                />
              </div>
              <div className="mb-4 flex gap-2">
                <div className="flex-1">
                  <Label>Availability Start</Label>
                  <Input type="date" value={availabilityStart} onChange={e => setAvailabilityStart(e.target.value)} />
                </div>
                <div className="flex-1">
                  <Label>Availability End</Label>
                  <Input type="date" value={availabilityEnd} onChange={e => setAvailabilityEnd(e.target.value)} />
                </div>
              </div>
              <Button
                onClick={() => notConnected("Adding a team member")}
                disabled={!selectedUserId || !availabilityStart || !availabilityEnd || addingMember}
                className="w-full mt-2"
              >
                {addingMember ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </div>
        )}

        {/* Assign Team Member Modal */}
        {showAssignModal && assigningTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-surface rounded-xl shadow-xl p-8 w-full max-w-sm relative">
              <button
                aria-label="Close dialog" className="absolute top-2 right-2 text-faint hover:text-ink-3" onClick={() => setShowAssignModal(false)}>
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold mb-4">Assign Team Member</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Team Member</label>
                <Dropdown
                  value={String(selectedAssignUser ?? '')}
                  onChange={(__v: string) => setSelectedAssignUser(__v)}
                  options={[
                  ...teamMembers.filter(member =>
                    !(assigningTask.assigned_users || []).some((au: any) => (au.user_id || au.user?.user_id) === member.user_id)
                  ).map(member => ({ value: String(member.user_id), label: `${member.user.account.first_name} ${member.user.account.last_name} (@${member.user.username})` })),
                ]}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAssignModal(false)} disabled={assigning}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (!selectedAssignUser) return;
                    notConnected("Assigning the team member");
                  }}
                  disabled={!selectedAssignUser || assigning}
                >
                  {assigning ? <Spinner size={16} /> : "Assign"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-danger-soft rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    Confirm Delete
                  </h3>
                  <p className="text-sm text-muted">
                    Are you sure you want to delete "{itemToDelete?.name}"?
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleDeleteCancel}
                  className="flex-1"
                  disabled={deletingItem !== null}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  className="flex-1"
                  disabled={deletingItem !== null}
                >
                  {deletingItem !== null ? (
                    <>
                      <Spinner size={16} className="mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Resource Assignment Modal */}
        {showResourceModal && resourceModalTask && (
          <ScheduleResourceAssignmentModal
            scheduleId={parseInt(scheduleId)}
            task={resourceModalTask}
            resources={availableResources}
            existingAssignments={existingAssignments}
            onClose={() => {
              setShowResourceModal(false);
              setResourceModalTask(null);
            }}
            onSave={(_data) => {
              setShowResourceModal(false);
              setResourceModalTask(null);
              fetchWBSData();
            }}
          />
        )}

        {/* Task Dependency Modal */}
        {showDependencyModal && dependencyModalTask && (
          <ScheduleTaskDependencyModal
            scheduleId={parseInt(scheduleId)}
            task={dependencyModalTask}
            allTasks={allTasks}
            onClose={() => {
              setShowDependencyModal(false);
              setDependencyModalTask(null);
            }}
            onSave={() => {
              setShowDependencyModal(false);
              setDependencyModalTask(null);
              fetchWBSData();
            }}
          />
        )}
      </DashboardLayout>
      <ScheduleApprovalModal
        open={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        scheduleId={parseInt(scheduleId)}
        onSuccess={fetchSchedule}
      />
    </>
  );
};

// Create Schedule WBS Form Component
const CreateScheduleWBSForm = ({
  onClose,
  onSave,
  schedule,
  creating,
  wbsData,
}: {
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    level: number;
    start_date: string;
    end_date: string;
    parent_wbs_id?: number | null;
  }) => void;
  schedule: Schedule | null;
  creating: boolean;
  wbsData: WBSItem[];
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: 1,
    start_date: schedule?.start_date
      ? new Date(schedule.start_date).toISOString().split("T")[0]
      : "",
    end_date: schedule?.end_date
      ? new Date(schedule.end_date).toISOString().split("T")[0]
      : "",
    parent_wbs_id: null as number | null,
  });

  const [availableParents, setAvailableParents] = useState<WBSItem[]>([]);

  // Update available parents when component mounts or level changes
  React.useEffect(() => {
    updateAvailableParents(formData.level);
  }, [formData.level, wbsData]);



  // Function to get available parents based on level
  const updateAvailableParents = (level: number) => {
    if (level === 1) {
      setAvailableParents([]);
      setFormData((prev) => ({ ...prev, parent_wbs_id: null }));
      return;
    }

    const flattenWBS = (items: WBSItem[]): WBSItem[] => {
      let result: WBSItem[] = [];
      items.forEach((item) => {
        result.push(item);
        if (item.children) {
          result = result.concat(flattenWBS(item.children));
        }
      });
      return result;
    };

    const allWBSItems = flattenWBS(wbsData);
    const parentLevel = level - 1;
    const potentialParents = allWBSItems.filter(
      (item: WBSItem) => item.type === 'wbs' && item.level === parentLevel
    );

    setAvailableParents(potentialParents);

    // Auto-select first parent if only one available
    if (potentialParents.length === 1) {
      setFormData((prev) => ({
        ...prev,
        parent_wbs_id: parseInt(potentialParents[0].id),
      }));
    } else {
      setFormData((prev) => ({ ...prev, parent_wbs_id: null }));
    }
  };

  // State for error popup
  const [errorPopup, setErrorPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: "",
    message: "",
  });

  // Function to show error popup
  const showErrorPopup = (title: string, message: string) => {
    setErrorPopup({
      show: true,
      title,
      message,
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setErrorPopup((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleSave = () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      showErrorPopup("Missing Fields", "Please fill in all required fields");
      return;
    }

    // Check if parent is required and selected
    if (formData.level > 1 && !formData.parent_wbs_id) {
      showErrorPopup(
        "Parent Required",
        "Please select a parent WBS for this level"
      );
      return;
    }

    // Check if level 1 already exists (root level)
    if (formData.level === 1) {
      const flattenWBS = (items: WBSItem[]): WBSItem[] => {
        let result: WBSItem[] = [];
        items.forEach((item) => {
          result.push(item);
          if (item.children) {
            result = result.concat(flattenWBS(item.children));
          }
        });
        return result;
      };

      const allWBSItems = flattenWBS(wbsData);
      const hasRootLevel = allWBSItems.some(
        (item: WBSItem) => item.level === 1
      );
      if (hasRootLevel) {
        showErrorPopup(
          "Level 1 Exists",
          "A Level 1 (Root) WBS already exists for this schedule. You can only have one root level."
        );
        return;
      }
    }

    // Add date range validation for parent WBS
    if (formData.parent_wbs_id) {
      const flattenWBS = (items: WBSItem[]): WBSItem[] => {
        let result: WBSItem[] = [];
        items.forEach((item) => {
          result.push(item);
          if (item.children) {
            result = result.concat(flattenWBS(item.children));
          }
        });
        return result;
      };

      const allWBSItems = flattenWBS(wbsData);
      const parent = allWBSItems.find(
        (item) => item.id === formData.parent_wbs_id?.toString()
      );

      if (parent && parent.start_date && parent.end_date) {
        const parentStart = new Date(parent.start_date);
        const parentEnd = new Date(parent.end_date);
        const childStart = new Date(formData.start_date);
        const childEnd = new Date(formData.end_date);

        if (childStart < parentStart || childEnd > parentEnd) {
          showErrorPopup(
            "Date Range Error",
            `WBS dates must be within parent WBS date range (${parentStart.toLocaleDateString()} - ${parentEnd.toLocaleDateString()})`
          );
          return;
        }
      }
    }

    onSave({
      ...formData,
      parent_wbs_id: formData.parent_wbs_id,
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-ink">
            Create New WBS Item
          </h3>
          <p className="text-muted">
            Add a custom work breakdown structure item to the schedule
          </p>
        </div>
        <button
          aria-label="Back"
          onClick={onClose}
          className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Form */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              className="w-full p-3 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
              placeholder="Enter WBS item name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              Level
            </label>
            <Dropdown
              value={String(formData.level ?? '')}
              onChange={(__v: string) =>
                setFormData({
                  ...formData,
                  level: parseInt(__v),
                })}
              options={[
              { value: String(1), label: "Level 1 (Root)" },
              { value: String(2), label: "Level 2 (Main Phase)" },
              { value: String(3), label: "Level 3" },
              { value: String(4), label: "Level 4" },
            ]}
            />
          </div>
        </div>

        {/* Parent WBS Selection - only show for levels > 1 */}
        {formData.level > 1 && (
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              Parent WBS *
            </label>
            {availableParents.length === 0 ? (
              <div className="p-3 bg-warning-soft border border-warning rounded-lg">
                <p className="text-sm text-warning">
                  No Level {formData.level - 1} WBS items found. Please create a
                  Level {formData.level - 1} parent first.
                </p>
              </div>
            ) : (
              <Dropdown
                value={String(formData.parent_wbs_id || "")}
                onChange={(__v: string) =>
                  setFormData({
                    ...formData,
                    parent_wbs_id: __v
                      ? parseInt(__v)
                      : null,
                  })}
                options={[
                { value: String(""), label: "Select a parent WBS..." },
                ...availableParents.map((parent) => ({ value: String(parent.id), label: parent.title })),
              ]}
                required={true}
              />
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink-3 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({
                ...formData,
                description: e.target.value,
              })
            }
            rows={3}
            className="w-full p-3 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
            placeholder="Enter WBS item description"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  start_date: e.target.value,
                })
              }
              className="w-full p-3 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              End Date *
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  end_date: e.target.value,
                })
              }
              className="w-full p-3 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
              required
            />
          </div>
        </div>


      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-line">
        <button
          onClick={onClose}
          disabled={creating}
          className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={
            creating ||
            !formData.name ||
            !formData.start_date ||
            !formData.end_date
          }
          className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <Spinner size={16} />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Create WBS</span>
            </>
          )}
        </button>
      </div>

      {/* Error Popup */}
      {errorPopup.show && (
        <Modal
          open
          onClose={() => setErrorPopup((prev) => ({ ...prev, show: false }))}
          title={errorPopup.title}
          description="Please correct and try again"
          maxWidthClass="max-w-md"
          icon={
            <span className="grid h-9 w-9 place-items-center rounded-full bg-danger-soft">
              <AlertTriangle className="h-5 w-5 text-danger" />
            </span>
          }
          footer={
            <button
              onClick={() =>
                setErrorPopup((prev) => ({ ...prev, show: false }))
              }
              className="w-full py-2 bg-danger hover:opacity-90 text-white rounded-lg transition-colors"
            >
              Dismiss
            </button>
          }
        >
            <p className="text-ink-3">{errorPopup.message}</p>
        </Modal>
      )}
    </div>
  );
};

// Task Creation Modal Component
const CreateScheduleTaskModal = ({
  open,
  onClose,
  onSave,
  wbsData,
  creating,
  schedule,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  wbsData: WBSItem[];
  creating: boolean;
  schedule: Schedule | null;
}) => {
  const [formData, setFormData] = useState({
    wbs_id: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    priority: 'medium',
    estimated_hours: '', // new
    is_milestone: false, // new
    is_critical_path: false, // new
  });
  const [error, setError] = useState<string | null>(null);
  const [availableWBS, setAvailableWBS] = useState<WBSItem[]>([]);
  const [parentWBS, setParentWBS] = useState<WBSItem | null>(null);

  useEffect(() => {
    // Flatten WBS tree for selection
    const flatten = (items: WBSItem[]): WBSItem[] => {
      let result: WBSItem[] = [];
      items.forEach(item => {
        result.push(item);
        if (item.children) result = result.concat(flatten(item.children));
      });
      return result;
    };
    setAvailableWBS(flatten(wbsData));
  }, [wbsData]);

  useEffect(() => {
    // Set parentWBS when wbs_id changes
    const found = availableWBS.find(w => w.id === formData.wbs_id);
    setParentWBS(found || null);
  }, [formData.wbs_id, availableWBS]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.target.type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [e.target.name]: checked
      }));
    } else {
      // Special handling for estimated_hours to prevent negative numbers and non-numeric values
      if (e.target.name === 'estimated_hours') {
        const value = e.target.value;
        // Allow empty string for clearing the field
        if (value === '') {
          setFormData(prev => ({
            ...prev,
            [e.target.name]: value
          }));
        } else {
          // Check if it's a valid whole number (integer) and not negative
          const numValue = parseInt(value, 10);
          if (!isNaN(numValue) && numValue >= 0 && Number.isInteger(parseFloat(value))) {
            setFormData(prev => ({
              ...prev,
              [e.target.name]: value
            }));
          }
          // If invalid, don't update the state (ignore the input)
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [e.target.name]: e.target.value
        }));
      }
    }
    setError(null);
  };

  const handleSave = () => {
    if (!formData.wbs_id || !formData.name || !formData.start_date || !formData.end_date) {
      setError('Please fill in all required fields.');
      return;
    }
    if (parentWBS) {
      if (!parentWBS.start_date || !parentWBS.end_date) {
        setError('Parent WBS does not have valid start/end dates.');
        return;
      }
      // Convert strings to Date objects for proper comparison
      const taskStartDate = new Date(formData.start_date);
      const taskEndDate = new Date(formData.end_date);
      const wbsStartDate = new Date(parentWBS.start_date);
      const wbsEndDate = new Date(parentWBS.end_date);

      if (taskStartDate < wbsStartDate || taskEndDate > wbsEndDate) {
        setError(`Task dates must be within or equal to parent WBS date range (${wbsStartDate.toLocaleDateString()} - ${wbsEndDate.toLocaleDateString()})`);
        return;
      }
    }
    onSave(formData);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-faint hover:text-muted transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h3 className="text-xl font-bold mb-4 text-ink pr-8">Create New Task</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Parent WBS *</label>
            <Dropdown
              value={String(formData.wbs_id ?? '')}
              onChange={(__v: string) => handleChange({ target: { name: "wbs_id", value: __v } } as React.ChangeEvent<HTMLSelectElement>)}
              options={[
              { value: String(""), label: "Select WBS..." },
              ...availableWBS.map(wbs => ({ value: String(wbs.id), label: wbs.title })),
            ]}
              name="wbs_id"
              required={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date *</label>
              <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full p-2 border rounded" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <Dropdown
              value={String(formData.priority ?? '')}
              onChange={(__v: string) => handleChange({ target: { name: "priority", value: __v } } as React.ChangeEvent<HTMLSelectElement>)}
              options={[
              { value: String("low"), label: "Low" },
              { value: String("medium"), label: "Medium" },
              { value: String("high"), label: "High" },
            ]}
              name="priority"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estimated Hours</label>
            <input
              type="number"
              name="estimated_hours"
              value={formData.estimated_hours}
              onChange={handleChange}
              onKeyDown={(e) => {
                // Prevent minus key, 'e', 'E', '+', and decimal point keys
                if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.' || e.key === ',') {
                  e.preventDefault();
                }
              }}
              className="w-full p-2 border rounded"
              min="0"
              step="1"
              placeholder="e.g. 8"
              pattern="[0-9]*"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_milestone"
                checked={formData.is_milestone}
                onChange={handleChange}
                className="mr-2"
              />
              Is Milestone
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_critical_path"
                checked={formData.is_critical_path}
                onChange={handleChange}
                className="mr-2"
              />
              Is Critical Path
            </label>
          </div>
          {error && <div className="text-danger text-sm mt-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={handleSave} disabled={creating} className="px-4 py-2 bg-bright text-white rounded hover:bg-bright-deep disabled:opacity-50">{creating ? 'Creating...' : 'Create Task'}</button>
        </div>
      </div>
    </div>
  );
};

const SCHEDULE_ROLES = [
  { key: 'PJM', label: 'PJM (Project Manager)' },
  { key: 'FIN', label: 'Finance' },
];

const ScheduleApprovalModal = ({
  open,
  onClose,
  scheduleId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  scheduleId: number;
  onSuccess?: () => void;
}) => {
  const [usersByRole, setUsersByRole] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState<{ [key: string]: string }>({ PJM: '', FIN: '' });
  const [existingApprovals, setExistingApprovals] = useState<any[]>([]);
  const [creatingApprovals, setCreatingApprovals] = useState(false);
  const [loading, setLoading] = useState(false);

  // notConnected: the schedule, its existing approvals and the PJM/Finance users
  // to pick from would be loaded here.

  const handleChange = (role: string, userId: string) => {
    setForm((f) => ({ ...f, [role]: userId }));
  };

  const handleCreateApprovals = async () => {
    if (!form.PJM || !form.FIN) {
      toast.error('Please select a user for both PJM and Finance.');
      return;
    }
    notConnected("Requesting approvals");
  };

  const hasApprovalForRole = (roleKey: string) => {
    const roleMap: { [key: string]: string } = { PJM: 'PJM', FIN: 'FIN' };
    return existingApprovals.some((approval) => approval.user.role.name === roleMap[roleKey]);
  };
  const getExistingApprovalForRole = (roleKey: string) => {
    const roleMap: { [key: string]: string } = { PJM: 'PJM', FIN: 'FIN' };
    return existingApprovals.find((approval) => approval.user.role.name === roleMap[roleKey]);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-xl max-w-2xl w-full p-8 relative">
        <button
          aria-label="Close dialog" onClick={onClose} className="absolute top-4 right-4 text-faint hover:text-ink-3 transition-colors">
          <X className="w-6 h-6" aria-hidden="true" />
        </button>
        <h2 className="text-2xl font-bold mb-2 text-ink">Schedule Approvals</h2>
        <p className="text-sm text-muted mb-6">Select approvers for this schedule</p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Spinner size={48} className="text-bright-primary" />
            <p className="text-muted">Loading users...</p>
          </div>
        ) : (
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SCHEDULE_ROLES.map((role) => {
                const hasApproval = hasApprovalForRole(role.key);
                const existingApproval = getExistingApprovalForRole(role.key);
                const usersForRole = usersByRole[role.key] || [];
                return (
                  <div key={role.key} className={`rounded-lg p-5 flex flex-col gap-3 transition-all ${hasApproval ? 'bg-success-soft border-2 border-success ' : 'bg-canvas border-2 border-line'}`}>
                    <label className="font-semibold text-ink flex items-center gap-2">
                      {role.label}
                      {hasApproval && <CheckCircle className="w-5 h-5 text-success" />}
                    </label>
                    {hasApproval ? (
                      <div className="text-sm text-muted bg-surface rounded-lg p-3 border border-success">
                        <p className="font-medium text-ink">{existingApproval?.user.account.first_name} {existingApproval?.user.account.last_name}</p>
                        <p className="text-xs text-success mt-1">✓ Already assigned</p>
                      </div>
                    ) : usersForRole.length === 0 ? (
                      <div className="text-sm text-warning bg-warning-soft rounded-lg p-3 border border-warning">
                        <p className="font-medium">No users found</p>
                        <p className="text-xs mt-1">No users with {role.label} role are available</p>
                      </div>
                    ) : (
                      <TeamUserSelect
                        users={usersForRole}
                        value={form[role.key]}
                        onChange={(userId) => handleChange(role.key, userId)}
                        placeholder={`Select ${role.label}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center pt-6 border-t border-line">
              <button
                type="button"
                onClick={handleCreateApprovals}
                disabled={creatingApprovals || existingApprovals.length >= 2 || !form.PJM || !form.FIN}
                className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-semibold transition-all transform ${
                  creatingApprovals || existingApprovals.length >= 2 || !form.PJM || !form.FIN
                    ? 'bg-surface-3  text-muted cursor-not-allowed'
                    : 'bg-success text-white hover:opacity-90 hover:scale-105 shadow-lg'
                }`}
              >
                {creatingApprovals ? (
                  <>
                    <Spinner size={16} />
                    <span>Creating Approvals...</span>
                  </>
                ) : existingApprovals.length >= 2 ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>All Approvals Created</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Create Approvals</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ScheduleDetailPage;