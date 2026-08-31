"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Users,
  Calendar,
  Clock,
  BarChart,
  Search,
  Filter,
  Download,
  Settings,
  Plus,
  UserPlus,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Award,
  Building,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Star,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Edit,
  Eye,
  Trash2,
  MoreHorizontal,
  X,
  Grid,
  List,
} from "lucide-react";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { toast } from "sonner";
import axios from "axios";
import { LoadingState, Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Dropdown } from "@/components/ui/dropdown";
import { TabRow } from "@/components/ui/tab-row";
import { ListPagination } from "@/components/ui/list-pagination";
import { ViewToggle, type ListViewMode } from "@/components/ui/view-toggle";
import { PersonCell } from "@/components/ui/person-cell";
import {
  EmptyState,
  EntityCard,
  EntityCardFooter,
  EntityCardHeader,
  EntityProgress,
  EntityStat,
  EntityStats,
  StatGrid,
  StatTile,
} from "@/components/ui/entity-card";
import {
  ListCard,
  ListHead,
  ListMessage,
  ListRow,
  RowAction,
  RowActions,
  StatusBadge,
} from "@/components/ui/form-shell";
import {
  humanize,
  resourceStatusTone,
  utilizationTone,
} from "@/lib/status-tone";

const PAGE_SIZE = 12;
const RESOURCE_COLUMNS = [
  "Name",
  "Position",
  "Department",
  "Type",
  "Status",
  "Projects",
  "Utilization",
];

// Types for Resource Management
interface Resource {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  skills: Skill[];
  hourlyRate: number;
  availability: number; // percentage 0-100
  utilization: number; // percentage 0-100
  currentProjects: ProjectAssignment[];
  totalCapacity: number; // hours per week for labor/equipment, kg for material
  allocatedHours: number; // currently allocated hours
  status: "active" | "inactive" | "on-leave" | "contractor";
  location: string;
  manager: string;
  startDate: Date;
  profileImage?: string;
  certifications: string[];
  languages: string[];
  costCenter: string;
  rating: number; // 1-5
  type: "labor" | "equipment" | "material"; // Resource type
  unit?: string;
  quantity?: number;
}

interface Skill {
  name: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  category: string;
  verified: boolean;
  yearsExperience: number;
}

interface ProjectAssignment {
  projectId: string;
  projectName: string;
  role: string;
  allocation: number; // percentage - exists in ResourceAssignment schema as allocation_percentage
  startDate: Date;
  endDate: Date;
  status: "active" | "completed" | "planned";
}

interface ResourceAllocation {
  resourceId: string;
  date: Date;
  allocatedHours: number;
  project: string;
  task: string;
  confirmed: boolean;
}

interface ResourceRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  projectId: string;
  projectName: string;
  skillsRequired: string[];
  hoursNeeded: number;
  duration: string;
  urgency: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected" | "fulfilled";
  requestDate: Date;
  requiredDate: Date;
  description: string;
}

type UserRole = "admin" | "project-manager" | "technical" | "pmo" | "executive";

const ResourceManagementPage: React.FC = () => {
  const router = useRouter();
  const confirm = useConfirm();
  const [userRole] = useState<UserRole>("admin"); // This would come from auth context
  const [currentUserId] = useState("user-123"); // This would come from auth context
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceRequests, setResourceRequests] = useState<ResourceRequest[]>(
    []
  );
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">(
    "grid"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  /**
   * The department, type and status controls used to be declared but never
   * applied — the grid always received the full list. Derive the visible set
   * here so the filter bar actually narrows what is shown.
   */
  const resourceDepartments = Array.from(
    new Set(resources.map((r) => r.department).filter(Boolean))
  ).sort();

  const filteredResources = resources.filter((resource) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      `${resource.firstName} ${resource.lastName}`.toLowerCase().includes(term) ||
      (resource.position ?? "").toLowerCase().includes(term) ||
      (resource.department ?? "").toLowerCase().includes(term) ||
      (resource.email ?? "").toLowerCase().includes(term);
    const matchesDepartment =
      departmentFilter === "all" || resource.department === departmentFilter;
    const matchesStatus =
      statusFilter === "all" || resource.status === statusFilter;
    const matchesType = typeFilter === "all" || resource.type === typeFilter;
    return matchesSearch && matchesDepartment && matchesStatus && matchesType;
  });
  const [view, setView] = useState<ListViewMode>("grid");
  const [page, setPage] = useState(0);

  // Filtering changes what "page 1" means, so reset rather than stranding the
  // user on a page index that no longer has rows.
  useEffect(
    () => setPage(0),
    [searchTerm, departmentFilter, statusFilter, typeFilter, view],
  );

  const resourcePageCount = Math.max(
    1,
    Math.ceil(filteredResources.length / PAGE_SIZE),
  );
  const visibleResources = filteredResources.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );
  const [showResourceRequest, setShowResourceRequest] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalResources, setTotalResources] = useState(0);
  const [availableResources, setAvailableResources] = useState(0);
  const [avgUtilization, setAvgUtilization] = useState(0);
  const [showResourcesTable, setShowResourcesTable] = useState(false);
  const [allResourcesData, setAllResourcesData] = useState<any[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [showResourceCalendar, setShowResourceCalendar] = useState(false);
  const [resourceAllocations, setResourceAllocations] = useState<any[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [showResourceGrid, setShowResourceGrid] = useState(true);
  const [overallocationPercentage, setOverallocationPercentage] = useState(0);
  const [overloadedResourcesCount, setOverloadedResourcesCount] = useState(0);
  const [activeTab, setActiveTab] = useState("grid");

  // Update resourceTabs to only include grid and calendar
  const resourceTabs = [
    {
      id: "grid",
      label: "View",
      icon: <Grid size={16} />,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <Calendar size={16} />,
    },
  ];

  const fetchWorkload = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resources/workload", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      // Debug logging to identify overallocation issue
      console.log("Workload API response:", data);
      console.log("Summary overloaded_count:", data.summary?.overloaded_count);
      console.log(
        "Resources with overload status:",
        data.resources?.filter((r: any) => r.status === "overloaded")
      );
      console.log(
        "All resource statuses:",
        data.resources?.map((r: any) => ({
          id: r.resource_id,
          status: r.status,
          utilization: r.actual_utilization_rate,
        }))
      );

      // Calculate average utilization from all resources
      if (data.resources && data.resources.length > 0) {
        const totalUtilization = data.resources.reduce(
          (sum: number, resource: any) =>
            sum + resource.actual_utilization_rate,
          0
        );
        const average = totalUtilization / data.resources.length;
        setAvgUtilization(Math.round(average * 100) / 100);

        // Use the summary data from API for overallocation calculation
        if (data.summary && data.summary.overloaded_count > 0) {
          // Calculate average overallocation percentage for overloaded resources only
          const overloadedResources = data.resources.filter(
            (resource: any) => resource.status === "overloaded"
          );

          const totalOverallocation = overloadedResources.reduce(
            (sum: number, resource: any) =>
              sum + (resource.actual_utilization_rate - 100),
            0
          );
          const avgOverallocation =
            totalOverallocation / overloadedResources.length;
          setOverallocationPercentage(
            Math.round(avgOverallocation * 100) / 100
          );
          setOverloadedResourcesCount(data.summary.overloaded_count);
        } else {
          setOverallocationPercentage(0);
          setOverloadedResourcesCount(0);
        }
      } else {
        // Set default values for testing
        setAvgUtilization(0);
        setOverallocationPercentage(0);
        setOverloadedResourcesCount(0);
      }
    } catch (error) {
      // Set default values on error
      setAvgUtilization(0);
      setOverallocationPercentage(0);
      setOverloadedResourcesCount(0);
    }
  };

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/resources", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setTotalResources(data.allResources.length);
      setAvailableResources(data.availableResources.length);

      // Fetch workload data to get real utilization rates
      let utilizationMap = new Map();
      try {
        const workloadResponse = await fetch("/api/resources/workload", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const workloadData = await workloadResponse.json();

        // Create a map of resource utilization rates
        if (workloadData.resources) {
          workloadData.resources.forEach((resource: any) => {
            utilizationMap.set(
              resource.resource_id,
              resource.actual_utilization_rate
            );
          });
        }
      } catch (workloadError) {
        console.warn(
          "Could not fetch workload data, using fallback calculation:",
          workloadError
        );
      }

      // Transform API data to match Grid View interface
      const transformedResources: Resource[] = data.allResources.map(
        (apiResource: any) => {
          // Parse skills from JSON to array format expected by ResourceGrid
          let skills: Skill[] = [];
          let skillsData: any = null;
          try {
            if (typeof apiResource.skills === "string") {
              skillsData = JSON.parse(apiResource.skills);
            } else {
              skillsData = apiResource.skills;
            }

            // Handle new skills format with Skills and Languages arrays
            if (skillsData && typeof skillsData === "object") {
              // Convert Skills array
              if (skillsData.Skills && Array.isArray(skillsData.Skills)) {
                skills.push(
                  ...skillsData.Skills.map((skill: any) => ({
                    name: skill.name || skill,
                    level: skill.proficiency || "intermediate",
                    category: skill.category || "Technical",
                    verified: true,
                    yearsExperience: skill.yearsExperience || 1,
                  }))
                );
              }

              // Convert Languages array
              if (skillsData.Languages && Array.isArray(skillsData.Languages)) {
                skills.push(
                  ...skillsData.Languages.map((lang: any) => ({
                    name: lang.name || lang,
                    level: lang.proficiency || "intermediate",
                    category: "Language",
                    verified: true,
                    yearsExperience: lang.yearsExperience || 1,
                  }))
                );
              }
            } else if (Array.isArray(skillsData)) {
              // Handle old format if still present
              skills = skillsData.map((skill: any) => ({
                name: skill.name || skill,
                level: skill.level || skill.proficiency || "intermediate",
                category: skill.category || "General",
                verified: skill.verified || true,
                yearsExperience: skill.yearsExperience || 1,
              }));
            }
          } catch (e) {
            console.warn(
              "Error parsing skills for resource:",
              apiResource.resource_id,
              e
            );
            // If parsing fails, create a basic skill from the skills field
            skills = [
              {
                name: "General",
                level: "intermediate",
                category: "General",
                verified: true,
                yearsExperience: 1,
              },
            ];
          }

          // Ensure skills is always an array
          if (!Array.isArray(skills)) {
            skills = [];
          }

          // Extract languages for the languages field
          const languages = skillsData?.Languages?.map(
            (lang: any) => lang.name || lang
          ) || ["Arabic", "English"];

          // Parse name into firstName and lastName
          const nameParts = apiResource.name.split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          // Get real utilization rate from workload data, fallback to calculated value
          const realUtilization = utilizationMap.get(apiResource.resource_id);
          let utilization = 0;
          let availability = 100;

          if (realUtilization !== undefined && realUtilization >= 0) {
            // Use real utilization data
            utilization = Math.min(realUtilization, 100); // Cap at 100%
            availability = Math.max(100 - utilization, 0); // Calculate availability
          } else {
            // Fallback to availability status-based calculation
            switch (apiResource.availability_status) {
              case "available":
                utilization = 0;
                availability = 100;
                break;
              case "busy":
                utilization = Math.min(85, 100); // Cap at 100%
                availability = Math.max(100 - utilization, 0);
                break;
              case "on_leave":
                utilization = 0;
                availability = 0;
                break;
              case "inactive":
                utilization = 0;
                availability = 0;
                break;
              default:
                utilization = 0;
                availability = 100;
                break;
            }
          }

          return {
            id: apiResource.resource_id.toString(),
            firstName,
            lastName,
            email: apiResource.email || "N/A",
            phone: apiResource.phone_number || "N/A",
            position: apiResource.role,
            department: apiResource.department,
            skills,
            hourlyRate: apiResource.rate,
            availability,
            utilization,
            currentProjects: [], // Will be populated from assignments if needed
            totalCapacity: apiResource.capacity || 40,
            allocatedHours: Math.round(
              (utilization / 100) * (apiResource.capacity || 40)
            ),
            status:
              apiResource.availability_status === "inactive"
                ? "inactive"
                : "active",
            location: apiResource.location || "Muscat, Oman",
            manager: "Department Manager",
            startDate: new Date(apiResource.created_at),
            profileImage: apiResource.profile_image,
            certifications: [],
            languages: languages,
            costCenter: `${apiResource.department.toUpperCase()}-${
              apiResource.resource_id
            }`,
            rating: apiResource.rating,
            type: apiResource.type || "labor", // Add resource type
            unit: apiResource.unit,
            quantity: apiResource.quantity,
          };
        }
      );

      setResources(transformedResources);
      setResourceRequests(getSampleResourceRequests());
      setIsLoading(false);
    } catch (error) {
      console.error("Error refreshing resources:", error);
      setIsLoading(false);
    }
  };

  const getSampleResourceRequests = (): ResourceRequest[] => {
    return [
      {
        id: "req-001",
        requesterId: "user-456",
        requesterName: "Omar Khalil",
        projectId: "proj-005",
        projectName: "Smart City Initiative",
        skillsRequired: [
          "IoT Development",
          "Data Analytics",
          "System Integration",
        ],
        hoursNeeded: 160,
        duration: "4 months",
        urgency: "high",
        status: "pending",
        requestDate: new Date("2024-12-01"),
        requiredDate: new Date("2024-12-15"),
        description:
          "Need experienced IoT developer for smart city sensors implementation",
      },
      {
        id: "req-002",
        requesterId: "user-789",
        requesterName: "Layla Al-Thani",
        projectId: "proj-006",
        projectName: "Financial System Upgrade",
        skillsRequired: ["Financial Systems", "ERP", "Data Migration"],
        hoursNeeded: 120,
        duration: "3 months",
        urgency: "critical",
        status: "approved",
        requestDate: new Date("2024-11-25"),
        requiredDate: new Date("2024-12-10"),
        description: "Critical resource needed for Q1 financial system go-live",
      },
    ];
  };

  const renderRoleSpecificControls = () => {
    const getRoleSpecificActions = (role: string) => {
      switch (role) {
        case "admin":
          return [
            {
              label: "Add Resource",
              icon: <UserPlus size={16} />,
              action: "add_resource",
              variant: "primary",
            },
          ];

        case "project-manager":
          return [
            {
              label: "Request Resource",
              icon: <Plus size={16} />,
              variant: "primary",
            },
            {
              label: "Team Calendar",
              icon: <Calendar size={16} />,
              variant: "secondary",
            },
            {
              label: "Optimize Allocation",
              icon: <Target size={16} />,
              variant: "secondary",
            },
          ];

        case "technical":
          return [
            {
              label: "Log Time",
              icon: <Clock size={16} />,
              variant: "primary",
            },
            {
              label: "Update Skills",
              icon: <Award size={16} />,
              variant: "secondary",
            },
            {
              label: "Request Time Off",
              icon: <Calendar size={16} />,
              variant: "secondary",
            },
          ];

        case "pmo":
          return [
            {
              label: "Portfolio Analysis",
              icon: <BarChart size={16} />,
              variant: "secondary",
            },
            {
              label: "Governance Check",
              icon: <Settings size={16} />,
              variant: "secondary",
            },
            {
              label: "Resource Report",
              icon: <Download size={16} />,
              variant: "secondary",
            },
          ];

        case "executive":
          return [
            {
              label: "Approve Requests",
              icon: <CheckCircle size={16} />,
              variant: "primary",
            },
            {
              label: "Strategic View",
              icon: <TrendingUp size={16} />,
              variant: "secondary",
            },
          ];

        default:
          return [];
      }
    };

    return (
      <div className="flex items-center space-x-2">
        {getRoleSpecificActions(userRole).map((action, index) => (
          <button
            key={index}
            onClick={() => {
              if ("action" in action && action.action === "add_resource") {
                router.push("/resources/new");
              }
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              action.variant === "primary"
                ? "bg-bright text-white hover:bg-bright-deep"
                : "border border-line text-ink-3 hover:bg-surface-2"
            }`}
          >
            {action.icon}
            <span className="text-sm">{action.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderStatsCards = () => {
    const totalCost = resources.reduce(
      (acc, r) => acc + r.hourlyRate * r.allocatedHours,
      0
    );

    return (
      <StatGrid>
        <StatTile
          label={userRole === "technical" ? "My utilization" : "Total resources"}
          value={userRole === "technical" ? "78%" : totalResources}
          hint={
            userRole === "technical" ? "Across your projects" : "In the pool"
          }
          icon={<Users className="h-4 w-4" />}
        />
        <StatTile
          label={
            userRole === "technical" ? "Current projects" : "Available resources"
          }
          value={userRole === "technical" ? "3" : availableResources}
          hint="Ready to allocate"
          icon={<CheckCircle className="h-4 w-4" />}
          tone={availableResources > 0 ? "success" : "neutral"}
        />
        <StatTile
          label={userRole === "executive" ? "Resource ROI" : "Overallocation"}
          value={
            userRole === "executive" ? "4.2x" : `${overallocationPercentage}%`
          }
          hint={
            overloadedResourcesCount > 0
              ? `${overloadedResourcesCount} resource${overloadedResourcesCount !== 1 ? "s" : ""} overloaded`
              : "Nobody over capacity"
          }
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={overloadedResourcesCount > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label={
            userRole === "executive" ? "Total cost / week" : "Avg utilization"
          }
          value={
            userRole === "executive"
              ? `OMR ${Math.round(totalCost).toLocaleString()}`
              : `${avgUtilization}%`
          }
          hint="Team average"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </StatGrid>
    );
  };

  const fetchResourceCalendar = async () => {
    setIsLoadingCalendar(true);
    try {
      const response = await axios.get("/api/resourceAssignments", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Transform the API data to match the calendar component structure
      const transformedData = transformAssignmentsToCalendarData(response.data);
      setResourceAllocations(transformedData);
    } catch (error) {
      console.error("Error fetching resource calendar:", error);
      toast.error("Failed to fetch resource calendar data");
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Map assignment status to calendar colors
  // Green: active, Blue: planned/not started, Purple: completed/finished
  const mapAssignmentStatus = (assignment: any): string => {
    const status = assignment.status?.toLowerCase() || "";
    const currentDate = new Date();
    const startDate = new Date(
      assignment.start_date || assignment.startDate || new Date()
    );
    const endDate = new Date(
      assignment.end_date || assignment.endDate || new Date()
    );

    // Check if assignment is finished/completed
    if (
      status.includes("completed") ||
      status.includes("finished") ||
      status.includes("done") ||
      status.includes("closed") ||
      endDate < currentDate
    ) {
      return "completed";
    }

    // Check if assignment is planned/not started yet
    if (
      status.includes("planned") ||
      status.includes("pending") ||
      status.includes("scheduled") ||
      status.includes("not started") ||
      startDate > currentDate
    ) {
      return "planned";
    }

    // Default to active for ongoing assignments
    return "active";
  };

  // Transform resource assignments data for calendar display
  const transformAssignmentsToCalendarData = (
    assignments: any[]
  ): ResourceAllocation[] => {
    if (!Array.isArray(assignments)) {
      console.warn("Expected assignments to be an array, got:", assignments);
      return [];
    }

    // Group assignments by resource
    const resourceMap = new Map();

    assignments.forEach((assignment) => {
      const resourceId = assignment.resource_id || assignment.resourceId;
      const resourceName =
        assignment.resource?.firstName && assignment.resource?.lastName
          ? `${assignment.resource.firstName} ${assignment.resource.lastName}`
          : assignment.resource?.name || `Resource ${resourceId}`;

      if (!resourceMap.has(resourceId)) {
        resourceMap.set(resourceId, {
          id: resourceId,
          name: resourceName,
          role:
            assignment.resource?.position ||
            assignment.resource?.role ||
            "Unknown",
          department: assignment.resource?.department || "Unknown",
          availability: assignment.resource?.availability || "100%",
          assignments: [],
        });
      }

      // Add assignment to resource
      const transformedAssignment = {
        id:
          assignment.assignment_id ||
          assignment.id ||
          `assignment-${Date.now()}`,
        title:
          assignment.task?.name ||
          assignment.project?.name ||
          "Task Assignment",
        startDate:
          assignment.start_date ||
          assignment.startDate ||
          new Date().toISOString(),
        endDate:
          assignment.end_date || assignment.endDate || new Date().toISOString(),
        allocation:
          assignment.allocation_percentage || assignment.allocation || 0,
        status: mapAssignmentStatus(assignment),
      };

      resourceMap.get(resourceId).assignments.push(transformedAssignment);
    });

    return Array.from(resourceMap.values());
  };

  const handleDeleteResource = async (resource: Resource) => {
    const ok = await confirm({
      title: "Delete resource?",
      message: `${resource.firstName} ${resource.lastName} will be removed permanently.`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(`/api/resources/${resource.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Resource deleted successfully");
        fetchResources(); // Refresh the resource list
      } else {
        const errorData = await response.json();
        toast.error(
          `Failed to delete resource: ${errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to delete resource. Please try again.");
    }
  };

  // Load initial data
  useEffect(() => {
    fetchResources();
    fetchWorkload();
    fetchResourceCalendar();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner size={64} className="text-bright-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const rowActions = (resource: Resource) => (
    <RowActions>
      <RowAction
        icon={Eye}
        label={`View ${resource.firstName} ${resource.lastName}`}
        onClick={() => router.push(`/resources/${resource.id}`)}
      />
      <RowAction
        icon={Edit}
        label={`Edit ${resource.firstName} ${resource.lastName}`}
        onClick={() => router.push(`/resources/${resource.id}/edit`)}
      />
      <RowAction
        icon={Trash2}
        label={`Delete ${resource.firstName} ${resource.lastName}`}
        tone="danger"
        onClick={() => handleDeleteResource(resource)}
      />
    </RowActions>
  );

  const renderCard = (resource: Resource) => {
    const fullName = `${resource.firstName} ${resource.lastName}`.trim();

    return (
      <EntityCard
        key={resource.id}
        onClick={() => router.push(`/resources/${resource.id}`)}
      >
        <EntityCardHeader
          title={fullName}
          subtitle={resource.position}
          badges={
            <>
              <StatusBadge
                label={humanize(resource.status)}
                tone={resourceStatusTone(resource.status)}
              />
              <StatusBadge label={humanize(resource.type)} tone="info" />
              {resource.department && (
                <StatusBadge label={resource.department} />
              )}
            </>
          }
        />

        <EntityStats>
          <EntityStat icon={<Briefcase className="h-3.5 w-3.5" />}>
            {resource.currentProjects?.length ?? 0}{" "}
            {(resource.currentProjects?.length ?? 0) === 1
              ? "project"
              : "projects"}
          </EntityStat>
          <EntityStat icon={<DollarSign className="h-3.5 w-3.5" />}>
            {resource.hourlyRate}/hr
          </EntityStat>
        </EntityStats>

        <EntityProgress
          label="Utilization"
          value={Math.min(resource.utilization ?? 0, 100)}
          display={`${Math.round(resource.utilization ?? 0)}%`}
          tone={utilizationTone(resource.utilization ?? 0)}
        />

        <EntityCardFooter
          actions={
            <div onClick={(e) => e.stopPropagation()}>
              {rowActions(resource)}
            </div>
          }
        >
          <PersonCell
            name={fullName}
            avatarUrl={resource.profileImage}
            subtitle={resource.location || resource.department}
          />
        </EntityCardFooter>
      </EntityCard>
    );
  };

  return (
    <DashboardLayout
      title="Resource Management"
      subtitle={
        userRole === "admin"
          ? "System-wide resource overview and management."
          : userRole === "project-manager"
            ? "Manage resources for your projects."
            : userRole === "technical"
              ? "View your workload and manage your profile."
              : userRole === "pmo"
                ? "Portfolio resource governance and optimization."
                : "High-level resource metrics and strategic decisions."
      }
      actions={
        <>
          {activeTab === "grid" && (
            <ViewToggle value={view} onChange={setView} />
          )}
          {renderRoleSpecificControls()}
        </>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        {renderStatsCards()}

        <TabRow
          tabs={resourceTabs}
          value={activeTab}
          onChange={(id) => {
            setActiveTab(id);
            if (id === "grid") {
              setShowResourceGrid(true);
              setShowResourceCalendar(false);
            } else if (id === "calendar") {
              fetchResourceCalendar();
              setShowResourceGrid(false);
              setShowResourceCalendar(true);
            }
          }}
        />

        {/* Tab Content */}
        {activeTab === "grid" && showResourceGrid && (
          <div className="space-y-6">
            <FilterBar
              search={searchTerm}
              onSearch={setSearchTerm}
              searchPlaceholder="Search resources by name, role or department…"
              resultLabel={`${filteredResources.length} ${filteredResources.length === 1 ? "resource" : "resources"}`}
              activeCount={
                (departmentFilter !== "all" ? 1 : 0) +
                (statusFilter !== "all" ? 1 : 0) +
                (typeFilter !== "all" ? 1 : 0)
              }
              onClear={() => {
                setDepartmentFilter("all");
                setStatusFilter("all");
                setTypeFilter("all");
              }}
            >
              <FilterSelect
                label="Department"
                value={departmentFilter}
                onChange={setDepartmentFilter}
                searchable={resourceDepartments.length > 10}
                options={[
                  { value: "all", label: "All departments" },
                  ...resourceDepartments.map((d) => ({ value: d, label: d })),
                ]}
              />
              <FilterSelect
                label="Type"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "all", label: "All types" },
                  { value: "labor", label: "Labor" },
                  { value: "equipment", label: "Equipment" },
                  { value: "material", label: "Material" },
                ]}
              />
              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "on-leave", label: "On leave" },
                  { value: "contractor", label: "Contractor" },
                ]}
              />
            </FilterBar>

            {filteredResources.length === 0 ? (
              <EmptyState
                icon={<Users className="h-10 w-10" />}
                title="No resources found"
                message={
                  resources.length === 0
                    ? "No resources have been added yet."
                    : "Try adjusting your filters to see more results."
                }
                action={
                  resources.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setDepartmentFilter("all");
                        setStatusFilter("all");
                        setTypeFilter("all");
                      }}
                      className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                    >
                      Clear all filters
                    </button>
                  ) : undefined
                }
              />
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleResources.map(renderCard)}
              </div>
            ) : (
              <ListCard>
                <table className="w-full border-collapse">
                  <ListHead columns={RESOURCE_COLUMNS} />
                  <tbody>
                    {visibleResources.length === 0 ? (
                      <ListMessage colSpan={RESOURCE_COLUMNS.length + 1}>
                        No resources on this page.
                      </ListMessage>
                    ) : (
                      visibleResources.map((resource) => (
                        <ListRow
                          key={resource.id}
                          onClick={() =>
                            router.push(`/resources/${resource.id}`)
                          }
                        >
                          <td className="max-w-[180px] px-4 py-3">
                            <PersonCell
                              name={`${resource.firstName} ${resource.lastName}`.trim()}
                              email={resource.email}
                              avatarUrl={resource.profileImage}
                            />
                          </td>
                          <td className="px-4 py-3 text-[13.5px] text-ink-2">
                            {resource.position || (
                              <span className="text-faint">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[13.5px] text-ink-2">
                            {resource.department || (
                              <span className="text-faint">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <StatusBadge
                              label={humanize(resource.type)}
                              tone="info"
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <StatusBadge
                              label={humanize(resource.status)}
                              tone={resourceStatusTone(resource.status)}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                            {resource.currentProjects?.length ?? 0}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
                                <div
                                  className={`h-full rounded-full ${
                                    (resource.utilization ?? 0) > 100
                                      ? "bg-danger"
                                      : (resource.utilization ?? 0) >= 80
                                        ? "bg-success"
                                        : (resource.utilization ?? 0) >= 50
                                          ? "bg-warning"
                                          : "bg-bright"
                                  }`}
                                  style={{
                                    width: `${Math.min(resource.utilization ?? 0, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[12px] tabular-nums text-muted">
                                {Math.round(resource.utilization ?? 0)}%
                              </span>
                            </div>
                          </td>
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rowActions(resource)}
                          </td>
                        </ListRow>
                      ))
                    )}
                  </tbody>
                </table>
              </ListCard>
            )}

            {filteredResources.length > 0 && (
              <ListPagination
                page={page}
                pageCount={resourcePageCount}
                total={filteredResources.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                noun="resource"
              />
            )}
          </div>
        )}

        {/* Calendar View Content */}
        {activeTab === "calendar" && showResourceCalendar && (
          <div className="rounded-[14px] border border-line bg-surface p-6 shadow-card">
            {isLoadingCalendar ? (
              <LoadingState label="Loading calendar…" />
            ) : (
              <ResourceCalendarView allocations={resourceAllocations} />
            )}
          </div>
        )}
      </div>


    </DashboardLayout>
  );
};

// Resource Calendar Component
interface ResourceAllocation {
  id: number;
  name: string;
  role: string;
  department: string;
  availability: string;
  assignments: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    allocation: number;
    status: string;
  }[];
}

interface ResourceCalendarViewProps {
  allocations: ResourceAllocation[];
}

const ResourceCalendarView: React.FC<ResourceCalendarViewProps> = ({
  allocations,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedResource, setSelectedResource] =
    useState<ResourceAllocation | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayDetails, setShowDayDetails] = useState(false);

  const renderCalendarView = () => {
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-32 p-1"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = currentDate.toISOString().split("T")[0];

      // Get assignments for this day
      const dayAssignments = allocations.flatMap((resource) =>
        (resource.assignments || [])
          .filter((assignment) => {
            const startDate = new Date(assignment.startDate);
            const endDate = new Date(assignment.endDate);
            return currentDate >= startDate && currentDate <= endDate;
          })
          .map((assignment) => ({ ...assignment, resource }))
      );

      const isToday = currentDate.toDateString() === today.toDateString();
      const isWeekend =
        currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const hasAssignments = dayAssignments.length > 0;

      calendarDays.push(
        <div
          key={day}
          className={`h-32 p-1 border border-line ${
            isToday
              ? "bg-info-soft"
              : isWeekend
              ? "bg-surface-2 "
              : "bg-surface"
          } ${
            hasAssignments
              ? "hover:shadow-sm transition-shadow cursor-pointer"
              : ""
          }`}
          onClick={
            hasAssignments
              ? () => {
                  setSelectedDay(currentDate);
                  setShowDayDetails(true);
                }
              : undefined
          }
        >
          <div
            className={`text-sm font-medium mb-1 ${
              isToday
                ? "text-info"
                : "text-ink"
            }`}
          >
            {day}
          </div>

          <div className="space-y-1 text-xs overflow-y-auto max-h-24 scrollbar-thin">
            {dayAssignments.slice(0, 3).map((assignment) => (
              <div
                key={assignment.id}
                className={`p-1 rounded truncate cursor-default ${
                  assignment.status === "active"
                    ? "bg-success-soft text-success  "
                    : assignment.status === "planned"
                    ? "bg-info-soft text-info  "
                    : "bg-accent-violet-soft text-accent-violet  "
                }`}
                title={`${assignment.resource.name} - ${assignment.title} (${assignment.allocation}%)`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{assignment.resource.name}</span>
                  <span className="text-xs">{assignment.allocation}%</span>
                </div>
                <div className="truncate text-xs opacity-75">
                  {assignment.title}
                </div>
              </div>
            ))}
            {dayAssignments.length > 3 && (
              <div className="text-xs text-muted text-center cursor-default">
                +{dayAssignments.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return calendarDays;
  };

  const getDayAssignments = (date: Date) => {
    return allocations.flatMap((resource) =>
      (resource.assignments || [])
        .filter((assignment) => {
          const startDate = new Date(assignment.startDate);
          const endDate = new Date(assignment.endDate);
          return date >= startDate && date <= endDate;
        })
        .map((assignment) => ({ ...assignment, resource }))
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1
                )
              )
            }
            className="p-2 hover:bg-surface-2 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>

          <h2 className="text-xl font-semibold text-ink">
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
            })}
          </h2>

          {/* Year Dropdown */}
          <Dropdown
            value={String(currentMonth.getFullYear() ?? '')}
            onChange={(__v: string) =>
              setCurrentMonth(
                new Date(parseInt(__v), currentMonth.getMonth())
              )}
            options={Array.from({ length: 21 }, (_, i) => {
              const year = new Date().getFullYear() - 10 + i;
              return { value: String(year), label: String(year) };
            })}
          />

          <button
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1
                )
              )
            }
            className="p-2 hover:bg-surface-2 rounded-lg"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-success rounded"></div>
            <span className="text-sm">Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-info rounded"></div>
            <span className="text-sm">Planned</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-accent-violet rounded"></div>
            <span className="text-sm">Completed</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-sm font-medium text-muted"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {renderCalendarView()}
      </div>

      {/* Resource Details Panel */}
      {selectedResource && (
        <div className="mt-6 p-4 bg-surface-2 rounded-lg">
          <h3 className="text-lg font-semibold text-ink mb-2">
            {selectedResource.name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted">Role:</span>
              <p className="font-medium">{selectedResource.role}</p>
            </div>
            <div>
              <span className="text-muted">
                Department:
              </span>
              <p className="font-medium">{selectedResource.department}</p>
            </div>
            <div>
              <span className="text-muted">
                Availability:
              </span>
              <p
                className={`font-medium ${
                  selectedResource.availability === "available"
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {selectedResource.availability}
              </p>
            </div>
            <div>
              <span className="text-muted">
                Assignments:
              </span>
              <p className="font-medium">
                {selectedResource.assignments.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {showDayDetails && selectedDay && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                {selectedDay.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                onClick={() => setShowDayDetails(false)}
                className="text-muted hover:text-ink-3"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {(() => {
                const dayAssignments = getDayAssignments(selectedDay);

                if (dayAssignments.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Calendar
                        size={48}
                        className="mx-auto text-faint mb-4"
                      />
                      <h4 className="text-lg font-medium text-ink mb-2">
                        No Assignments
                      </h4>
                      <p className="text-muted">
                        No resource assignments scheduled for this day.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-ink">
                        Resource Assignments ({dayAssignments.length})
                      </h4>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-success rounded"></div>
                          <span className="text-sm">Active</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-info rounded"></div>
                          <span className="text-sm">Planned</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-accent-violet rounded"></div>
                          <span className="text-sm">Completed</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {dayAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className={`p-4 rounded-lg border ${
                            assignment.status === "active"
                              ? "bg-success-soft border-success  "
                              : assignment.status === "planned"
                              ? "bg-info-soft border-info  "
                              : "bg-accent-violet-soft border-accent-violet  "
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h5 className="font-semibold text-ink">
                                  {assignment.resource.name}
                                </h5>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    assignment.status === "active"
                                      ? "bg-success-soft text-success  "
                                      : assignment.status === "planned"
                                      ? "bg-info-soft text-info  "
                                      : "bg-accent-violet-soft text-accent-violet  "
                                  }`}
                                >
                                  {assignment.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted">
                                    Role:
                                  </span>
                                  <p className="font-medium">
                                    {assignment.resource.role}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted">
                                    Department:
                                  </span>
                                  <p className="font-medium">
                                    {assignment.resource.department}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted">
                                    Allocation:
                                  </span>
                                  <p className="font-medium">
                                    {assignment.allocation}%
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3">
                                <span className="text-muted">
                                  Assignment:
                                </span>
                                <p className="font-medium mt-1">
                                  {assignment.title}
                                </p>
                              </div>

                              <div className="mt-3 text-xs text-muted">
                                <span>Period: </span>
                                {new Date(
                                  assignment.startDate
                                ).toLocaleDateString()}{" "}
                                -{" "}
                                {new Date(
                                  assignment.endDate
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceManagementPage;
