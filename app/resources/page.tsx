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
  Trash2,
  MoreHorizontal,
  X,
  Grid,
  List,
} from "lucide-react";
import ResourceGrid from "@/components/ResourceGrid";
import ResourceEditModal from "@/components/ResourceEditModal";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { toast } from "sonner";
import axios from "axios";

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
  const [isLoading, setIsLoading] = useState(true);
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<number | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(
    null
  );

  // Update resourceTabs to only include grid and calendar
  const resourceTabs = [
    {
      id: "grid",
      label: "Grid View",
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
                router.push("/resources/create");
              }
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              action.variant === "primary"
                ? "bg-orange-600 text-white hover:bg-orange-700"
                : "border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
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
    const activeResources = resources.filter(
      (r) => r.status === "active"
    ).length;
    const totalCost = resources.reduce(
      (acc, r) => acc + r.hourlyRate * r.allocatedHours,
      0
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {userRole === "technical"
                  ? "My Utilization"
                  : "Total Resources"}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userRole === "technical" ? "78%" : totalResources}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {userRole === "technical"
                  ? "Current Projects"
                  : "Available Resources"}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userRole === "technical" ? "3" : availableResources}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {userRole === "executive" ? "Resource ROI" : "Overallocation"}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userRole === "executive"
                  ? "4.2x"
                  : `${overallocationPercentage}%`}
              </p>
              {overloadedResourcesCount > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {overloadedResourcesCount} resource
                  {overloadedResourcesCount !== 1 ? "s" : ""} overloaded
                </p>
              )}
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {userRole === "executive"
                  ? "Total Cost/Week"
                  : "Avg Utilization"}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userRole === "executive"
                  ? `OMR ${Math.round(totalCost).toLocaleString()}`
                  : `${avgUtilization}%`}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>
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

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingResourceId(null);
    fetchResources(); // Refresh the resource list
  };

  const handleDeleteResource = (resource: Resource) => {
    setResourceToDelete(resource);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!resourceToDelete) return;

    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(`/api/resources/${resourceToDelete.id}`, {
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Resource Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              {userRole === "admin" &&
                "System-wide resource overview and management"}
              {userRole === "project-manager" &&
                "Manage resources for your projects"}
              {userRole === "technical" &&
                "View your workload and manage your profile"}
              {userRole === "pmo" &&
                "Portfolio resource governance and optimization"}
              {userRole === "executive" &&
                "High-level resource metrics and strategic decisions"}
            </p>
          </div>
          {renderRoleSpecificControls()}
        </div>

        {/* Stats Cards */}
        {renderStatsCards()}

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mb-6">
          <div className="flex items-center space-x-1 p-1 overflow-x-auto whitespace-nowrap">
            {resourceTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "grid") {
                    setShowResourceGrid(true);
                    setShowResourceCalendar(false);
                  } else if (tab.id === "calendar") {
                    fetchResourceCalendar();
                    setShowResourceGrid(false);
                    setShowResourceCalendar(true);
                  }
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Grid View Content */}
          {activeTab === "grid" && showResourceGrid && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Resource Grid View
                </h3>
                <button
                  onClick={() => {
                    setShowResourceGrid(false);
                    setActiveTab("grid");
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>

              <ResourceGrid
                resources={resources}
                onResourceClick={(resource) => {
                  setSelectedResource(resource);
                  // You can add modal or navigation logic here
                }}
                onEditResource={(resource) => {
                  setEditingResourceId(parseInt(resource.id));
                  setShowEditModal(true);
                }}
                onDeleteResource={handleDeleteResource}
              />
            </div>
          )}

          {/* Calendar View Content */}
          {activeTab === "calendar" && showResourceCalendar && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Resource Allocation Calendar
                </h3>
                <button
                  onClick={() => {
                    setShowResourceCalendar(false);
                    setActiveTab("grid");
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>

              <ResourceCalendarView allocations={resourceAllocations} />
            </div>
          )}
        </div>
      </div>

      {/* Resource Edit Modal */}
      <ResourceEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingResourceId(null);
        }}
        resourceId={editingResourceId}
        onSuccess={handleEditSuccess}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setResourceToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Confirm Resource Deletion"
        message={`Are you sure you want to delete ${resourceToDelete?.firstName} ${resourceToDelete?.lastName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
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
          className={`h-32 p-1 border border-gray-200 dark:border-gray-700 ${
            isToday
              ? "bg-blue-50 dark:bg-blue-900/20"
              : isWeekend
              ? "bg-gray-50 dark:bg-gray-900/50"
              : "bg-white dark:bg-gray-800"
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
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-900 dark:text-gray-100"
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
                    ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                    : assignment.status === "planned"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
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
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center cursor-default">
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
            })}
          </h2>

          {/* Year Dropdown */}
          <select
            value={currentMonth.getFullYear()}
            onChange={(e) =>
              setCurrentMonth(
                new Date(parseInt(e.target.value), currentMonth.getMonth())
              )
            }
            className="text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 focus:ring-0"
          >
            {Array.from({ length: 21 }, (_, i) => {
              const year = new Date().getFullYear() - 10 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>

          <button
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1
                )
              )
            }
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm">Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm">Planned</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
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
            className="h-8 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {renderCalendarView()}
      </div>

      {/* Resource Details Panel */}
      {selectedResource && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {selectedResource.name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Role:</span>
              <p className="font-medium">{selectedResource.role}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Department:
              </span>
              <p className="font-medium">{selectedResource.department}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Availability:
              </span>
              <p
                className={`font-medium ${
                  selectedResource.availability === "available"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {selectedResource.availability}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDay.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                onClick={() => setShowDayDetails(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                        className="mx-auto text-gray-400 mb-4"
                      />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Assignments
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        No resource assignments scheduled for this day.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        Resource Assignments ({dayAssignments.length})
                      </h4>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span className="text-sm">Active</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span className="text-sm">Planned</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-500 rounded"></div>
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
                              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700"
                              : assignment.status === "planned"
                              ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                              : "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h5 className="font-semibold text-gray-900 dark:text-white">
                                  {assignment.resource.name}
                                </h5>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    assignment.status === "active"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : assignment.status === "planned"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                  }`}
                                >
                                  {assignment.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Role:
                                  </span>
                                  <p className="font-medium">
                                    {assignment.resource.role}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Department:
                                  </span>
                                  <p className="font-medium">
                                    {assignment.resource.department}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Allocation:
                                  </span>
                                  <p className="font-medium">
                                    {assignment.allocation}%
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Assignment:
                                </span>
                                <p className="font-medium mt-1">
                                  {assignment.title}
                                </p>
                              </div>

                              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
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
