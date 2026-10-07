"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
import { Spinner } from "@/components/ui/spinner";
import { FormSection, InfoGrid, StatusBadge } from "@/components/ui/form-shell";
import { TabRow } from "@/components/ui/tab-row";
import { humanize, resourceStatusTone } from "@/lib/status-tone";

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
  const resourceId = params.id as string;

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
        return "text-success bg-success-soft  ";
      case "inactive":
        return "text-danger bg-danger-soft  ";
      case "on-leave":
        return "text-bright bg-bright-soft  ";
      default:
        return "text-muted bg-surface-2  ";
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case "expert":
        return "text-accent-violet bg-accent-violet-soft  ";
      case "advanced":
        return "text-info bg-info-soft  ";
      case "intermediate":
        return "text-warning bg-warning-soft  ";
      default:
        return "text-muted bg-surface-2  ";
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
          <Spinner size={32} className="text-bright-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!resource) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <User className="w-16 h-16 text-faint mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink mb-2">
            Resource not found
          </h3>
          <p className="text-muted mb-4">
            The resource you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/resources")}
            className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Back to Resources
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isMaterial = resource.type === "material";

  const typeTone =
    resource.type === "material"
      ? "success"
      : resource.type === "equipment"
        ? "brand"
        : "info";

  const contactRows: [string, React.ReactNode][] = [
    [
      "Type",
      <StatusBadge key="type" label={resource.type} tone={typeTone} />,
    ],
    ...(isMaterial
      ? ([
          ["Cost", `OMR ${resource.hourlyRate}/kg`],
          [
            "Stock Status",
            <StatusBadge
              key="stock"
              label={resource.status === "active" ? "In Stock" : "Out of Stock"}
              tone={resource.status === "active" ? "success" : "danger"}
            />,
          ],
        ] as [string, React.ReactNode][])
      : ([
          ["Email", resource.email],
          ...(resource.phone_number
            ? ([["Phone", resource.phone_number]] as [string, React.ReactNode][])
            : []),
        ] as [string, React.ReactNode][])),
    ["Location", resource.location || "—"],
    ["Department", resource.department || "—"],
  ];

  const performanceRows: [string, React.ReactNode][] = [
    [
      "Rating",
      <span key="rating" className="inline-flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(resource.rating)
                ? "fill-current text-warning"
                : "text-faint"
            }`}
            aria-hidden="true"
          />
        ))}
        <span className="ml-1 tabular-nums">{resource.rating}/5</span>
      </span>,
    ],
    [
      isMaterial ? "Cost per kg" : "Hourly Rate",
      `OMR ${resource.hourlyRate}/${isMaterial ? "kg" : "hr"}`,
    ],
    ...(isMaterial
      ? ([["Capacity", `${resource.totalCapacity} kg`]] as [string, React.ReactNode][])
      : ([
          ["Availability", `${resource.availability}%`],
          ["Utilization", `${resource.utilization}%`],
        ] as [string, React.ReactNode][])),
  ];

  const resourceTabs = [
    { id: "overview", label: "Overview", icon: <User size={16} /> },
    { id: "assignments", label: "Assignments", icon: <Briefcase size={16} /> },
    ...(isMaterial
      ? []
      : [{ id: "skills", label: "Skills", icon: <Award size={16} /> }]),
    { id: "performance", label: "Performance", icon: <TrendingUp size={16} /> },
  ];

  return (
    <DashboardLayout
      title={`${resource.firstName} ${resource.lastName}`}
      subtitle={resource.position}
      backHref="/resources"
      backLabel="Back to Resources"
      actions={
        <>
          <StatusBadge
            label={humanize(resource.status)}
            tone={resourceStatusTone(resource.status)}
          />
          <Link
            href={`/resources/${resourceId}/edit`}
            className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            <Edit size={16} aria-hidden="true" />
            Edit
          </Link>
        </>
      }
    >
      <div className="space-y-6">

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <FormSection title={isMaterial ? "Details" : "Contact"}>
              <div className="[&_dl]:sm:grid-cols-1">
                <InfoGrid rows={contactRows} />
              </div>
            </FormSection>

            <FormSection
              title={isMaterial ? "Material Information" : "Performance"}
            >
              <div className="[&_dl]:sm:grid-cols-1">
                <InfoGrid rows={performanceRows} />
              </div>
            </FormSection>
          </div>

          {/* Right Column - Tabs */}
          <div className="space-y-6 lg:col-span-2">
            <TabRow
              tabs={resourceTabs}
              value={activeTab}
              onChange={(id) => setActiveTab(id as typeof activeTab)}
              className="mb-0"
            />

            <div>

                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-ink mb-4">
                        Current Status
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-surface-2 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Activity className="w-5 h-5 text-info" />
                            <span className="font-medium text-ink">
                              Current Projects
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-ink">
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
                        <div className="p-4 bg-surface-2 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Clock className="w-5 h-5 text-success" />
                            <span className="font-medium text-ink">
                              {resource.type === "material" ? "Total Capacity" : "Total Hours"}
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-ink">
                            {resource.type === "material" 
                              ? `${resource.totalCapacity} kg`
                              : `${assignments.reduce((sum, a) => sum + a.actual_hours, 0)}h`
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-ink mb-4">
                        Recent Activity
                      </h3>
                      <div className="space-y-3">
                        {assignments.slice(0, 3).map((assignment) => (
                          <div
                            key={assignment.assignment_id}
                            className="flex items-center space-x-3 p-3 bg-surface-2 rounded-lg"
                          >
                            <div className="w-2 h-2 bg-info rounded-full"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-ink">
                                Assigned to {assignment.project_name}
                              </p>
                              <p className="text-xs text-muted">
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
                    <h3 className="text-lg font-semibold text-ink mb-4">
                      Current Assignments
                    </h3>
                    <div className="space-y-4">
                      {assignments.filter(
                        (assignment) => assignment.task_status !== "completed"
                      ).length === 0 ? (
                        <p className="text-muted">
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
                              className="p-4 border border-line rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-ink">
                                  {assignment.project_name}
                                </h4>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    assignment.project_status === "execution" ||
                                    assignment.project_status === "active"
                                      ? "text-success bg-success-soft  "
                                      : "text-muted bg-surface-2  "
                                  }`}
                                >
                                  {assignment.project_status}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted">
                                    Role:
                                  </span>
                                  <p className="font-medium text-ink">
                                    {assignment.role}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted">
                                    Allocation:
                                  </span>
                                  <p className="font-medium text-ink">
                                    {assignment.allocation_percentage}%
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted">
                                    Planned Hours:
                                  </span>
                                  <p className="font-medium text-ink">
                                    {assignment.planned_hours}h
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted">
                                    Actual Hours:
                                  </span>
                                  <p className="font-medium text-ink">
                                    {assignment.actual_hours}h
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-muted">
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
                    <h3 className="text-lg font-semibold text-ink mb-4">
                      Skills & Certifications
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-ink mb-3">
                          Technical Skills
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {resource.skills.map((skill, index) => (
                            <div
                              key={index}
                              className="p-3 border border-line rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-ink">
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
                              <div className="flex items-center justify-between text-sm text-muted">
                                <span>{skill.category}</span>
                                <span>{skill.yearsExperience} years</span>
                              </div>
                              {skill.verified && (
                                <div className="flex items-center space-x-1 mt-2">
                                  <CheckCircle className="w-4 h-4 text-success" />
                                  <span className="text-xs text-success">
                                    Verified
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-ink mb-3">
                          Languages
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {resource.languages.map((lang, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-info-soft text-info rounded-full text-sm"
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
                    <h3 className="text-lg font-semibold text-ink mb-4">
                      Performance Analytics
                    </h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-surface-2 rounded-lg text-center">
                          <div className="text-2xl font-bold text-ink mb-1">
                            {performanceMetrics?.overall_rating ||
                              resource?.rating ||
                              0}
                          </div>
                          <div className="text-sm text-muted">
                            Performance Rating
                          </div>
                        </div>
                        <div className="p-4 bg-surface-2 rounded-lg text-center">
                          <div className="text-2xl font-bold text-ink mb-1">
                            {Math.round(
                              performanceMetrics?.utilization_rate ||
                                resource?.utilization ||
                                0
                            )}
                            %
                          </div>
                          <div className="text-sm text-muted">
                            Utilization Rate
                          </div>
                        </div>
                        <div className="p-4 bg-surface-2 rounded-lg text-center">
                          <div className="text-2xl font-bold text-ink mb-1">
                            {Math.round(
                              performanceMetrics?.efficiency_rate || 0
                            )}
                            %
                          </div>
                          <div className="text-sm text-muted">
                            Efficiency Rate
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-ink mb-3">
                          Project Performance
                        </h4>
                        <div className="space-y-3">
                          {projectPerformance.length === 0 ? (
                            <p className="text-muted">
                              No project performance data available
                            </p>
                          ) : (
                            projectPerformance.map((project) => (
                              <div
                                key={project.project_id}
                                className="flex items-center justify-between p-3 bg-surface-2 rounded-lg"
                              >
                                <div>
                                  <p className="font-medium text-ink">
                                    {project.project_name}
                                  </p>
                                  <p className="text-sm text-muted">
                                    {project.completed_tasks}/
                                    {project.tasks_count} tasks completed
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-ink">
                                    {project.total_actual_hours}h /{" "}
                                    {project.total_planned_hours}h
                                  </p>
                                  <p className="text-sm text-muted">
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
                          <h4 className="font-medium text-ink mb-3">
                            Recent Time Entries
                          </h4>
                          <div className="space-y-2">
                            {recentActivity
                              .slice(0, 5)
                              .map((activity, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 bg-surface-2 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-ink">
                                      {activity.task_name}
                                    </p>
                                    <p className="text-xs text-muted">
                                      {activity.project_name}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-ink">
                                      {activity.hours}h
                                    </p>
                                    <p className="text-xs text-muted">
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

    </DashboardLayout>
  );
};

export default ResourceDetailPage;
