"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    Plus,
    Users,
    ArrowLeft,
    Trash2,
    CheckCircle,
    UserPlus,
    CheckSquare,
    ChevronDown,
    ChevronRight,
    Package,
    X,
    Edit,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { ProjectWithRelations, ProjectSetup } from "@/types/project";
import { AddEntityModal } from "@/components/AddEntityModal";
import { TeamUserSelect } from "@/components/TeamUserSelect";
import ResourceAssignmentModal from "@/components/scheduler/ResourceAssignmentModal";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { SearchableDropdown } from "@/components/form/SearchableDropdown";

// Helper to get WBS breadcrumb for a task
function getWBSBreadcrumb(task: any, wbsList: any[]): string {
    let wbsId: number | null = task.wbs_id;
    const path: string[] = [];
    while (typeof wbsId === "number") {
        const wbs = wbsList.find((w) => w.wbs_id === wbsId);
        if (!wbs) break;
        path.unshift(wbs.name);
        wbsId = wbs.parent_wbs_id;
    }
    return path.join(" / ");
}

const userColorScheme = {
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-500",
    light: "bg-blue-50 dark:bg-blue-900/10",
    border: "border-blue-200 dark:border-blue-800",
};
const resourceColorScheme = {
    gradient: "from-green-500 to-green-600",
    bg: "bg-green-500",
    light: "bg-green-50 dark:bg-green-900/10",
    border: "border-green-200 dark:border-green-800",
};

// Team member roles (app enum – exclude PJM and Admin)
const TEAM_MEMBER_ROLES = [
    "PMO", "FIN", "PROC", "ENG", "SITE", "QAQC", "IT", "DIR", "HR", "LEGAL", "SYSTEM",
];

const TeamResourcesPage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<ProjectWithRelations | null>(null);
    const [setup, setSetup] = useState<ProjectSetup | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showEditMemberModal, setShowEditMemberModal] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [isUpdatingMember, setIsUpdatingMember] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [resourceAssignmentModalOpen, setResourceAssignmentModalOpen] =
        useState(false);
    const [taskAssignments, setTaskAssignments] = useState<
        Record<number, any[]>
    >({});
    const [resourceAssignments, setResourceAssignments] = useState<
        Record<number, any[]>
    >({});
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string>("");
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [resources, setResources] = useState<any[]>([]);
    const [expandedSections, setExpandedSections] = useState<
        Record<string, { users: boolean; resources: boolean }>
    >({});
    const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>(
        {}
    );
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [addMemberForm, setAddMemberForm] = useState<{
        user_id: string;
        role: string;
        department: string;
        workload: string;
        is_lead: boolean;
    }>({
        user_id: "",
        role: "",
        department: "",
        workload: "100",
        is_lead: false,
    });
    const [memberSource, setMemberSource] = useState<"pmo" | "hr">("pmo");
    const [selectedHrEmployee, setSelectedHrEmployee] = useState<any>(null);
    const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
    const [memberSearchTerm, setMemberSearchTerm] = useState("");
    const [workloadAvailable, setWorkloadAvailable] = useState<number | null>(null);
    const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
    const [memberListOpen, setMemberListOpen] = useState(false);
    const departmentDropdownRef = useRef<HTMLDivElement>(null);
    const memberListRef = useRef<HTMLDivElement>(null);

    const { departments, loading: departmentsLoading } = useDepartments();
    const { employees, loading: employeesLoading } = useEmployees({ limit: 200 });

    const availableRoles = TEAM_MEMBER_ROLES;
    const filteredDepartments = useMemo(() => {
        if (!departmentSearchTerm.trim()) return departments;
        const term = departmentSearchTerm.toLowerCase();
        return departments.filter(
            (d: any) =>
                (d?.name ?? d?.label ?? "").toString().toLowerCase().includes(term)
        );
    }, [departments, departmentSearchTerm]);
    const getEmployeeFullName = (emp: any) =>
        [emp?.first_name, emp?.last_name].filter(Boolean).join(" ") ||
        [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") ||
        emp?.name ||
        "";
    const filteredEmployees = useMemo(() => {
        if (!memberSearchTerm.trim()) return employees;
        const term = memberSearchTerm.toLowerCase();
        return employees.filter((emp: any) => {
            const name = getEmployeeFullName(emp).toLowerCase();
            const email = (emp?.email ?? "").toLowerCase();
            const position = (emp?.position_title ?? "").toLowerCase();
            return name.includes(term) || email.includes(term) || position.includes(term);
        });
    }, [employees, memberSearchTerm]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const from = params.get("from");
            setShowNavButtons(from === "previous");
        }
    }, []);

    // Fetch current user info to get role
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const response = await axios.get("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.data && response.data.user) {
                    setCurrentUserId(response.data.user.user_id);
                    // Set user role
                    if (
                        response.data.user.role &&
                        response.data.user.role.name
                    ) {
                        const roleName =
                            response.data.user.role.name.toUpperCase();
                        setUserRole(roleName);
                        console.log("User role detected:", roleName);
                    } else {
                        console.log("No role found for user");
                    }
                }
            } catch (error) {
                console.error("Error fetching current user:", error);
            }
        };

        fetchCurrentUser();
    }, []);

    useEffect(() => {
        fetchProject();
        fetchSetupStatus();
        fetchResources();
    }, [projectId]);

    const fetchProject = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProject(res.data);
            setTeamMembers(res.data.team_members || []);
            // Fetch assignments for all tasks
            if (res.data.tasks) {
                for (const task of res.data.tasks) {
                    fetchTaskAssignments(task.task_id);
                    fetchResourceAssignments(task.task_id);
                }
            }
            setLoading(false);
        } catch (e) {
            setProject(null);
            setLoading(false);
        }
    };

    const fetchSetupStatus = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/projects/${projectId}/setup`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSetup(res.data);
        } catch (e) {
            setSetup(null);
        }
    };

    const fetchTaskAssignments = async (taskId: number) => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/tasks/${taskId}/assign`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTaskAssignments((prev) => ({ ...prev, [taskId]: res.data }));
        } catch (e) {
            setTaskAssignments((prev) => ({ ...prev, [taskId]: [] }));
        }
    };

    const fetchResourceAssignments = async (taskId: number) => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(
                `/api/tasks/${taskId}/resource-assignments`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setResourceAssignments((prev) => ({ ...prev, [taskId]: res.data }));
        } catch (e) {
            setResourceAssignments((prev) => ({ ...prev, [taskId]: [] }));
        }
    };

    const fetchResources = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/resources", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setResources(res.data.allResources || []);
        } catch (e) {
            setResources([]);
            toast.error("Failed to load resources");
        }
    };

    const handleAddUserAssignment = async (taskId: number, userId: number) => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `/api/tasks/${taskId}/assign`,
                {
                    user_ids: [userId],
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("User assigned to task");
            fetchTaskAssignments(taskId);
        } catch (e) {
            toast.error("Failed to assign user");
        }
    };

    const handleRemoveUserAssignment = async (
        taskId: number,
        userId: number
    ) => {
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/tasks/${taskId}/assign`, {
                data: { user_ids: [userId] },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            toast.success("User unassigned from task");
            fetchTaskAssignments(taskId);
        } catch (e) {
            toast.error("Failed to unassign user");
        }
    };

    const handleResourceAssignment = async (assignmentData: any) => {
        try {
            const token = localStorage.getItem("token");
            await axios.post("/api/resourceAssignments", assignmentData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Resource assigned successfully");
            fetchResourceAssignments(assignmentData.task_id);
            setResourceAssignmentModalOpen(false);
        } catch (error: any) {
            console.error("Error assigning resource:", error);
            if (error.response?.status === 400) {
                const errorData = error.response.data;

                // Handle specific backend validation errors
                if (errorData.reason === "resource_not_available") {
                    toast.error("Resource is not available for assignments");
                } else if (errorData.reason === "capacity_exceeded") {
                    toast.error(
                        "Resource capacity exceeded for this time period"
                    );
                } else if (errorData.conflictDetails) {
                    // Handle overlapping assignments
                    toast.error(
                        "Resource has conflicting assignments during this period"
                    );
                    if (
                        errorData.alternatives &&
                        errorData.alternatives.length > 0
                    ) {
                        toast.info(
                            `${errorData.alternatives.length} alternative resources available`
                        );
                    }
                } else if (errorData.details) {
                    // Handle planned hours vs required hours validation
                    if (
                        errorData.details.plannedHours &&
                        errorData.details.requiredHours
                    ) {
                        toast.error(
                            `Planned hours (${errorData.details.plannedHours}) exceed available time (${errorData.details.requiredHours} hours)`
                        );
                    } else if (errorData.details.capacity) {
                        toast.error(
                            `Resource capacity insufficient: ${errorData.details.capacity}h/day`
                        );
                    } else {
                        toast.error(
                            errorData.error ||
                                "Resource assignment validation failed"
                        );
                    }
                } else {
                    toast.error(
                        errorData.error || "Resource assignment failed"
                    );
                }

                // Handle alternative resource suggestions if available
                if (
                    errorData.alternatives &&
                    errorData.alternatives.length > 0
                ) {
                    console.log(
                        "Alternative resources:",
                        errorData.alternatives
                    );
                    toast.info(
                        `${errorData.alternatives.length} alternative resources suggested`
                    );
                }
            } else {
                // For other error types, extract the error message from backend response
                const errorMessage =
                    error.response?.data?.error || "Failed to assign resource";
                toast.error(errorMessage);
            }
        }
    };

    const handleAddTeamMember = async (userId: number) => {
        // Implement API call to add user to project team
        // After success, refetch project/teamMembers
        await fetchProject();
    };

    // Helper to toggle expand/collapse for a section
    const toggleSection = (taskId: number, section: "users" | "resources") => {
        setExpandedSections((prev) => ({
            ...prev,
            [taskId]: {
                users:
                    section === "users"
                        ? !prev[taskId]?.users
                        : prev[taskId]?.users ?? true,
                resources:
                    section === "resources"
                        ? !prev[taskId]?.resources
                        : prev[taskId]?.resources ?? true,
            },
        }));
    };

    // Helper to toggle expand/collapse for a task card
    const toggleTaskExpand = (taskId: number) => {
        setExpandedTasks((prev) => ({
            ...prev,
            [taskId]: !prev[taskId],
        }));
    };

    const fetchAllUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllUsers(res.data || []);
        } catch (e) {
            setAllUsers([]);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (showAddMemberModal) {
            fetchAllUsers();
        }
    }, [showAddMemberModal]);

    useEffect(() => {
        if (
            memberSource === "pmo" &&
            addMemberForm.user_id &&
            !selectedHrEmployee
        ) {
            const token = localStorage.getItem("token");
            if (!token) return;
            axios
                .get(`/api/users/workload?user_ids=${addMemberForm.user_id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => {
                    const list = Array.isArray(res.data) ? res.data : [];
                    const u = list.find(
                        (x: any) => x.user_id === parseInt(addMemberForm.user_id, 10)
                    );
                    if (u && typeof u.utilization_percentage === "number") {
                        setWorkloadAvailable(
                            Math.max(0, Math.round(100 - u.utilization_percentage))
                        );
                    } else {
                        setWorkloadAvailable(null);
                    }
                })
                .catch(() => setWorkloadAvailable(null));
        } else {
            setWorkloadAvailable(null);
        }
    }, [memberSource, addMemberForm.user_id, selectedHrEmployee]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (
                departmentDropdownRef.current &&
                !departmentDropdownRef.current.contains(target)
            ) {
                setDepartmentDropdownOpen(false);
            }
            if (
                memberListRef.current &&
                !memberListRef.current.contains(target)
            ) {
                setMemberListOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Only show users not already assigned as team members
    const availableUsers = allUsers.filter(
        (u) => !teamMembers.some((tm) => tm.user_id === u.user_id)
    );
    const filteredUsers =
        userSearchQuery.trim() === ""
            ? availableUsers
            : availableUsers.filter((user) => {
                  const fullName =
                      `${user.account.first_name} ${user.account.last_name}`.toLowerCase();
                  const email = user.email?.toLowerCase() || "";
                  const role = user.role?.name?.toLowerCase() || "";
                  const searchLower = userSearchQuery.toLowerCase();
                  return (
                      fullName.includes(searchLower) ||
                      email.includes(searchLower) ||
                      role.includes(searchLower)
                  );
              });

    const handleAddMemberFormChange = (field: string, value: any) => {
        setAddMemberForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddMemberFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addMemberForm.role || !addMemberForm.department.trim()) {
            toast.error("Please select Role and Department.");
            return;
        }
        setIsAddingMember(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Please log in.");
                return;
            }
            let userId: number;
            if (memberSource === "hr" && selectedHrEmployee) {
                const fromHrRes = await axios.post(
                    "/api/users/from-hr-employee",
                    {
                        idp_user_id:
                            selectedHrEmployee._id ?? selectedHrEmployee.id,
                        email: selectedHrEmployee.email,
                        first_name:
                            selectedHrEmployee.first_name ??
                            selectedHrEmployee.firstName,
                        last_name:
                            selectedHrEmployee.last_name ??
                            selectedHrEmployee.lastName,
                        department:
                            addMemberForm.department ||
                            selectedHrEmployee.department ||
                            "General",
                        role: addMemberForm.role,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                userId = fromHrRes.data.user_id;
            } else {
                if (!addMemberForm.user_id) {
                    toast.error("Please select a user.");
                    return;
                }
                userId = parseInt(addMemberForm.user_id, 10);
            }
            await axios.post(
                `/api/projects/${projectId}/assign`,
                {
                    user_id: userId,
                    role: addMemberForm.role,
                    department: addMemberForm.department,
                    workload: parseFloat(addMemberForm.workload),
                    is_lead: addMemberForm.is_lead,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("User added to team");
            await fetchProject();
            setShowAddMemberModal(false);
            setAddMemberForm({
                user_id: "",
                role: "",
                department: "",
                workload: "100",
                is_lead: false,
            });
            setMemberSource("pmo");
            setSelectedHrEmployee(null);
            setWorkloadAvailable(null);
            setMemberSearchTerm("");
            setDepartmentSearchTerm("");
        } catch (e: any) {
            console.error("Error adding team member:", e);
            const errorMessage =
                e.response?.data?.error || e.message || "Failed to add user";
            toast.error(errorMessage);
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleEditMemberFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMember) return;
        
        setIsUpdatingMember(true);
        try {
            const token = localStorage.getItem("token");
            await axios.patch(
                `/api/projects/${projectId}/assign`,
                {
                    user_id: editingMember.user_id,
                    role: addMemberForm.role,
                    department: addMemberForm.department,
                    workload: parseFloat(addMemberForm.workload),
                    is_lead: addMemberForm.is_lead,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success("Team member updated successfully");
            
            // Refresh the project data to show updated values
            await fetchProject();
            
            // Close modal and reset form
            setShowEditMemberModal(false);
            setEditingMember(null);
            setAddMemberForm({
                user_id: "",
                role: "",
                department: "",
                workload: "100",
                is_lead: false,
            });
        } catch (e: any) {
            console.error("Error updating team member:", e);
            const errorMessage =
                e.response?.data?.error || e.message || "Failed to update team member";
            toast.error(errorMessage);
        } finally {
            setIsUpdatingMember(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Team & Resources">
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">My Team</h1>
                </div>
                {/* Team Members List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden shadow">
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-400 text-white flex items-center justify-between rounded-t-xl">
                        <div className="flex items-center">
                            <Users className="mr-2" />
                            <h2 className="text-lg font-semibold">
                                Project Team
                            </h2>
                        </div>
                        {["PJM", "PMO", "ADMIN"].includes(userRole) && (
                            <button
                                onClick={() => setShowAddMemberModal(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-100 transition-colors font-semibold shadow"
                            >
                                <UserPlus size={18} />
                                <span>Add Team Member</span>
                            </button>
                        )}
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {teamMembers.map((tm) => (
                                <div
                                    key={tm.user_id}
                                    className="relative flex flex-col bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-blue-100 dark:border-blue-800"
                                >
                                    {/* Action buttons - only show for authorized roles */}
                                    {["PJM", "PMO", "ADMIN"].includes(userRole) && (
                                        <div className="absolute top-2 right-2 flex items-center space-x-1">
                                            <button
                                                onClick={() => {
                                                    setEditingMember(tm);
                                                    setAddMemberForm({
                                                        user_id: tm.user_id.toString(),
                                                        role: tm.role || "",
                                                        department: tm.department || "",
                                                        workload: (tm.workload || 0).toString(),
                                                        is_lead: tm.is_lead || false,
                                                    });
                                                    setShowEditMemberModal(true);
                                                }}
                                                disabled={deletingMemberId === tm.user_id}
                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Edit team member"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (
                                                        confirm(
                                                            `Are you sure you want to remove ${tm.user.account.first_name} ${tm.user.account.last_name} from the team?`
                                                        )
                                                    ) {
                                                        setDeletingMemberId(tm.user_id);
                                                        try {
                                                            const token =
                                                                localStorage.getItem(
                                                                    "token"
                                                                );
                                                            await axios.delete(
                                                                `/api/projects/${projectId}/assign`,
                                                                {
                                                                    data: {
                                                                        userIds: [
                                                                            tm.user_id,
                                                                        ],
                                                                    },
                                                                    headers: {
                                                                        Authorization: `Bearer ${token}`,
                                                                    },
                                                                }
                                                            );
                                                            toast.success(
                                                                "Team member removed successfully"
                                                            );
                                                            await fetchProject();
                                                        } catch (e: any) {
                                                            console.error(
                                                                "Error removing team member:",
                                                                e
                                                            );
                                                            const errorMessage =
                                                                e.response?.data
                                                                    ?.error ||
                                                                e.message ||
                                                                "Failed to remove team member";
                                                            toast.error(
                                                                errorMessage
                                                            );
                                                        } finally {
                                                            setDeletingMemberId(null);
                                                        }
                                                    }
                                                }}
                                                disabled={deletingMemberId === tm.user_id}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                                                title="Remove team member"
                                            >
                                                {deletingMemberId === tm.user_id ? (
                                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-red-500 border-t-transparent"></div>
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                    {/* Avatar with initials */}
                                    <div className="flex items-center mb-3">
                                        <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300 text-lg mr-3">
                                            {(() => {
                                                const first =
                                                    tm.user?.account
                                                        ?.first_name?.[0] || "";
                                                const last =
                                                    tm.user?.account
                                                        ?.last_name?.[0] || "";
                                                return (
                                                    first + last
                                                ).toUpperCase();
                                            })()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-blue-900 dark:text-blue-100 truncate">
                                                {tm.user.account.first_name}{" "}
                                                {tm.user.account.last_name}
                                            </div>
                                            <div className="text-xs text-blue-700 dark:text-blue-300 truncate">
                                                @{tm.user.username}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Role and Department */}
                                    {(tm.role || tm.department) && (
                                        <div className="mb-2 space-y-1">
                                            {tm.role && (
                                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                                    <span className="font-medium">
                                                        Role:
                                                    </span>{" "}
                                                    {tm.role}
                                                </div>
                                            )}
                                            {tm.department && (
                                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                                    <span className="font-medium">
                                                        Dept:
                                                    </span>{" "}
                                                    {tm.department}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* Workload */}
                                    <div className="mb-2">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                Workload:
                                            </span>
                                            <span className="text-blue-900 dark:text-blue-100 font-semibold">
                                                {tm.workload || 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${
                                                    (tm.workload || 0) > 90
                                                        ? "bg-red-500"
                                                        : (tm.workload || 0) >
                                                          75
                                                        ? "bg-yellow-500"
                                                        : "bg-green-500"
                                                }`}
                                                style={{
                                                    width: `${tm.workload || 0}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    {/* Lead badge */}
                                    {tm.is_lead && (
                                        <div className="mt-2">
                                            <span className="inline-flex items-center px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                                                <CheckCircle
                                                    size={12}
                                                    className="mr-1"
                                                />
                                                Team Lead
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {teamMembers.length === 0 && (
                                <div className="col-span-full text-center py-12">
                                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                                        No team members yet
                                    </p>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                                        Click "Add Team Member" to get started
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Flat Task List with Budget-Style Cards */}
                <h1 className="text-2xl font-bold mt-10 mb-2">Tasks</h1>
                <div className="space-y-4">
                    {project?.tasks?.map((task) => {
                        const isTaskExpanded =
                            expandedTasks[task.task_id] !== false;
                        const availableUsers = teamMembers.filter(
                            (tm) =>
                                !(taskAssignments[task.task_id] || []).some(
                                    (assn) => assn.user_id === tm.user_id
                                )
                        );
                        return (
                            <div key={task.task_id} className="mt-4">
                                <div className="rounded-xl overflow-hidden">
                                    {/* Task Header with Gradient */}
                                    <div
                                        className={`px-6 py-4 bg-gradient-to-r from-orange-400 to-orange-300 text-orange-900 relative overflow-hidden cursor-pointer`}
                                        onClick={() =>
                                            toggleTaskExpand(task.task_id)
                                        }
                                    >
                                        <div className="absolute inset-0 bg-white/10 opacity-20"></div>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
                                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-3 h-3 rounded-full bg-white"></div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-3 mb-1">
                                                        <h4 className="text-base font-bold text-white drop-shadow-sm">
                                                            {task.name}
                                                        </h4>
                                                        {task.is_milestone ? (
                                                            <span className="px-2 py-1 bg-yellow-500/30 backdrop-blur-sm text-yellow-200 rounded-full text-xs border border-yellow-400/50">
                                                                Milestone
                                                            </span>
                                                        ) : task.is_critical_path ? (
                                                            <span className="px-2 py-1 bg-red-500/30 backdrop-blur-sm text-red-200 rounded-full text-xs border border-red-400/50">
                                                                Critical
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs border border-white/30">
                                                                Task
                                                            </span>
                                                        )}
                                                        {task.is_milestone &&
                                                            task.is_critical_path && (
                                                                <span className="px-2 py-1 bg-red-500/30 backdrop-blur-sm text-red-200 rounded-full text-xs border border-red-400/50">
                                                                    Critical
                                                                </span>
                                                            )}
                                                    </div>
                                                    {/* WBS Breadcrumb */}
                                                    <div className="text-xs text-white/70 mt-1">
                                                        {getWBSBreadcrumb(
                                                            task,
                                                            project?.wbs || []
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                                                    {taskAssignments[
                                                        task.task_id
                                                    ]?.length || 0}{" "}
                                                    Users
                                                </span>
                                                <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                                    {resourceAssignments[
                                                        task.task_id
                                                    ]?.length || 0}{" "}
                                                    Resources
                                                </span>
                                                <button
                                                    className="ml-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
                                                    tabIndex={-1}
                                                >
                                                    {isTaskExpanded ? (
                                                        <ChevronDown
                                                            size={18}
                                                            className="text-blue-100"
                                                        />
                                                    ) : (
                                                        <ChevronRight
                                                            size={18}
                                                            className="text-blue-100"
                                                        />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Users/Resources Sections (only if expanded) */}
                                    {isTaskExpanded && (
                                        <>
                                            {/* Users Section */}
                                            <div
                                                style={{ marginLeft: 32 }}
                                                className="mt-2"
                                            >
                                                <div
                                                    className={`rounded-xl overflow-hidden shadow border ${userColorScheme.border} mb-2`}
                                                >
                                                    <div
                                                        className={`flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white cursor-pointer select-none`}
                                                        onClick={() =>
                                                            toggleSection(
                                                                task.task_id,
                                                                "users"
                                                            )
                                                        }
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <Users size={16} />
                                                            <span className="font-semibold">
                                                                Assigned Users
                                                            </span>
                                                        </div>
                                                        {expandedSections[
                                                            task.task_id
                                                        ]?.users !== false ? (
                                                            <ChevronDown
                                                                size={18}
                                                                className="text-white"
                                                            />
                                                        ) : (
                                                            <ChevronRight
                                                                size={18}
                                                                className="text-white"
                                                            />
                                                        )}
                                                    </div>
                                                    {expandedSections[
                                                        task.task_id
                                                    ]?.users !== false && (
                                                        <div className="p-4 bg-white dark:bg-gray-800">
                                                            <div className="flex justify-end mb-2 flex-col items-end">
                                                                {[
                                                                    "PJM",
                                                                    "PMO",
                                                                    "ADMIN",
                                                                ].includes(
                                                                    userRole
                                                                ) && (
                                                                    <AddEntityModal
                                                                        entityName="Task Assignment"
                                                                        fields={[
                                                                            {
                                                                                name: "user_id",
                                                                                label: "Team Member",
                                                                                type: "select",
                                                                                required:
                                                                                    true,
                                                                                options:
                                                                                    availableUsers.map(
                                                                                        (
                                                                                            tm
                                                                                        ) => {
                                                                                            const name = `${
                                                                                                tm.user?.account?.first_name || ""
                                                                                            } ${
                                                                                                tm.user?.account?.last_name || ""
                                                                                            }`.trim();
                                                                                            const username = tm.user?.username || "";
                                                                                            const role = tm.role || "";
                                                                                            const rolePart = role ? ` · ${role}` : "";
                                                                                            return {
                                                                                                value: tm.user_id.toString(),
                                                                                                label: `${name} (${username})${rolePart}`,
                                                                                            };
                                                                                        }
                                                                                    ),
                                                                            },
                                                                        ]}
                                                                        onSubmit={async (
                                                                            data
                                                                        ) => {
                                                                            await handleAddUserAssignment(
                                                                                task.task_id,
                                                                                parseInt(
                                                                                    data.user_id
                                                                                )
                                                                            );
                                                                        }}
                                                                        triggerButton={
                                                                            <button
                                                                                className={`flex items-center gap-2 px-3 py-1 rounded-lg font-medium shadow transition-colors
                                      ${
                                          availableUsers.length === 0
                                              ? "bg-blue-50 text-blue-300 opacity-60 cursor-not-allowed"
                                              : "bg-white hover:bg-blue-100 text-blue-600"
                                      }`}
                                                                                title="Assign User"
                                                                                disabled={
                                                                                    availableUsers.length ===
                                                                                    0
                                                                                }
                                                                                aria-disabled={
                                                                                    availableUsers.length ===
                                                                                    0
                                                                                }
                                                                            >
                                                                                <Plus
                                                                                    size={
                                                                                        18
                                                                                    }
                                                                                />
                                                                                <span>
                                                                                    Assign
                                                                                    User
                                                                                </span>
                                                                            </button>
                                                                        }
                                                                    />
                                                                )}
                                                                {availableUsers.length ===
                                                                    0 &&
                                                                    [
                                                                        "PJM",
                                                                        "PMO",
                                                                        "ADMIN",
                                                                    ].includes(
                                                                        userRole
                                                                    ) && (
                                                                        <div className="mt-2 text-xs text-blue-400 bg-blue-50 rounded px-3 py-1">
                                                                            No
                                                                            team
                                                                            members
                                                                            left
                                                                            to
                                                                            assign.
                                                                        </div>
                                                                    )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {(
                                                                    taskAssignments[
                                                                        task
                                                                            .task_id
                                                                    ] || []
                                                                ).length ===
                                                                0 ? (
                                                                    <div className="text-blue-400 bg-blue-50 rounded px-3 py-2 text-sm w-full text-center">
                                                                        No team
                                                                        members
                                                                        assigned
                                                                        to this
                                                                        task
                                                                        yet.
                                                                    </div>
                                                                ) : (
                                                                    (
                                                                        taskAssignments[
                                                                            task
                                                                                .task_id
                                                                        ] || []
                                                                    ).map(
                                                                        (
                                                                            assn
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    assn.user_id
                                                                                }
                                                                                className="flex items-center w-full bg-blue-50 dark:bg-blue-900/10 rounded-lg px-4 py-2 mb-2 shadow-sm"
                                                                            >
                                                                                {/* Avatar with initials */}
                                                                                <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700 text-base mr-3">
                                                                                    {(() => {
                                                                                        const first =
                                                                                            assn
                                                                                                .user
                                                                                                ?.account
                                                                                                ?.first_name?.[0] ||
                                                                                            "";
                                                                                        const last =
                                                                                            assn
                                                                                                .user
                                                                                                ?.account
                                                                                                ?.last_name?.[0] ||
                                                                                            "";
                                                                                        return (
                                                                                            first +
                                                                                            last
                                                                                        ).toUpperCase();
                                                                                    })()}
                                                                                </div>
                                                                                {/* User info and badge row */}
                                                                                <div className="flex flex-1 flex-row items-center min-w-0 gap-3">
                                                                                    {/* Info stacked */}
                                                                                    <div className="flex flex-col min-w-0">
                                                                                        <div className="font-semibold text-blue-900 truncate">
                                                                                            {
                                                                                                assn
                                                                                                    .user
                                                                                                    ?.account
                                                                                                    ?.first_name
                                                                                            }{" "}
                                                                                            {
                                                                                                assn
                                                                                                    .user
                                                                                                    ?.account
                                                                                                    ?.last_name
                                                                                            }
                                                                                        </div>
                                                                                        <div className="text-xs text-blue-700 truncate">
                                                                                            @
                                                                                            {
                                                                                                assn
                                                                                                    .user
                                                                                                    ?.username
                                                                                            }
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* Role badge vertically centered */}
                                                                                    {assn
                                                                                        .user
                                                                                        ?.role
                                                                                        ?.name && (
                                                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-base rounded-full font-semibold whitespace-nowrap self-center ml-4 min-w-[80px] text-center">
                                                                                            {
                                                                                                assn
                                                                                                    .user
                                                                                                    .role
                                                                                                    .name
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {/* Remove icon */}
                                                                                {[
                                                                                    "PJM",
                                                                                    "PMO",
                                                                                    "ADMIN",
                                                                                ].includes(
                                                                                    userRole
                                                                                ) && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleRemoveUserAssignment(
                                                                                                task.task_id,
                                                                                                assn.user_id
                                                                                            )
                                                                                        }
                                                                                        className="ml-4 text-red-500 hover:text-red-700 p-2 rounded-full transition-colors"
                                                                                        title="Remove"
                                                                                    >
                                                                                        <Trash2
                                                                                            size={
                                                                                                16
                                                                                            }
                                                                                        />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Resources Section */}
                                            <div
                                                style={{ marginLeft: 32 }}
                                                className="mb-4"
                                            >
                                                <div
                                                    className={`rounded-xl overflow-hidden shadow border ${resourceColorScheme.border} mb-2`}
                                                >
                                                    <div
                                                        className={`flex items-center justify-between px-4 py-2 bg-gradient-to-r from-green-500 to-green-400 text-white cursor-pointer select-none`}
                                                        onClick={() =>
                                                            toggleSection(
                                                                task.task_id,
                                                                "resources"
                                                            )
                                                        }
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <Package
                                                                size={16}
                                                            />
                                                            <span className="font-semibold">
                                                                Assigned
                                                                Resources
                                                            </span>
                                                        </div>
                                                        {expandedSections[
                                                            task.task_id
                                                        ]?.resources !==
                                                        false ? (
                                                            <ChevronDown
                                                                size={18}
                                                                className="text-white"
                                                            />
                                                        ) : (
                                                            <ChevronRight
                                                                size={18}
                                                                className="text-white"
                                                            />
                                                        )}
                                                    </div>
                                                    {expandedSections[
                                                        task.task_id
                                                    ]?.resources !== false && (
                                                        <div className="p-4 bg-white dark:bg-gray-800">
                                                            <div className="flex justify-end mb-2 flex-col items-end">
                                                                {[
                                                                    "PJM",
                                                                    "PMO",
                                                                    "ADMIN",
                                                                ].includes(
                                                                    userRole
                                                                ) && (
                                                                    <button
                                                                        className="flex items-center gap-2 px-3 py-1 rounded-lg font-medium shadow transition-colors bg-white hover:bg-green-100 text-green-600"
                                                                        title="Assign Resource"
                                                                        disabled={
                                                                            false
                                                                        }
                                                                        aria-disabled={
                                                                            false
                                                                        }
                                                                        onClick={() => {
                                                                            setSelectedTask(
                                                                                task
                                                                            );
                                                                            setResourceAssignmentModalOpen(
                                                                                true
                                                                            );
                                                                        }}
                                                                    >
                                                                        <Plus
                                                                            size={
                                                                                18
                                                                            }
                                                                        />
                                                                        <span>
                                                                            Assign
                                                                            Resource
                                                                        </span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {(
                                                                    resourceAssignments[
                                                                        task
                                                                            .task_id
                                                                    ] || []
                                                                ).length ===
                                                                0 ? (
                                                                    <div className="text-green-400 bg-green-50 rounded px-3 py-2 text-sm w-full text-center">
                                                                        No
                                                                        resources
                                                                        assigned
                                                                        to this
                                                                        task
                                                                        yet.
                                                                    </div>
                                                                ) : (
                                                                    (
                                                                        resourceAssignments[
                                                                            task
                                                                                .task_id
                                                                        ] || []
                                                                    ).map(
                                                                        (
                                                                            assn
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    assn.assignment_id
                                                                                }
                                                                                className="flex items-center w-full bg-green-50 dark:bg-green-900/10 rounded-lg px-4 py-2 mb-2 shadow-sm"
                                                                            >
                                                                                {/* Info and badge row */}
                                                                                <div className="flex flex-1 flex-row items-center min-w-0 gap-3">
                                                                                    {/* Info stacked */}
                                                                                    <div className="flex flex-col min-w-0">
                                                                                        <div className="font-semibold text-green-900 truncate">
                                                                                            {
                                                                                                assn
                                                                                                    .resource
                                                                                                    ?.name
                                                                                            }
                                                                                        </div>
                                                                                        <div className="flex gap-6 text-xs text-green-800">
                                                                                            <span>
                                                                                                Allocation:{" "}
                                                                                                <span className="font-bold">
                                                                                                    {
                                                                                                        assn.allocation_percentage
                                                                                                    }

                                                                                                    %
                                                                                                </span>
                                                                                            </span>
                                                                                            <span>
                                                                                                Planned:{" "}
                                                                                                <span className="font-bold">
                                                                                                    {
                                                                                                        assn.planned_hours
                                                                                                    }

                                                                                                    h
                                                                                                </span>
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* Badge vertically centered */}
                                                                                    {assn
                                                                                        .resource
                                                                                        ?.type && (
                                                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-sm rounded-full font-medium whitespace-nowrap self-center ml-4 min-w-[100px] text-center">
                                                                                            {
                                                                                                assn
                                                                                                    .resource
                                                                                                    .type
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {/* Remove icon */}
                                                                                {[
                                                                                    "PJM",
                                                                                    "PMO",
                                                                                    "ADMIN",
                                                                                ].includes(
                                                                                    userRole
                                                                                ) && (
                                                                                    <button
                                                                                        onClick={async () => {
                                                                                            const token =
                                                                                                localStorage.getItem(
                                                                                                    "token"
                                                                                                );
                                                                                            await axios.delete(
                                                                                                `/api/resourceAssignments/${assn.assignment_id}`,
                                                                                                {
                                                                                                    headers:
                                                                                                        {
                                                                                                            Authorization: `Bearer ${token}`,
                                                                                                        },
                                                                                                }
                                                                                            );
                                                                                            toast.success(
                                                                                                "Resource unassigned"
                                                                                            );
                                                                                            fetchResourceAssignments(
                                                                                                task.task_id
                                                                                            );
                                                                                        }}
                                                                                        className="ml-4 text-red-500 hover:text-red-700 p-2 rounded-full transition-colors"
                                                                                        title="Remove"
                                                                                    >
                                                                                        <Trash2
                                                                                            size={
                                                                                                16
                                                                                            }
                                                                                        />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Navigation Buttons */}
                {showNavButtons && (
                    <div className="mt-8 flex justify-between">
                        <button
                            onClick={() =>
                                router.push(`/projects/${projectId}/setup`)
                            }
                            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Setup</span>
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const token = localStorage.getItem("token");
                                    await axios.patch(
                                        `/api/projects/${projectId}/setup`,
                                        { team: true },
                                        {
                                            headers: {
                                                "Content-Type":
                                                    "application/json",
                                                Authorization: `Bearer ${token}`,
                                            },
                                        }
                                    );
                                    router.push(
                                        `/projects/${projectId}/risk?from=previous`
                                    );
                                } catch (error) {
                                    toast.error(
                                        "Failed to mark team step as complete."
                                    );
                                }
                            }}
                            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <span>Next: Risk Management</span>
                            <Plus size={16} />
                        </button>
                    </div>
                )}
            </div>
            {/* Add Team Member Modal */}
            {showAddMemberModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xl"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAddMemberModal(false);
                            setMemberSource("pmo");
                            setSelectedHrEmployee(null);
                            setWorkloadAvailable(null);
                            setMemberSearchTerm("");
                            setDepartmentSearchTerm("");
                        }
                    }}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 border border-white/20 dark:border-gray-700/50 relative">
                        <button
                            onClick={() => {
                                setShowAddMemberModal(false);
                                setMemberSource("pmo");
                                setSelectedHrEmployee(null);
                                setWorkloadAvailable(null);
                                setMemberSearchTerm("");
                                setDepartmentSearchTerm("");
                            }}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <X size={22} />
                        </button>
                        <div className="flex items-center mb-8">
                            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-3">
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Add New Team Member
                            </h2>
                        </div>
                        <form
                            onSubmit={handleAddMemberFormSubmit}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-2 gap-6">
                                <div className="group col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        User
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-1 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMemberSource("pmo");
                                                setSelectedHrEmployee(null);
                                                handleAddMemberFormChange("user_id", "");
                                                setWorkloadAvailable(null);
                                            }}
                                            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                                                memberSource === "pmo"
                                                    ? "bg-orange-600 text-white"
                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                            }`}
                                        >
                                            From PMO
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMemberSource("hr");
                                                handleAddMemberFormChange("user_id", "");
                                                setWorkloadAvailable(null);
                                            }}
                                            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                                                memberSource === "hr"
                                                    ? "bg-orange-600 text-white"
                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                            }`}
                                        >
                                            From HR
                                        </button>
                                    </div>
                                    {memberSource === "pmo" ? (
                                        <TeamUserSelect
                                            users={availableUsers}
                                            value={addMemberForm.user_id}
                                            onChange={(val) => {
                                                handleAddMemberFormChange("user_id", val);
                                                const u = availableUsers.find(
                                                    (x) => x.user_id.toString() === val
                                                );
                                                if (u?.account?.department)
                                                    handleAddMemberFormChange(
                                                        "department",
                                                        u.account.department
                                                    );
                                            }}
                                            placeholder="Select a user..."
                                        />
                                    ) : (
                                        <div className="relative" ref={memberListRef}>
                                            <input
                                                type="text"
                                                placeholder="Search by name, email, or position..."
                                                value={memberSearchTerm}
                                                onChange={(e) => {
                                                    setMemberSearchTerm(e.target.value);
                                                    setMemberListOpen(true);
                                                }}
                                                onFocus={() => setMemberListOpen(true)}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white"
                                            />
                                            {selectedHrEmployee && (
                                                <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                                                    Selected: {getEmployeeFullName(selectedHrEmployee)} (
                                                    {selectedHrEmployee.email})
                                                </div>
                                            )}
                                            {memberListOpen && !employeesLoading && filteredEmployees.length > 0 && (
                                                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border rounded-lg shadow-lg">
                                                    {filteredEmployees.slice(0, 20).map((emp: any) => (
                                                        <button
                                                            key={emp?._id ?? emp?.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedHrEmployee(emp);
                                                                const dept =
                                                                    emp?.department_title ?? "";
                                                                handleAddMemberFormChange(
                                                                    "department",
                                                                    dept
                                                                );
                                                                setMemberListOpen(false);
                                                            }}
                                                            className="w-full flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                        >
                                                            {getEmployeeFullName(emp)} •{" "}
                                                            {emp?.email ?? ""}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Workload (%)
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={addMemberForm.workload}
                                        onChange={(e) =>
                                            handleAddMemberFormChange(
                                                "workload",
                                                e.target.value
                                            )
                                        }
                                        required
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                                        placeholder="100"
                                    />
                                    {workloadAvailable != null && memberSource === "pmo" && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Available: {workloadAvailable}%
                                        </p>
                                    )}
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Role
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={addMemberForm.role}
                                        onChange={(e) =>
                                            handleAddMemberFormChange(
                                                "role",
                                                e.target.value
                                            )
                                        }
                                        required
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    >
                                        <option value="">Select role...</option>
                                        {availableRoles.map((name) => (
                                            <option key={name} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="group" ref={departmentDropdownRef}>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Department
                                        <span className="text-red-500">*</span>
                                    </label>
                                    {memberSource === "hr" ? (
                                        <div className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                            {addMemberForm.department || "—"}
                                        </div>
                                    ) : (
                                        <SearchableDropdown
                                            value={addMemberForm.department}
                                            searchTerm={departmentSearchTerm}
                                            showDropdown={departmentDropdownOpen}
                                            filteredItems={filteredDepartments}
                                            displayValue={
                                                departmentSearchTerm !== ""
                                                    ? departmentSearchTerm
                                                    : addMemberForm.department
                                            }
                                            onSearchChange={(v) => {
                                                setDepartmentSearchTerm(v);
                                                setDepartmentDropdownOpen(true);
                                            }}
                                            onFocus={() =>
                                                setDepartmentDropdownOpen(true)
                                            }
                                            onSelect={(d: any) => {
                                                const name =
                                                    d?.name ?? d?.label ?? "";
                                                handleAddMemberFormChange(
                                                    "department",
                                                    name
                                                );
                                                setDepartmentSearchTerm("");
                                                setDepartmentDropdownOpen(false);
                                            }}
                                            onClear={() => {
                                                handleAddMemberFormChange(
                                                    "department",
                                                    ""
                                                );
                                                setDepartmentSearchTerm("");
                                                setDepartmentDropdownOpen(true);
                                            }}
                                            renderItem={(d: any) =>
                                                d?.name ?? d?.label ?? ""
                                            }
                                            getItemKey={(d: any) =>
                                                d?.id ?? d?.unit_id ?? d?.name ?? ""
                                            }
                                            placeholder={
                                                departmentsLoading
                                                    ? "Loading..."
                                                    : "Search or select department"
                                            }
                                            disabled={departmentsLoading}
                                            className="w-full px-4 py-3 border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 focus:ring-orange-500"
                                        />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-8">
                                    <input
                                        type="checkbox"
                                        checked={addMemberForm.is_lead}
                                        onChange={(e) =>
                                            handleAddMemberFormChange(
                                                "is_lead",
                                                e.target.checked
                                            )
                                        }
                                        className="accent-orange-500 w-5 h-5 cursor-pointer"
                                        id="is_lead"
                                    />
                                    <label
                                        htmlFor="is_lead"
                                        className="text-sm text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                                    >
                                        Set as Team Lead
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddMemberModal(false);
                                        setMemberSource("pmo");
                                        setSelectedHrEmployee(null);
                                        setWorkloadAvailable(null);
                                        setMemberSearchTerm("");
                                        setDepartmentSearchTerm("");
                                    }}
                                    className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 border border-gray-200 dark:border-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAddingMember || (memberSource === "hr" && !selectedHrEmployee)}
                                    className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                    <span className="relative flex items-center justify-center space-x-2">
                                        {isAddingMember && (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        )}
                                        <span>{isAddingMember ? "Adding..." : "Add"}</span>
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Team Member Modal */}
            {showEditMemberModal && editingMember && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xl"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowEditMemberModal(false);
                            setEditingMember(null);
                        }
                    }}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 border border-white/20 dark:border-gray-700/50 relative">
                        <button
                            onClick={() => {
                                setShowEditMemberModal(false);
                                setEditingMember(null);
                                setAddMemberForm({
                                    user_id: "",
                                    role: "",
                                    department: "",
                                    workload: "100",
                                    is_lead: false,
                                });
                            }}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <X size={22} />
                        </button>
                        <div className="flex items-center mb-8">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                                <Edit className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Edit Team Member
                            </h2>
                        </div>
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Editing: <span className="font-semibold text-gray-900 dark:text-white">
                                    {editingMember.user.account.first_name} {editingMember.user.account.last_name}
                                </span>
                            </p>
                        </div>
                        <form
                            onSubmit={handleEditMemberFormSubmit}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Workload (%)
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={addMemberForm.workload}
                                        onChange={(e) =>
                                            handleAddMemberFormChange(
                                                "workload",
                                                e.target.value
                                            )
                                        }
                                        required
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                        placeholder="100"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Role
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={addMemberForm.role}
                                        onChange={(e) =>
                                            handleAddMemberFormChange(
                                                "role",
                                                e.target.value
                                            )
                                        }
                                        required
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                        placeholder="e.g. Developer"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Department
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={addMemberForm.department}
                                        onChange={(e) =>
                                            handleAddMemberFormChange(
                                                "department",
                                                e.target.value
                                            )
                                        }
                                        required
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                        placeholder="e.g. Engineering"
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-8">
                                    <input
                                        type="checkbox"
                                        checked={addMemberForm.is_lead}
                                        onChange={(e) =>
                                            handleAddMemberFormChange("is_lead", e.target.checked)
                                        }
                                        className="accent-blue-500 w-5 h-5 cursor-pointer"
                                        id="is_lead_edit"
                                    />
                                    <label
                                        htmlFor="is_lead_edit"
                                        className="text-sm text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                                    >
                                        Set as Team Lead
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditMemberModal(false);
                                        setEditingMember(null);
                                        setAddMemberForm({
                                            user_id: "",
                                            role: "",
                                            department: "",
                                            workload: "100",
                                            is_lead: false,
                                        });
                                    }}
                                    className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 border border-gray-200 dark:border-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingMember}
                                    className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                    <span className="relative flex items-center justify-center space-x-2">
                                        {isUpdatingMember && (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        )}
                                        <span>{isUpdatingMember ? "Updating..." : "Update"}</span>
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Resource Assignment Modal (reuse from schedule page) */}
            {resourceAssignmentModalOpen && selectedTask && (
                <ResourceAssignmentModal
                    task={selectedTask}
                    resources={resources}
                    existingAssignments={
                        resourceAssignments[selectedTask.task_id] || []
                    }
                    onClose={() => setResourceAssignmentModalOpen(false)}
                    onSave={handleResourceAssignment}
                />
            )}
        </DashboardLayout>
    );
};

export default TeamResourcesPage;
