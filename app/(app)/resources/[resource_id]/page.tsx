"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ResourceEditModal from "@/components/ResourceEditModal";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  DollarSign,
  Clock,
  Star,
  Calendar,
  Edit,
  ArrowLeft,
  TrendingUp,
  Award,
  Briefcase,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface Resource {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone_number: string;
  position: string;
  department: string;
  skills: Array<{
    name: string;
    level: "beginner" | "intermediate" | "advanced" | "expert";
    category: string;
    verified: boolean;
    yearsExperience: number;
  }>;
  hourlyRate: number;
  availability: number;
  utilization: number;
  currentProjects: Array<{
    projectId: string;
    projectName: string;
    role: string;
    allocation: number;
    startDate: Date;
    endDate: Date;
    status: "active" | "completed" | "planned";
  }>;
  totalCapacity: number;
  allocatedHours: number;
  status: "active" | "inactive" | "on-leave" | "contractor";
  location: string;
  manager: string;
  startDate: Date;
  profileImage?: string;
  languages: string[];
  costCenter: string;
  rating: number;
  type: "labor" | "equipment" | "material"; // Resource type
}

interface ResourceAssignment {
  assignment_id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  project_status: string;
  task_id: number;
  task_name: string;
  task_description: string;
  role: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string;
  progress: number;
  planned_hours: number;
  actual_hours: number;
  task_status: string;
  task_priority: string;
  project_start_date: string;
  project_end_date: string;
  created_at: string;
  updated_at: string;
}

interface PerformanceMetrics {
  overall_rating: number;
  efficiency_rate: number;
  utilization_rate: number;
  on_time_completion_rate: number;
  total_planned_hours: number;
  total_actual_hours: number;
  total_time_logged: number;
}

interface ProjectPerformance {
  project_id: number;
  project_name: string;
  project_status: string;
  total_planned_hours: number;
  total_actual_hours: number;
  average_progress: number;
  completion_rate: number;
  efficiency: number;
  tasks_count: number;
  completed_tasks: number;
}

interface RecentActivity {
  date: string;
  hours: number;
  description: string;
  task_name: string;
  project_name: string;
  created_at: string;
}

const ResourceDetailPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const resourceId = params.resource_id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics | null>(null);
  const [projectPerformance, setProjectPerformance] = useState<
    ProjectPerformance[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "assignments" | "skills" | "performance"
  >("overview");
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (resourceId) {
      fetchResourceDetails();
      fetchResourceAssignments();
      fetchResourcePerformance();
    }
  }, [resourceId]);

  const fetchResourceDetails = async () => {
    try {
      const token = localStorage.getItem("token");

      // Fetch basic resource details
      const response = await fetch(`/api/resources/${resourceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Transform API data to match our interface
        const transformedResource: Resource = {
          id: data.resource_id.toString(),
          firstName: data.name.split(" ")[0] || "",
          lastName: data.name.split(" ").slice(1).join(" ") || "",
          email: data.email || "No email provided",
          phone_number: data.phone_number || "No phone number provided",
          position: data.role,
          department: data.department,
          skills: getSkillsFromData(data.skills, data.role, data.department),
          hourlyRate: data.rate,
          availability: data.availability_status === "available" ? 100 : 0,
          utilization: data.current_utilization || 0,
          currentProjects: [],
          totalCapacity: data.capacity || 40,
          allocatedHours: data.total_actual_hours || 0,
          status:
            data.availability_status === "inactive" ? "inactive" : "active",
          location: data.location || "Not specified",
          manager: "Department Manager",
          startDate: new Date(data.created_at),
          languages: data.skills?.Languages?.map((lang: any) => lang.name) || [
            "Arabic",
            "English",
          ],
          costCenter: `${data.department.toUpperCase()}-${data.resource_id}`,
          rating: data.rating || 0,
          type: data.type || "labor", // Add resource type
        };
        setResource(transformedResource);
      } else {
        toast.error("Failed to fetch resource details");
      }
    } catch (error) {
      console.error("Error fetching resource:", error);
      toast.error("Failed to fetch resource details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResourceAssignments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/resources/${resourceId}/assignments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      } else {
        console.warn("Failed to fetch resource assignments, using empty array");
        setAssignments([]);
      }
    } catch (error) {
      console.error("Error fetching resource assignments:", error);
      setAssignments([]);
    }
  };

  const fetchResourcePerformance = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/resources/${resourceId}/performance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPerformanceMetrics(data.performance_metrics);
        setProjectPerformance(data.project_performance || []);
        setRecentActivity(data.recent_activity || []);
      } else {
        console.warn("Failed to fetch resource performance data");
      }
    } catch (error) {
      console.error("Error fetching resource performance:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20";
      case "inactive":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
      case "on-leave":
        return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20";
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case "expert":
        return "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20";
      case "advanced":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20";
      case "intermediate":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20";
    }
  };

  const getSkillsFromData = (
    skillsData: any,
    role: string,
    department: string
  ) => {
    try {
      // If skillsData is already an object with Skills array
      if (skillsData && typeof skillsData === "object" && skillsData.Skills) {
        return skillsData.Skills.map((skill: any, index: number) => ({
          name: skill.name,
          level: skill.proficiency || "intermediate",
          category: skill.category || "Technical",
          verified: true,
          yearsExperience: skill.yearsExperience || 2,
        }));
      }

      // If skillsData is a string, try to parse it
      if (skillsData && typeof skillsData === "string") {
        const parsed = JSON.parse(skillsData);
        if (parsed.Skills) {
          return parsed.Skills.map((skill: any, index: number) => ({
            name: skill.name,
            level: skill.proficiency || "intermediate",
            category: skill.category || "Technical",
            verified: true,
            yearsExperience: skill.yearsExperience || 2,
          }));
        }
      }

      // If skillsData is an array
      if (Array.isArray(skillsData)) {
        return skillsData.map((skill: any) => ({
          name: skill.name || skill,
          level: skill.proficiency || skill.level || "intermediate",
          category: skill.category || "Technical",
          verified: skill.verified !== undefined ? skill.verified : true,
          yearsExperience: skill.yearsExperience || 2,
        }));
      }
    } catch (e) {
      console.log("Failed to parse skills data, using fallback");
    }

    // Fallback skills based on role and department
    const fallbackSkills = [
      {
        name: "Project Management",
        level: "intermediate" as const,
        category: "Management",
        verified: true,
        yearsExperience: 3,
      },
      {
        name: "Construction Safety",
        level: "advanced" as const,
        category: "Safety",
        verified: true,
        yearsExperience: 5,
      },
      {
        name: "Quality Control",
        level: "intermediate" as const,
        category: "Quality",
        verified: true,
        yearsExperience: 2,
      },
    ];

    // Add role-specific skills
    if (role.toLowerCase().includes("supervisor")) {
      fallbackSkills.push({
        name: "Team Leadership",
        level: "advanced" as const,
        category: "Leadership",
        verified: true,
        yearsExperience: 4,
      });
    }

    if (role.toLowerCase().includes("engineer")) {
      fallbackSkills.push({
        name: "AutoCAD",
        level: "advanced" as const,
        category: "Technical",
        verified: true,
        yearsExperience: 6,
      });
    }

    return fallbackSkills;
  };

  // Handle tab navigation for material resources (skip skills tab)
  useEffect(() => {
    if (resource?.type === "material" && activeTab === "skills") {
      setActiveTab("performance");
    }
  }, [resource?.type, activeTab]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!resource) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Resource not found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The resource you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/resources")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Resources
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/resources")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {resource.firstName} {resource.lastName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {resource.position}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                resource.status
              )}`}
            >
              {resource.status.charAt(0).toUpperCase() +
                resource.status.slice(1)}
            </span>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  resource.type === "material" 
                    ? "bg-green-100 dark:bg-green-900/20" 
                    : resource.type === "equipment"
                    ? "bg-purple-100 dark:bg-purple-900/20"
                    : "bg-blue-100 dark:bg-blue-900/20"
                }`}>
                  <User className={`w-8 h-8 ${
                    resource.type === "material" 
                      ? "text-green-600 dark:text-green-400" 
                      : resource.type === "equipment"
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-blue-600 dark:text-blue-400"
                  }`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {resource.firstName} {resource.lastName}
                    </h2>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      resource.type === "material" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : resource.type === "equipment"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}>
                      {resource.type}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {resource.position}
                  </p>
                </div>
              </div>

              {/* Contact Information / Material Details */}
              <div className="space-y-3">
                {resource.type === "material" ? (
                  <>
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        OMR {resource.hourlyRate}/kg
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Stock Status: {resource.status === "active" ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {resource.email}
                      </span>
                    </div>
                    {resource.phone_number && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {resource.phone_number}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {resource.location}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {resource.department}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {resource.type === "material" ? "Material Information" : "Performance"}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Rating
                  </span>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(resource.rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                      {resource.rating}/5
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {resource.type === "material" ? "Cost per kg" : "Hourly Rate"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    OMR {resource.hourlyRate}/{resource.type === "material" ? "kg" : "hr"}
                  </span>
                </div>
                {resource.type === "material" ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Capacity
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {resource.totalCapacity} kg
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Availability
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {resource.availability}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Utilization
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {resource.utilization}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {[
                  { id: "overview", label: "Overview", icon: User },
                  { id: "assignments", label: "Assignments", icon: Briefcase },
                  ...(resource.type !== "material" ? [{ id: "skills", label: "Skills", icon: Award }] : []),
                  { id: "performance", label: "Performance", icon: TrendingUp },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Current Status
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              Current Projects
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {
                              new Set(
                                assignments
                                  .filter(
                                    (assignment) =>
                                      assignment.task_status !== "completed"
                                  )
                                  .map((assignment) => assignment.project_id)
                              ).size
                            }
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Clock className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {resource.type === "material" ? "Total Capacity" : "Total Hours"}
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {resource.type === "material" 
                              ? `${resource.totalCapacity} kg`
                              : `${assignments.reduce((sum, a) => sum + a.actual_hours, 0)}h`
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Recent Activity
                      </h3>
                      <div className="space-y-3">
                        {assignments.slice(0, 3).map((assignment) => (
                          <div
                            key={assignment.assignment_id}
                            className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Assigned to {assignment.project_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {assignment.role} •{" "}
                                {assignment.allocation_percentage}% allocation
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "assignments" && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Current Assignments
                    </h3>
                    <div className="space-y-4">
                      {assignments.filter(
                        (assignment) => assignment.task_status !== "completed"
                      ).length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">
                          No current assignments
                        </p>
                      ) : (
                        assignments
                          .filter(
                            (assignment) =>
                              assignment.task_status !== "completed"
                          )
                          .map((assignment) => (
                            <div
                              key={assignment.assignment_id}
                              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {assignment.project_name}
                                </h4>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    assignment.project_status === "execution" ||
                                    assignment.project_status === "active"
                                      ? "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20"
                                      : "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20"
                                  }`}
                                >
                                  {assignment.project_status}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Role:
                                  </span>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {assignment.role}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Allocation:
                                  </span>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {assignment.allocation_percentage}%
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Planned Hours:
                                  </span>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {assignment.planned_hours}h
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Actual Hours:
                                  </span>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {assignment.actual_hours}h
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                {new Date(
                                  assignment.start_date
                                ).toLocaleDateString()}{" "}
                                -{" "}
                                {new Date(
                                  assignment.end_date
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "skills" && resource.type !== "material" && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Skills & Certifications
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Technical Skills
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {resource.skills.map((skill, index) => (
                            <div
                              key={index}
                              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {skill.name}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelColor(
                                    skill.level
                                  )}`}
                                >
                                  {skill.level}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                <span>{skill.category}</span>
                                <span>{skill.yearsExperience} years</span>
                              </div>
                              {skill.verified && (
                                <div className="flex items-center space-x-1 mt-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    Verified
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Languages
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {resource.languages.map((lang, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "performance" && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Performance Analytics
                    </h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            {performanceMetrics?.overall_rating ||
                              resource?.rating ||
                              0}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Performance Rating
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            {Math.round(
                              performanceMetrics?.utilization_rate ||
                                resource?.utilization ||
                                0
                            )}
                            %
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Utilization Rate
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            {Math.round(
                              performanceMetrics?.efficiency_rate || 0
                            )}
                            %
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Efficiency Rate
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Project Performance
                        </h4>
                        <div className="space-y-3">
                          {projectPerformance.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400">
                              No project performance data available
                            </p>
                          ) : (
                            projectPerformance.map((project) => (
                              <div
                                key={project.project_id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                              >
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {project.project_name}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {project.completed_tasks}/
                                    {project.tasks_count} tasks completed
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {project.total_actual_hours}h /{" "}
                                    {project.total_planned_hours}h
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {Math.round(project.average_progress)}%
                                    progress
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {recentActivity.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            Recent Time Entries
                          </h4>
                          <div className="space-y-2">
                            {recentActivity
                              .slice(0, 5)
                              .map((activity, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {activity.task_name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {activity.project_name}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {activity.hours}h
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(
                                        activity.date
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Edit Modal */}
      <ResourceEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        resourceId={parseInt(resourceId)}
        onSuccess={() => {
          setShowEditModal(false);
          fetchResourceDetails(); // Refresh the resource data
        }}
      />
    </DashboardLayout>
  );
};

export default ResourceDetailPage;
