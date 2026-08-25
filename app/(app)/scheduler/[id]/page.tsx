"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
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
  Link
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import axios from "@/lib/axios";
import { TeamUserSelect } from '@/components/TeamUserSelect';
import { AddEntityModal } from '@/components/AddEntityModal';
import ResourceAssignmentModal from '@/components/scheduler/ResourceAssignmentModal';
import ScheduleResourceAssignmentModal from '@/components/ScheduleResourceAssignmentModal';
import ScheduleTaskDependencyModal from '@/components/ScheduleTaskDependencyModal';
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

const ScheduleDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;
  
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [wbsItems, setWbsItems] = useState<WBSItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await axios.get(`/api/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSchedule(response.data.schedule);
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const fetchWBSData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/schedules/${scheduleId}/wbs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Transform and build tree
      const transformWBSData = (items: any[]): WBSItem[] => {
        return items.map(item => ({
          id: item.wbs_id.toString(),
          type: 'wbs',
          title: item.name,
          description: item.description,
          budget: item.budget?.planned_amount || 0, // use ScheduleBudget
          start_date: item.start_date,
          end_date: item.end_date,
          children: [], // children will be set by buildWBSTree
          expanded: true,
          level: item.level,
          wbs_code: item.wbs_code,
          parent_wbs_id: item.parent_wbs_id?.toString(),
          tasks: (item.tasks || []).map((task: any) => ({
            ...task,
            budget: task.budget?.planned_amount || 0,
          })), // Attach tasks with correct budget
        }));
      };
      const flatData = transformWBSData(response.data || []);
      const tree = buildWBSTree(flatData);
      setWbsItems(tree);
    } catch (error) {
      console.error("Failed to fetch WBS data:", error);
      setWbsItems([]);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/schedules/${scheduleId}/team-members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(response.data);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      setTeamMembers([]);
    }
  };

  const fetchAllTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/schedules/${scheduleId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllTasks(response.data || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setAllTasks([]);
    }
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
    try {
      // Date validation: ensure start_date <= end_date
      let newStart = item.start_date;
      let newEnd = item.end_date;
      if (field === 'start_date') {
        newStart = value;
      } else if (field === 'end_date') {
        newEnd = value;
      }
      if (newStart && newEnd && new Date(newStart) > new Date(newEnd)) {
        toast.error('Start date cannot be after end date.');
        return;
      }
      const token = localStorage.getItem("token");
      const payload: any = {};
      
      if (field === 'budget') {
        payload.budget_amount = parseFloat(value) || 0;
      } else if (field === 'start_date') {
        payload.start_date = value;
      } else if (field === 'end_date') {
        payload.end_date = value;
      }

      // If editing a task budget
      if (item.id && typeof item.id === 'string' && item.id.startsWith('task-') && field === 'budget') {
        await axios.put(`/api/schedules/${scheduleId}/tasks/${item.task_id}`, { budget: parseFloat(value) || 0 }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Update local state (optional: refetch WBS data for accuracy)
        await fetchWBSData();
        setEditingField(null);
        setEditValue("");
        toast.success("Task budget updated successfully");
        return;
      }
      // If editing a task start_date or end_date
      if (item.id && typeof item.id === 'string' && item.id.startsWith('task-') && (field === 'start_date' || field === 'end_date')) {
        await axios.put(`/api/schedules/${scheduleId}/tasks/${item.task_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchWBSData();
        setEditingField(null);
        setEditValue("");
        toast.success("Task date updated successfully");
        return;
      }
      // Otherwise, update WBS as before
      await axios.put(`/api/schedules/${scheduleId}/wbs/${item.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      const updateItemInTree = (items: WBSItem[]): WBSItem[] => {
        return items.map(wbsItem => {
          if (wbsItem.id === item.id) {
            return { ...wbsItem, [field === 'budget' ? 'budget' : field]: field === 'budget' ? parseFloat(value) || 0 : value };
          }
          if (wbsItem.children) {
            return { ...wbsItem, children: updateItemInTree(wbsItem.children) };
          }
          return wbsItem;
        });
      };

      setWbsItems(updateItemInTree(wbsItems));
      setEditingField(null);
      setEditValue("");
      toast.success("WBS item updated successfully");
    } catch (error) {
      console.error("Failed to update WBS item or task budget:", error);
      toast.error("Failed to update WBS item or task budget");
    }
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
    if (!itemToDelete) return;

    setDeletingItem(itemToDelete.id);
    try {
      const token = localStorage.getItem("token");
      
      switch (itemToDelete.type) {
        case 'wbs':
          await axios.delete(`/api/schedules/${scheduleId}/wbs/${itemToDelete.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success("WBS item deleted successfully");
          fetchWBSData();
          break;
        case 'task':
          await axios.delete(`/api/schedules/${scheduleId}/tasks/${itemToDelete.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success("Task deleted successfully");
          fetchWBSData();
          break;
        case 'team-member':
          await axios.delete(`/api/schedules/${scheduleId}/team-members/${itemToDelete.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success("Team member removed successfully");
          fetchTeamMembers();
          break;
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || "Failed to delete item");
    } finally {
      setDeletingItem(null);
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
    }
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
    
    // Color schemes based on visual level (0-based for colors)
    const colorSchemes = [
      {
        gradient: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-500',
        light: 'bg-blue-50 dark:bg-blue-900/10',
        border: 'border-blue-200 dark:border-blue-800'
      },
      {
        gradient: 'from-emerald-500 to-emerald-600',
        bg: 'bg-emerald-500',
        light: 'bg-emerald-50 dark:bg-emerald-900/10',
        border: 'border-emerald-200 dark:border-emerald-800'
      },
      {
        gradient: 'from-purple-500 to-purple-600',
        bg: 'bg-purple-500',
        light: 'bg-purple-50 dark:bg-purple-900/10',
        border: 'border-purple-200 dark:border-purple-800'
      },
      {
        gradient: 'from-orange-500 to-orange-600',
        bg: 'bg-orange-500',
        light: 'bg-orange-50 dark:bg-orange-900/10',
        border: 'border-orange-200 dark:border-orange-800'
      },
      {
        gradient: 'from-pink-500 to-pink-600',
        bg: 'bg-pink-500',
        light: 'bg-pink-50 dark:bg-pink-900/10',
        border: 'border-pink-200 dark:border-pink-800'
      },
      {
        gradient: 'from-indigo-500 to-indigo-600',
        bg: 'bg-indigo-500',
        light: 'bg-indigo-50 dark:bg-indigo-900/10',
        border: 'border-indigo-200 dark:border-indigo-800'
      }
    ];
    const colorScheme = colorSchemes[(item.level - 1) % colorSchemes.length];

    return (
      <div key={item.id} className={`${item.level > 1 ? 'mt-4' : 'mb-6'}`} style={{ marginLeft: `${indentWidth}px` }}>
        <div className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* WBS Header with Gradient */}
          <div className={`px-6 py-4 bg-gradient-to-r ${colorScheme.gradient} text-white relative overflow-hidden`}>
            {/* Decorative background pattern */}
            <div className="absolute inset-0 bg-white/10 opacity-20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full bg-white shadow-md`}></div>
                </div>
                
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-base font-bold text-white drop-shadow-sm">
                      {item.title}
                    </h3>
                  </div>

                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Budget Information with Edit Functionality */}
                <div className="text-right">
                  <div className="grid grid-cols-3 gap-6 text-xs">
                    {/* Budget - Clickable for editing */}
                    <div 
                      className={`cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors ${
                        editingField?.id === item.id && editingField?.field === 'budget' ? 'bg-white/20 ring-2 ring-white/50' : ''
                      }`}
                      onClick={!readonly ? () => startEditing(item.id, 'budget', item.budget) : undefined}
                    >
                      <div className="text-white/80">Budget</div>
                      {editingField?.id === item.id && editingField?.field === 'budget' ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-white/90">OMR</span>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyPress(e, item, 'budget')}
                            onBlur={() => handleBlur(item, 'budget')}
                            className="w-20 px-1 py-0.5 text-xs border border-white/30 rounded bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoFocus
                            placeholder="0"
                          />
                        </div>
                      ) : (
                        <div className="font-bold text-white">OMR {(item.budget || 0).toLocaleString()}</div>
                      )}
                    </div>
                    
                    {/* Start Date - Clickable for editing */}
                    <div 
                      className={`cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors ${
                        editingField?.id === item.id && editingField?.field === 'start_date' ? 'bg-white/20 ring-2 ring-white/50' : ''
                      }`}
                      onClick={!readonly ? () => startEditing(item.id, 'start_date', item.start_date) : undefined}
                    >
                      <div className="text-white/80">Start</div>
                      {editingField?.id === item.id && editingField?.field === 'start_date' ? (
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, item, 'start_date')}
                          onBlur={() => handleBlur(item, 'start_date')}
                          className="w-28 px-1 py-0.5 text-xs border border-white/30 rounded bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white/50"
                          autoFocus
                        />
                      ) : (
                        <div className="font-bold text-white">
                          {item.start_date ? new Date(item.start_date).toLocaleDateString() : '-'}
                        </div>
                      )}
                    </div>
                    
                    {/* End Date - Clickable for editing */}
                    <div 
                      className={`cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors ${
                        editingField?.id === item.id && editingField?.field === 'end_date' ? 'bg-white/20 ring-2 ring-white/50' : ''
                      }`}
                      onClick={!readonly ? () => startEditing(item.id, 'end_date', item.end_date) : undefined}
                    >
                      <div className="text-white/80">End</div>
                      {editingField?.id === item.id && editingField?.field === 'end_date' ? (
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, item, 'end_date')}
                          onBlur={() => handleBlur(item, 'end_date')}
                          className="w-28 px-1 py-0.5 text-xs border border-white/30 rounded bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white/50"
                          autoFocus
                        />
                      ) : (
                        <div className="font-bold text-white">
                          {item.end_date ? new Date(item.end_date).toLocaleDateString() : '-'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Delete Button */}
                <button
                  onClick={!readonly ? (e) => { e.stopPropagation(); handleDeleteClick({ id: item.id, type: 'wbs', name: item.title }); } : undefined}
                  className={`p-1 rounded-full bg-white/20 hover:bg-red-500/80 transition-colors${readonly ? ' opacity-50 cursor-not-allowed' : ''}`}
                  title="Delete WBS"
                  disabled={readonly}
                >
                  <Trash2 size={16} className="text-white" />
                </button>
                
                {/* Expand/Collapse Button */}
                {(item.children && item.children.length > 0) || (item.tasks && item.tasks.length > 0) ? (
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    {item.expanded ? (
                      <ChevronDown size={16} className="text-white" />
                    ) : (
                      <ChevronRight size={16} className="text-white" />
                    )}
                  </button>
                ) : null}
              </div>
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
                  <div className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-400 to-gray-500 text-white relative overflow-hidden">
                      {/* Row: Title/Description | Details | Actions */}
                      <div className="flex items-center justify-between relative z-10 w-full">
                        {/* Title & Description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-base font-bold text-white drop-shadow-sm truncate">{task.name}</h3>
                          </div>
                          <div className="text-xs text-white/80 truncate">{task.description}</div>
                        </div>
                        {/* Details */}
                        <div className="flex items-center space-x-6 ml-6">
                          {/* Budget - Clickable for editing */}
                          <div
                            className={`cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors flex flex-col items-end ${
                              editingField?.id === `task-${task.task_id}` && editingField?.field === 'budget' ? 'bg-white/20 ring-2 ring-white/50' : ''
                            }`}
                            onClick={!readonly ? () => startEditing(`task-${task.task_id}`, 'budget', task.budget) : undefined}
                          >
                            <span className="text-[10px] text-white/80">Budget</span>
                            {editingField?.id === `task-${task.task_id}` && editingField?.field === 'budget' ? (
                              <div className="flex items-center space-x-1">
                                <span className="text-[10px] text-white/90">OMR</span>
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => handleKeyPress(e, { ...task, id: `task-${task.task_id}` }, 'budget')}
                                  onBlur={() => handleBlur({ ...task, id: `task-${task.task_id}` }, 'budget')}
                                  className="w-16 px-1 py-0.5 text-[10px] border border-white/30 rounded bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  autoFocus
                                  placeholder="0"
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-white">OMR {(task.budget || 0).toLocaleString()}</span>
                            )}
                          </div>
                          {/* Start Date - Clickable for editing */}
                          <div
                            className={`cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors flex flex-col items-end ${
                              editingField?.id === `task-${task.task_id}` && editingField?.field === 'start_date' ? 'bg-white/20 ring-2 ring-white/50' : ''
                            }`}
                            onClick={!readonly ? () => startEditing(`task-${task.task_id}`, 'start_date', task.start_date) : undefined}
                          >
                            <span className="text-[10px] text-white/80">Start</span>
                            {editingField?.id === `task-${task.task_id}` && editingField?.field === 'start_date' ? (
                              <input
                                type="date"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyPress(e, { ...task, id: `task-${task.task_id}` }, 'start_date')}
                                onBlur={() => handleBlur({ ...task, id: `task-${task.task_id}` }, 'start_date')}
                                className="w-20 px-1 py-0.5 text-[10px] border border-white/30 rounded bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white/50"
                                autoFocus
                              />
                            ) : (
                              <span className="text-xs text-white">{task.start_date ? new Date(task.start_date).toLocaleDateString() : '-'}</span>
                            )}
                          </div>
                          {/* End Date - Clickable for editing */}
                          <div
                            className={`cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors flex flex-col items-end ${
                              editingField?.id === `task-${task.task_id}` && editingField?.field === 'end_date' ? 'bg-white/20 ring-2 ring-white/50' : ''
                            }`}
                            onClick={!readonly ? () => startEditing(`task-${task.task_id}`, 'end_date', task.end_date) : undefined}
                          >
                            <span className="text-[10px] text-white/80">End</span>
                            {editingField?.id === `task-${task.task_id}` && editingField?.field === 'end_date' ? (
                              <input
                                type="date"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyPress(e, { ...task, id: `task-${task.task_id}` }, 'end_date')}
                                onBlur={() => handleBlur({ ...task, id: `task-${task.task_id}` }, 'end_date')}
                                className="w-20 px-1 py-0.5 text-[10px] border border-white/30 rounded bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white/50"
                                autoFocus
                              />
                            ) : (
                              <span className="text-xs text-white">{task.end_date ? new Date(task.end_date).toLocaleDateString() : '-'}</span>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-6">
                          <button
                            onClick={!readonly ? (e) => { e.stopPropagation(); handleDeleteClick({ id: `${task.task_id}`, type: 'task', name: task.name }); } : undefined}
                            className={`p-1 rounded-full bg-white/20 hover:bg-red-500/80 transition-colors${readonly ? ' opacity-50 cursor-not-allowed' : ''}`}
                            title="Delete Task"
                            disabled={readonly}
                          >
                            <Trash2 size={16} className="text-white" />
                          </button>
                          <button
                            className="p-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs flex items-center gap-1"
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
                            className="p-1 rounded bg-green-100 hover:bg-green-200 text-green-700 text-xs flex items-center gap-1"
                            onClick={!readonly ? () => handleOpenResourceModal(task) : undefined}
                            title="Assign Resource"
                            disabled={readonly}
                          >
                            <Users size={14} /> Resource
                          </button>
                          <button
                            className="p-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs flex items-center gap-1"
                            onClick={!readonly ? () => handleOpenDependencyModal(task) : undefined}
                            title="Manage Dependencies"
                            disabled={readonly}
                          >
                            <Link size={14} /> Dependencies
                          </button>
                        </div>
                      </div>
                      {/* Divider */}
                      <hr className="my-3 border-t border-white/30 w-full" />
                      {/* Team Members */}
                      {Array.isArray(task.user_assignments) && task.user_assignments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {task.user_assignments.map((assignment: any) => {
                            const user = assignment.user;
                            const initials = `${user.account.first_name?.[0] || ''}${user.account.last_name?.[0] || ''}`.toUpperCase();
                            return (
                              <div key={user.user_id} className="flex items-center bg-white/80 rounded-lg px-2 py-1 shadow text-gray-800">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-500 text-white font-bold mr-2 text-xs">
                                  {initials}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs leading-tight">{user.account.first_name} {user.account.last_name}</span>
                                  <span className="text-[10px] text-gray-500">{assignment.role || user.role?.name || 'Team Member'}</span>
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
                              <div key={assignment.id} className="flex items-center gap-2 bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-medium border border-green-300">
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-300 text-white font-bold">
                                  {initials}
                                </span>
                                <span>{resource.name}</span>
                                <span className="ml-1 text-green-600">({resource.type})</span>
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
    try {
      setCreatingWBS(true);

      // Validation: Check if level 1 already exists (root level)
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

        const allWBSItems = flattenWBS(wbsItems);
        const hasRootLevel = allWBSItems.some(
          (item: WBSItem) => item.level === 1
        );
        if (hasRootLevel) {
          toast.error("A Level 1 (Root) WBS already exists for this schedule. You can only have one root level.");
          return;
        }
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        level: formData.level,
        start_date: formData.start_date,
        end_date: formData.end_date,
        ...(formData.parent_wbs_id && {
          parent_wbs_id: formData.parent_wbs_id,
        }),
      };

      const token = localStorage.getItem("token");
      const response = await axios.post(`/api/schedules/${scheduleId}/wbs`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh WBS data
      await fetchWBSData();
      setShowWBSModal(false);
      toast.success("WBS item created successfully");
    } catch (error) {
      console.error("Failed to create WBS:", error);
      toast.error("Failed to create WBS item");
    } finally {
      setCreatingWBS(false);
    }
  };

  const createScheduleTask = async (formData: any) => {
    try {
      setCreatingTask(true);
      const token = localStorage.getItem("token");
      await axios.post(`/api/schedules/${scheduleId}/tasks`, {
        wbs_id: formData.wbs_id,
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        priority: formData.priority,
        estimated_hours: Number(formData.estimated_hours), // new
        is_milestone: formData.is_milestone, // new
        is_critical_path: formData.is_critical_path, // new
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchWBSData();
      setShowTaskModal(false);
      toast.success("Task created successfully");
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  // Fetch all users for the select
  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/schedules/${scheduleId}/team-members/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Available users response:", response.data);
      setAllUsers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch available users:", error);
      setAllUsers([]);
    }
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
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/schedules/${scheduleId}/resources/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableResources(response.data || []);
    } catch (error) {
      setAvailableResources([]);
    }
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
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/schedules/${scheduleId}/tasks/${resourceModalTask.task_id}/resource-assignments`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Resource assigned successfully');
      setShowResourceModal(false);
      setResourceModalTask(null);
      fetchWBSData();
    } catch (error) {
      toast.error('Failed to assign resource');
    }
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
  useEffect(() => {
    async function fetchApprovalsAndUser() {
      try {
        const token = localStorage.getItem('token');
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
        const approvalsRes = await axios.get(`/api/schedules/${scheduleId}/approval`, { headers: authHeader });
        setApprovals(approvalsRes.data);
        // If there are any approvals, set readonly
        setReadonly(approvalsRes.data.length > 0);
        // Fetch current user
        const userRes = await axios.get('/api/auth/me', { headers: authHeader });
        setCurrentUser(userRes.data.user);
        // Find if this user has a pending approval
        const pending = approvalsRes.data.find((a: any) => a.user_id === userRes.data.user.user_id && a.status === 'PENDING');
        setUserApproval(pending || null);
      } catch (e) {
        // ignore
      }
    }
    fetchApprovalsAndUser();
  }, [scheduleId]);

  // After fetching the schedule (which now includes approvals):
  useEffect(() => {
    async function fetchScheduleAndUser() {
      try {
        const token = localStorage.getItem('token');
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
        // Fetch schedule (with approvals)
        const scheduleRes = await axios.get(`/api/schedules/${scheduleId}`, { headers: authHeader });
        setSchedule(scheduleRes.data.schedule);
        // Fetch current user
        const userRes = await axios.get('/api/auth/me', { headers: authHeader });
        setCurrentUser(userRes.data.user);
        // Debug: log the data
        console.log('Schedule approvals:', scheduleRes.data.schedule.approvals);
        console.log('Current user:', userRes.data.user);
        // Find if this user has a pending approval
        const pending = scheduleRes.data.schedule.approvals?.find((a: any) => a.user_id === userRes.data.user.user_id && a.status === 'PENDING');
        console.log('Pending approval found:', pending);
        setUserApproval(pending || null);
        // Set readonly if there are any approvals
        setReadonly(scheduleRes.data.schedule.approvals?.length > 0);
      } catch (e) {
        console.error('Error fetching schedule and user:', e);
      }
    }
    fetchScheduleAndUser();
  }, [scheduleId]);

  // Handler for approve
  const handleApprove = async () => {
    if (!userApproval) return;
    try {
      const token = localStorage.getItem('token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`/api/schedules/${scheduleId}/approval/${userApproval.id}/approve`, {}, { headers: authHeader });
      toast.success('Approval granted!');
      // Refresh schedule and approvals
      const scheduleRes = await axios.get(`/api/schedules/${scheduleId}`, { headers: authHeader });
      setSchedule(scheduleRes.data.schedule);
      setUserApproval(null);
    } catch (e) {
      toast.error('Failed to approve');
    }
  };

  // Handler for reject
  const handleReject = async () => {
    if (!userApproval) return;
    try {
      const token = localStorage.getItem('token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`/api/schedules/${scheduleId}/approval/${userApproval.id}/reject`, {}, { headers: authHeader });
      toast.success('Approval rejected.');
      // Refresh schedule and approvals
      const scheduleRes = await axios.get(`/api/schedules/${scheduleId}`, { headers: authHeader });
      setSchedule(scheduleRes.data.schedule);
      setUserApproval(null);
    } catch (e) {
      toast.error('Failed to reject');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Schedule Details">
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!schedule) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Schedule Not Found">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Schedule Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">The schedule you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => router.push("/scheduler")} className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800">
              Back to Schedules
            </Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout title={schedule.name}>
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => router.push("/scheduler")}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{schedule.name}</h1>
                <p className="text-gray-600 dark:text-gray-400 truncate">{schedule.description}</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => setShowWBSModal(true)}
                disabled={readonly}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Add WBS
              </Button>
              <Button
                onClick={() => setShowTaskModal(true)}
                disabled={readonly}
                variant="outline"
                className="flex items-center gap-2 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Add Task
              </Button>
              <Button
                onClick={() => handleSubmitPlan()}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <CheckCircle size={16} />
                Submit Plan
              </Button>
            </div>
          </div>



          {/* Approval Section */}
          {userApproval && currentUser && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-blue-600" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Pending Approval Required</h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300">You have a pending approval for this schedule</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleApprove} variant="default" className="bg-green-600 hover:bg-green-700 text-white">
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
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* WBS Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-900/50">
                          <div className="space-y-4">
              {wbsItems.map(item => (
                <div key={item.id}>
                  {renderWBSItem(item)}
                </div>
              ))}
            </div>
            </div>
            
            {/* Team Members Column */}
            <div className="w-80 border-l border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto flex-shrink-0">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Team Members</h2>
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
                  onSubmit={async (data) => {
                    try {
                      const token = localStorage.getItem("token");
                      await axios.post(`/api/schedules/${scheduleId}/team-members`, {
                        resource_id: data.user_id,
                        role: data.role,
                        department: data.department,
                        workload: parseFloat(data.workload),
                        is_lead: data.is_lead === "true",
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      toast.success("Team member added successfully");
                      fetchTeamMembers();
                    } catch (error: any) {
                      toast.error(error.response?.data?.error || "Failed to add team member");
                    }
                  }}
                  triggerButton={
                    <Button className="w-full" size="sm" disabled={readonly}>
                      <Plus size={16} /> Add Team Member
                    </Button>
                  }
                />
                <div className="space-y-4">
                  {teamMembers.map(member => (
                    <Card key={member.team_member_id} className="cursor-pointer hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {member.user.account.first_name} {member.user.account.last_name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{member.role}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {member.is_lead && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                Lead
                              </Badge>
                            )}
                            {/* Delete Button */}
                            <button
                              onClick={!readonly ? (e) => {
                                e.stopPropagation();
                                handleDeleteClick({ 
                                  id: member.team_member_id.toString(), 
                                  type: 'team-member', 
                                  name: `${member.user.account.first_name} ${member.user.account.last_name}` 
                                });
                              } : undefined}
                              className={`p-1 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 transition-colors${readonly ? ' opacity-50 cursor-not-allowed' : ''}`}
                              title="Remove Team Member"
                              disabled={readonly}
                            >
                              <Trash2 size={14} className="text-gray-500" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Workload</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{member.workload}%</span>
                          </div>
                          <Progress value={member.workload} className="h-2" />
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                              {member.department}
                            </Badge>
                            <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                              @{member.user.username}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WBS Modal */}
        {showWBSModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <CreateScheduleWBSForm
                onClose={() => setShowWBSModal(false)}
                onSave={createScheduleWBS}
                schedule={schedule}
                creating={creatingWBS}
                wbsData={wbsItems}
              />
            </div>
          </div>
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
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 w-full max-w-md relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setShowAddTeamMemberModal(false)}>
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
                onClick={async () => {
                  setAddingMember(true);
                  try {
                    const token = localStorage.getItem("token");
                    await axios.post(`/api/schedules/${scheduleId}/team-members`, {
                      resource_id: selectedUserId,
                      role: "Team Member",
                      department: "General",
                      workload: 100,
                      is_lead: false,
                    }, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    toast.success("Team member added");
                    setShowAddTeamMemberModal(false);
                    setSelectedUserId("");
                    setAvailabilityStart("");
                    setAvailabilityEnd("");
                    fetchTeamMembers();
                  } catch (error) {
                    toast.error("Failed to add team member");
                  } finally {
                    setAddingMember(false);
                  }
                }}
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
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 w-full max-w-sm relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setShowAssignModal(false)}>
                <X size={20} />
              </button>
              <h2 className="text-lg font-bold mb-4">Assign Team Member</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Team Member</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  value={selectedAssignUser}
                  onChange={e => setSelectedAssignUser(e.target.value)}
                >
                  {teamMembers.filter(member =>
                    !(assigningTask.assigned_users || []).some((au: any) => (au.user_id || au.user?.user_id) === member.user_id)
                  ).map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user.account.first_name} {member.user.account.last_name} (@{member.user.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAssignModal(false)} disabled={assigning}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!selectedAssignUser) return;
                    setAssigning(true);
                    try {
                      const token = localStorage.getItem("token");
                      await axios.post(`/api/schedules/${scheduleId}/tasks/${assigningTask.task_id}/assign`, {
                        user_id: selectedAssignUser
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      toast.success("Team member assigned");
                      setShowAssignModal(false);
                      setAssigningTask(null);
                      setSelectedAssignUser("");
                      // Refresh WBS/tasks
                      fetchWBSData();
                    } catch (error: any) {
                      toast.error(error.response?.data?.error || "Failed to assign team member");
                    } finally {
                      setAssigning(false);
                    }
                  }}
                  disabled={!selectedAssignUser || assigning}
                >
                  {assigning ? <Loader2 size={16} className="animate-spin" /> : "Assign"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Confirm Delete
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
    </ProtectedRoute>
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Create New WBS Item
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add a custom work breakdown structure item to the schedule
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Form */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter WBS item name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Level
            </label>
            <select
              value={formData.level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  level: parseInt(e.target.value),
                })
              }
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value={1}>Level 1 (Root)</option>
              <option value={2}>Level 2 (Main Phase)</option>
              <option value={3}>Level 3</option>
              <option value={4}>Level 4</option>
            </select>
          </div>
        </div>

        {/* Parent WBS Selection - only show for levels > 1 */}
        {formData.level > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Parent WBS *
            </label>
            {availableParents.length === 0 ? (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  No Level {formData.level - 1} WBS items found. Please create a
                  Level {formData.level - 1} parent first.
                </p>
              </div>
            ) : (
              <select
                value={formData.parent_wbs_id || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parent_wbs_id: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select a parent WBS...</option>
                {availableParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter WBS item description"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>
        </div>


      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          disabled={creating}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
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
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
        <div
          className="fixed inset-0 flex items-center justify-center z-[10000]"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            style={{
              animation: "fadeIn 0.3s ease-out",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-4">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {errorPopup.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please correct and try again
                </p>
              </div>
              <button
                onClick={() =>
                  setErrorPopup((prev) => ({ ...prev, show: false }))
                }
                className="ml-auto p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {errorPopup.message}
            </p>
            <button
              onClick={() =>
                setErrorPopup((prev) => ({ ...prev, show: false }))
              }
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
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
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 pr-8">Create New Task</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Parent WBS *</label>
            <select
              name="wbs_id"
              value={formData.wbs_id}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select WBS...</option>
              {availableWBS.map(wbs => (
                <option key={wbs.id} value={wbs.id}>{wbs.title}</option>
              ))}
            </select>
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
            <select name="priority" value={formData.priority} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
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
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={handleSave} disabled={creating} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50">{creating ? 'Creating...' : 'Create Task'}</button>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
        // Fetch schedule details (to get creator and manager)
        const scheduleRes = await axios.get(`/api/schedules/${scheduleId}`, { headers: authHeader });
        const schedule = scheduleRes.data;
        // Fetch existing approvals
        const approvalsRes = await axios.get(`/api/schedules/${scheduleId}/approval`, { headers: authHeader });
        setExistingApprovals(approvalsRes.data);
        // Fetch all users
        const usersRes = await axios.get(`/api/users`, { headers: authHeader });
        const allUsers = usersRes.data;
        // Debug: log all users and their roles
        console.log('All users:', allUsers.map((u: any) => ({ id: u.user_id, username: u.username, role: u.role?.name })));
        // Case-insensitive, robust role matching
        const findRole = (user: any, role: string) => user.role?.name?.toLowerCase() === role;
        const usersByRoleObj: Record<string, any[]> = {
          FIN: allUsers.filter((u: any) => findRole(u, 'fin')),
          PJM: allUsers.filter((u: any) => findRole(u, 'pjm') || findRole(u, 'project manager')),
        };
        setUsersByRole(usersByRoleObj);
        setForm((f) => ({
          ...f,
          PJM: '',
          FIN: '',
        }));
      } catch (e) {
        toast.error('Failed to load schedule or users');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [open, scheduleId]);

  const handleChange = (role: string, userId: string) => {
    setForm((f) => ({ ...f, [role]: userId }));
  };

  const handleCreateApprovals = async () => {
    if (!form.PJM || !form.FIN) {
      toast.error('Please select a user for both PJM and Finance.');
      return;
    }
    setCreatingApprovals(true);
    try {
      const token = localStorage.getItem('token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      const userIds = [parseInt(form.PJM), parseInt(form.FIN)];
      const response = await axios.post(`/api/schedules/${scheduleId}/approval`, { userIds }, { headers: authHeader });
      toast.success(response.data.message || 'Approvals created!');
      // Refresh existing approvals
      const approvalsRes = await axios.get(`/api/schedules/${scheduleId}/approval`, { headers: authHeader });
      setExistingApprovals(approvalsRes.data);

      // Call onSuccess callback to refresh schedule data in parent
      if (onSuccess) {
        onSuccess();
      }

      // Close modal automatically after successful approval
      setTimeout(() => {
        onClose();
      }, 1000); // Small delay to show success message
    } catch (error: any) {
      toast.error('Failed to create approvals');
    } finally {
      setCreatingApprovals(false);
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Schedule Approvals</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Select approvers for this schedule</p>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        ) : (
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SCHEDULE_ROLES.map((role) => {
                const hasApproval = hasApprovalForRole(role.key);
                const existingApproval = getExistingApprovalForRole(role.key);
                const usersForRole = usersByRole[role.key] || [];
                return (
                  <div key={role.key} className={`rounded-lg p-5 flex flex-col gap-3 transition-all ${hasApproval ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700'}`}>
                    <label className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {role.label}
                      {hasApproval && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
                    </label>
                    {hasApproval ? (
                      <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{existingApproval?.user.account.first_name} {existingApproval?.user.account.last_name}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Already assigned</p>
                      </div>
                    ) : usersForRole.length === 0 ? (
                      <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
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
            <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCreateApprovals}
                disabled={creatingApprovals || existingApprovals.length >= 2 || !form.PJM || !form.FIN}
                className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-semibold transition-all transform ${
                  creatingApprovals || existingApprovals.length >= 2 || !form.PJM || !form.FIN
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105 shadow-lg'
                }`}
              >
                {creatingApprovals ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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