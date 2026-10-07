"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    Plus,
    Users,
    ArrowLeft,
    Trash2,
    UserPlus,
    ChevronDown,
    ChevronRight,
    Package,
    X,
    Edit,
    ListChecks,
    Gauge,
    AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { ProjectWithRelations, ProjectSetup } from "@/types/project";
import { AddEntityModal } from "@/components/AddEntityModal";
import { TeamUserSelect } from "@/components/TeamUserSelect";
import ResourceAssignmentModal from "@/components/scheduler/ResourceAssignmentModal";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Dropdown } from "@/components/ui/dropdown";
import { UserAvatar } from "@/components/ui/person-cell";
import { StatusBadge, inputClass } from "@/components/ui/form-shell";
import { Modal } from "@/components/ui/modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    EntityCard,
    EntityCardFooter,
    EntityProgress,
    StatGrid,
    StatTile,
} from "@/components/ui/entity-card";

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

// Team member roles (app enum – exclude PJM and Admin)
const TEAM_MEMBER_ROLES = [
    "PMO", "FIN", "PROC", "ENG", "SITE", "QAQC", "IT", "DIR", "HR", "LEGAL", "SYSTEM",
];

const TeamResourcesPage = () => {
    const params = useParams();
    const router = useRouter();
    const confirm = useConfirm();
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
    const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>(
        {}
    );
    const [showAllTasks, setShowAllTasks] = useState(false);
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
    const [memberListOpen, setMemberListOpen] = useState(false);
    const memberListRef = useRef<HTMLDivElement>(null);

    const { departments, loading: departmentsLoading } = useDepartments();
    const { employees, loading: employeesLoading } = useEmployees({ limit: 200 });

    const availableRoles = TEAM_MEMBER_ROLES;
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
                    <Spinner size={64} className="text-bright-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const canManageTeam = ["PJM", "PMO", "ADMIN"].includes(userRole);
    const avgWorkload = teamMembers.length
        ? Math.round(
              teamMembers.reduce((sum, tm) => sum + (tm.workload || 0), 0) /
                  teamMembers.length
          )
        : 0;
    const overloadedCount = teamMembers.filter(
        (tm) => (tm.workload || 0) > 90
    ).length;
    const tasksWithAssignments = (project?.tasks || []).filter(
        (task) =>
            (taskAssignments[task.task_id]?.length || 0) > 0 ||
            (resourceAssignments[task.task_id]?.length || 0) > 0
    );
    const visibleTasks = showAllTasks
        ? project?.tasks || []
        : tasksWithAssignments;

    return (
        <DashboardLayout title="Team & Resources">
            <div className="space-y-6">
                {canManageTeam && (
                    <div className="flex items-center justify-end">
                        <button
                            onClick={() => setShowAddMemberModal(true)}
                            className="flex items-center gap-2 rounded-lg bg-bright px-4 py-2 font-semibold text-white shadow transition-colors hover:bg-bright-deep"
                        >
                            <UserPlus size={18} />
                            <span>Add Team Member</span>
                        </button>
                    </div>
                )}

                <StatGrid>
                    <StatTile
                        label="Team Size"
                        value={teamMembers.length}
                        icon={<Users className="h-5 w-5" />}
                        tone="brand"
                    />
                    <StatTile
                        label="Avg Workload"
                        value={`${avgWorkload}%`}
                        icon={<Gauge className="h-5 w-5" />}
                        tone={
                            avgWorkload > 90
                                ? "danger"
                                : avgWorkload > 75
                                ? "warning"
                                : "success"
                        }
                    />
                    <StatTile
                        label="Overloaded"
                        value={overloadedCount}
                        hint="Members over 90% workload"
                        icon={<AlertTriangle className="h-5 w-5" />}
                        tone={overloadedCount > 0 ? "danger" : "neutral"}
                    />
                    <StatTile
                        label="Staffed Tasks"
                        value={`${tasksWithAssignments.length}/${project?.tasks?.length || 0}`}
                        icon={<ListChecks className="h-5 w-5" />}
                        tone="neutral"
                    />
                </StatGrid>

                {/* Team roster */}
                <div>
                    <h2 className="mb-3 text-[15px] font-semibold text-ink">
                        Project Team
                    </h2>
                    {teamMembers.length === 0 ? (
                        <div className="rounded-[14px] border border-dashed border-line bg-surface px-6 py-12 text-center">
                            <Users className="mx-auto mb-4 h-12 w-12 text-faint" />
                            <p className="mb-1 text-[14px] text-muted">
                                No team members yet
                            </p>
                            <p className="text-[13px] text-faint">
                                Click "Add Team Member" to get started
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {teamMembers.map((tm) => (
                                <EntityCard key={tm.user_id}>
                                    <div className="mb-3 flex items-start gap-3">
                                        <UserAvatar
                                            name={`${tm.user?.account?.first_name || ""} ${tm.user?.account?.last_name || ""}`}
                                            className="h-11 w-11 text-[15px]"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-[14.5px] font-semibold text-ink">
                                                    {tm.user.account.first_name}{" "}
                                                    {tm.user.account.last_name}
                                                </p>
                                                {tm.is_lead && (
                                                    <StatusBadge label="Lead" tone="success" />
                                                )}
                                            </div>
                                            <p className="truncate text-[12px] text-muted">
                                                @{tm.user.username}
                                            </p>
                                        </div>
                                    </div>

                                    {(tm.role || tm.department) && (
                                        <p className="mb-3 truncate text-[12.5px] text-muted">
                                            {[tm.role, tm.department]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>
                                    )}

                                    <EntityProgress
                                        label="Workload"
                                        value={tm.workload || 0}
                                        tone={
                                            (tm.workload || 0) > 90
                                                ? "danger"
                                                : (tm.workload || 0) > 75
                                                ? "warning"
                                                : "success"
                                        }
                                    />

                                    {canManageTeam && (
                                        <EntityCardFooter
                                            actions={
                                                <>
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
                                                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                                                        title="Edit team member"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (
                                                                await confirm({
                                                                    title: "Remove team member?",
                                                                    message: `${tm.user.account.first_name} ${tm.user.account.last_name} will lose access to this project.`,
                                                                    confirmText: "Remove",
                                                                    tone: "danger",
                                                                })
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
                                                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                                                        title="Remove team member"
                                                    >
                                                        {deletingMemberId === tm.user_id ? (
                                                            <Spinner size={12} />
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
                                                    </button>
                                                </>
                                            }
                                        />
                                    )}
                                </EntityCard>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tasks & assignments */}
                <div className="mt-10">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-[15px] font-semibold text-ink">
                            Task Assignments
                        </h2>
                        {(project?.tasks?.length || 0) > tasksWithAssignments.length && (
                            <button
                                type="button"
                                onClick={() => setShowAllTasks((v) => !v)}
                                className="text-[13px] font-medium text-bright transition-colors hover:text-bright-deep"
                            >
                                {showAllTasks
                                    ? "Show only staffed tasks"
                                    : `Show all tasks (${project?.tasks?.length || 0})`}
                            </button>
                        )}
                    </div>
                    {visibleTasks.length === 0 ? (
                        <div className="rounded-[14px] border border-dashed border-line bg-surface px-6 py-12 text-center">
                            <ListChecks className="mx-auto mb-4 h-12 w-12 text-faint" />
                            <p className="text-[14px] text-muted">
                                No tasks have users or resources assigned yet.
                            </p>
                        </div>
                    ) : (
                <div className="space-y-3">
                    {visibleTasks.map((task) => {
                        const isTaskExpanded =
                            expandedTasks[task.task_id] !== false;
                        const availableUsers = teamMembers.filter(
                            (tm) =>
                                !(taskAssignments[task.task_id] || []).some(
                                    (assn) => assn.user_id === tm.user_id
                                )
                        );
                        return (
                            <div
                                key={task.task_id}
                                className="rounded-[14px] border border-line bg-surface shadow-card overflow-hidden"
                            >
                                <div className="overflow-hidden">
                                    {/* Task Header */}
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-2"
                                        onClick={() =>
                                            toggleTaskExpand(task.task_id)
                                        }
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                                <h4 className="text-[14px] font-semibold text-ink">
                                                    {task.name}
                                                </h4>
                                                {task.is_milestone && (
                                                    <StatusBadge label="Milestone" tone="warning" />
                                                )}
                                                {task.is_critical_path && (
                                                    <StatusBadge label="Critical" tone="danger" />
                                                )}
                                            </div>
                                            <div className="text-[12px] text-muted">
                                                {getWBSBreadcrumb(
                                                    task,
                                                    project?.wbs || []
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            <span className="text-[11.5px] text-muted">
                                                {taskAssignments[task.task_id]?.length || 0}{" "}
                                                {taskAssignments[task.task_id]?.length === 1
                                                    ? "User"
                                                    : "Users"}
                                            </span>
                                            <span className="text-[11.5px] text-muted">
                                                {resourceAssignments[task.task_id]?.length || 0}{" "}
                                                {resourceAssignments[task.task_id]?.length === 1
                                                    ? "Resource"
                                                    : "Resources"}
                                            </span>
                                            {isTaskExpanded ? (
                                                <ChevronDown size={18} className="text-faint" />
                                            ) : (
                                                <ChevronRight size={18} className="text-faint" />
                                            )}
                                        </div>
                                    </button>
                                    {/* Users/Resources Sections (only if expanded) */}
                                    {isTaskExpanded && (
                                        <div className="space-y-4 border-t border-line-2 px-5 py-4">
                                            {/* Assigned Users */}
                                            <div>
                                                <div className="mb-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-faint">
                                                        <Users size={13} />
                                                        <span>Assigned Users</span>
                                                    </div>
                                                    {canManageTeam && (
                                                        <AddEntityModal
                                                            entityName="Task Assignment"
                                                            fields={[
                                                                {
                                                                    name: "user_id",
                                                                    label: "Team Member",
                                                                    type: "select",
                                                                    required: true,
                                                                    options: availableUsers.map((tm) => {
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
                                                                    }),
                                                                },
                                                            ]}
                                                            onSubmit={async (data) => {
                                                                await handleAddUserAssignment(
                                                                    task.task_id,
                                                                    parseInt(data.user_id)
                                                                );
                                                            }}
                                                            triggerButton={
                                                                <button
                                                                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-bright transition-colors hover:bg-bright-soft disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent"
                                                                    title="Assign User"
                                                                    disabled={availableUsers.length === 0}
                                                                    aria-disabled={availableUsers.length === 0}
                                                                >
                                                                    <Plus size={14} />
                                                                    <span>Assign</span>
                                                                </button>
                                                            }
                                                        />
                                                    )}
                                                </div>
                                                {(taskAssignments[task.task_id] || []).length === 0 ? (
                                                    <p className="text-[12.5px] text-faint">
                                                        No team members assigned to this task yet.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {(taskAssignments[task.task_id] || []).map((assn) => (
                                                            <div
                                                                key={assn.user_id}
                                                                className="flex items-center gap-3 rounded-[10px] bg-surface-2 px-3 py-2"
                                                            >
                                                                <UserAvatar
                                                                    name={`${assn.user?.account?.first_name || ""} ${assn.user?.account?.last_name || ""}`}
                                                                    className="h-8 w-8 text-[12px]"
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-[13px] font-medium text-ink">
                                                                        {assn.user?.account?.first_name}{" "}
                                                                        {assn.user?.account?.last_name}
                                                                    </p>
                                                                    <p className="truncate text-[11px] text-muted">
                                                                        @{assn.user?.username}
                                                                    </p>
                                                                </div>
                                                                {assn.user?.role?.name && (
                                                                    <StatusBadge label={assn.user.role.name} tone="info" />
                                                                )}
                                                                {canManageTeam && (
                                                                    <button
                                                                        onClick={() =>
                                                                            handleRemoveUserAssignment(
                                                                                task.task_id,
                                                                                assn.user_id
                                                                            )
                                                                        }
                                                                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                                                                        title="Remove"
                                                                        aria-label="Remove team member from task"
                                                                    >
                                                                        <Trash2 size={14} aria-hidden="true" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Assigned Resources */}
                                            <div>
                                                <div className="mb-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-faint">
                                                        <Package size={13} />
                                                        <span>Assigned Resources</span>
                                                    </div>
                                                    {canManageTeam && (
                                                        <button
                                                            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-bright transition-colors hover:bg-bright-soft"
                                                            title="Assign Resource"
                                                            onClick={() => {
                                                                setSelectedTask(task);
                                                                setResourceAssignmentModalOpen(true);
                                                            }}
                                                        >
                                                            <Plus size={14} />
                                                            <span>Assign</span>
                                                        </button>
                                                    )}
                                                </div>
                                                {(resourceAssignments[task.task_id] || []).length === 0 ? (
                                                    <p className="text-[12.5px] text-faint">
                                                        No resources assigned to this task yet.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {(resourceAssignments[task.task_id] || []).map((assn) => (
                                                            <div
                                                                key={assn.assignment_id}
                                                                className="flex items-center gap-3 rounded-[10px] bg-surface-2 px-3 py-2"
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-[13px] font-medium text-ink">
                                                                        {assn.resource?.name}
                                                                    </p>
                                                                    <p className="text-[11px] text-muted">
                                                                        Allocation: {assn.allocation_percentage}% ·
                                                                        Planned: {assn.planned_hours}h
                                                                    </p>
                                                                </div>
                                                                {assn.resource?.type && (
                                                                    <StatusBadge label={assn.resource.type} tone="success" />
                                                                )}
                                                                {canManageTeam && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            const token = localStorage.getItem("token");
                                                                            await axios.delete(
                                                                                `/api/resourceAssignments/${assn.assignment_id}`,
                                                                                { headers: { Authorization: `Bearer ${token}` } }
                                                                            );
                                                                            toast.success("Resource unassigned");
                                                                            fetchResourceAssignments(task.task_id);
                                                                        }}
                                                                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                                                                        title="Remove"
                                                                        aria-label="Unassign resource from task"
                                                                    >
                                                                        <Trash2 size={14} aria-hidden="true" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                    )}
                </div>
                {/* Navigation Buttons */}
                {showNavButtons && (
                    <div className="mt-8 flex justify-between">
                        <button
                            onClick={() =>
                                router.push(`/projects/${projectId}/setup`)
                            }
                            className="flex items-center space-x-2 px-6 py-3 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
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
                            className="flex items-center space-x-2 px-6 py-3 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
                        >
                            <span>Next: Risk Management</span>
                            <Plus size={16} />
                        </button>
                    </div>
                )}
            </div>
            {/* Add Team Member Modal */}
            <Modal
                open={showAddMemberModal}
                onClose={() => {
                    setShowAddMemberModal(false);
                    setMemberSource("pmo");
                    setSelectedHrEmployee(null);
                    setWorkloadAvailable(null);
                    setMemberSearchTerm("");
                    setDepartmentSearchTerm("");
                }}
                title="Add New Team Member"
                maxWidthClass="max-w-2xl"
                footer={
                    <>
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
                            className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="add-team-member-form"
                            disabled={isAddingMember || (memberSource === "hr" && !selectedHrEmployee)}
                            className="flex items-center gap-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAddingMember && <Spinner size={16} />}
                            <span>{isAddingMember ? "Adding..." : "Add"}</span>
                        </button>
                    </>
                }
            >
                <form
                    id="add-team-member-form"
                    onSubmit={handleAddMemberFormSubmit}
                    className="space-y-6"
                >
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-ink-3 mb-2">
                                User
                                <span className="text-danger">*</span>
                            </label>
                            <Tabs
                                value={memberSource}
                                onValueChange={(v) => {
                                    if (v === "pmo") {
                                        setMemberSource("pmo");
                                        setSelectedHrEmployee(null);
                                    } else {
                                        setMemberSource("hr");
                                    }
                                    handleAddMemberFormChange("user_id", "");
                                    setWorkloadAvailable(null);
                                }}
                            >
                                <TabsList variant="line" className="mb-3">
                                    <TabsTrigger value="pmo">From PMO</TabsTrigger>
                                    <TabsTrigger value="hr">From HR</TabsTrigger>
                                </TabsList>
                            </Tabs>
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
                                        className={inputClass}
                                    />
                                    {selectedHrEmployee && (
                                        <div className="mt-2 p-2 bg-bright-soft rounded-lg text-sm text-ink-3">
                                            Selected: {getEmployeeFullName(selectedHrEmployee)} (
                                            {selectedHrEmployee.email})
                                        </div>
                                    )}
                                    {memberListOpen && !employeesLoading && filteredEmployees.length > 0 && (
                                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-surface border border-line rounded-lg shadow-lg">
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
                                                    className="w-full flex items-center p-2 hover:bg-surface-2 text-left text-ink"
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
                        <div>
                            <label className="block text-sm font-medium text-ink-3 mb-2">
                                Workload (%)
                                <span className="text-danger">*</span>
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
                                className={inputClass}
                                placeholder="100"
                            />
                            {workloadAvailable != null && memberSource === "pmo" && (
                                <p className="text-xs text-muted mt-1">
                                    Available: {workloadAvailable}%
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink-3 mb-2">
                                Role
                                <span className="text-danger">*</span>
                            </label>
                            <Dropdown
                              value={String(addMemberForm.role ?? '')}
                              onChange={(__v: string) =>
                                    handleAddMemberFormChange(
                                        "role",
                                        __v
                                    )}
                              options={[
                              { value: String(""), label: "Select role..." },
                              ...availableRoles.map((name) => ({ value: String(name), label: name })),
                            ]}
                              required={true}
                              modal
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink-3 mb-2">
                                Department
                                <span className="text-danger">*</span>
                            </label>
                            {memberSource === "hr" ? (
                                <div className={`${inputClass} flex items-center bg-surface-2 text-ink-3`}>
                                    {addMemberForm.department || "—"}
                                </div>
                            ) : (
                                <Dropdown
                                  value={addMemberForm.department}
                                  onChange={(v) => handleAddMemberFormChange("department", v)}
                                  options={departments.map((d: any) => ({
                                      value: String(d?.name ?? d?.label ?? ""),
                                      label: String(d?.name ?? d?.label ?? ""),
                                  }))}
                                  placeholder={departmentsLoading ? "Loading..." : "Search or select department"}
                                  searchable
                                  disabled={departmentsLoading}
                                  required={true}
                                  modal
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
                                className="accent-bright w-5 h-5 cursor-pointer"
                                id="is_lead"
                            />
                            <label
                                htmlFor="is_lead"
                                className="text-sm text-ink-3 font-medium cursor-pointer"
                            >
                                Set as Team Lead
                            </label>
                        </div>
                    </div>
                </form>
            </Modal>
            {/* Edit Team Member Modal */}
            {editingMember && (
                <Modal
                    open={showEditMemberModal}
                    onClose={() => {
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
                    title="Edit Team Member"
                    description={`Editing: ${editingMember.user.account.first_name} ${editingMember.user.account.last_name}`}
                    maxWidthClass="max-w-2xl"
                    footer={
                        <>
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
                                className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-team-member-form"
                                disabled={isUpdatingMember}
                                className="flex items-center gap-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUpdatingMember && <Spinner size={16} />}
                                <span>{isUpdatingMember ? "Updating..." : "Update"}</span>
                            </button>
                        </>
                    }
                >
                    <form
                        id="edit-team-member-form"
                        onSubmit={handleEditMemberFormSubmit}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-ink-3 mb-2">
                                    Workload (%)
                                    <span className="text-danger">*</span>
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
                                    className={inputClass}
                                    placeholder="100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink-3 mb-2">
                                    Role
                                    <span className="text-danger">*</span>
                                </label>
                                <Dropdown
                                  value={String(addMemberForm.role ?? '')}
                                  onChange={(v) => handleAddMemberFormChange("role", v)}
                                  options={[
                                      { value: String(""), label: "Select role..." },
                                      ...availableRoles.map((name) => ({ value: String(name), label: name })),
                                  ]}
                                  required={true}
                                  modal
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ink-3 mb-2">
                                    Department
                                    <span className="text-danger">*</span>
                                </label>
                                <Dropdown
                                  value={addMemberForm.department}
                                  onChange={(v) => handleAddMemberFormChange("department", v)}
                                  options={departments.map((d: any) => ({
                                      value: String(d?.name ?? d?.label ?? ""),
                                      label: String(d?.name ?? d?.label ?? ""),
                                  }))}
                                  placeholder={departmentsLoading ? "Loading..." : "Search or select department"}
                                  searchable
                                  disabled={departmentsLoading}
                                  required={true}
                                  modal
                                />
                            </div>
                            <div className="flex items-center gap-2 mt-8">
                                <input
                                    type="checkbox"
                                    checked={addMemberForm.is_lead}
                                    onChange={(e) =>
                                        handleAddMemberFormChange("is_lead", e.target.checked)
                                    }
                                    className="accent-bright w-5 h-5 cursor-pointer"
                                    id="is_lead_edit"
                                />
                                <label
                                    htmlFor="is_lead_edit"
                                    className="text-sm text-ink-3 font-medium cursor-pointer"
                                >
                                    Set as Team Lead
                                </label>
                            </div>
                        </div>
                    </form>
                </Modal>
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
