"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Clock,
  DollarSign,
  MapPin,
  Star,
  Calendar,
  Edit,
  Plus,
  Trash2,
} from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";

interface Resource {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
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
  availability: number; // percentage 0-100
  utilization: number; // percentage 0-100
  currentProjects: Array<{
    projectId: string;
    projectName: string;
    role: string;
    allocation: number;
    startDate: Date;
    endDate: Date;
    status: "active" | "completed" | "planned";
  }>;
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

interface ResourceGridProps {
  resources: Resource[];
  onResourceClick?: (resource: Resource) => void;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resource: Resource) => void;
}

const ResourceGrid: React.FC<ResourceGridProps> = ({
  resources,
  onResourceClick,
  onEditResource,
  onDeleteResource,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "utilization" | "rate">("name");

  const handleCardClick = (resource: Resource) => {
    router.push(`/resources/${resource.id}`);
  };

  // Filter and sort resources
  const filteredResources = resources
    .filter((resource) => {
      const fullName =
        `${resource.firstName} ${resource.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        resource.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.skills.some((skill) =>
          skill.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      const matchesDepartment =
        departmentFilter === "all" || resource.department === departmentFilter;

      // Availability filter logic
      let matchesAvailability = true;
      if (availabilityFilter !== "all") {
        const [min, max] = availabilityFilter.split("-").map(Number);
        matchesAvailability =
          resource.availability >= min && resource.availability <= max;
      }

      return matchesSearch && matchesDepartment && matchesAvailability;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "utilization":
          return b.utilization - a.utilization;
        case "rate":
          return b.hourlyRate - a.hourlyRate;
        default:
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          );
      }
    });

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 60)
      return "text-danger bg-danger-soft  ";
    if (utilization < 80)
      return "text-bright bg-bright-soft  ";
    if (utilization < 100)
      return "text-warning bg-warning-soft  ";
    return "text-success bg-success-soft  ";
  };

  const getAvailabilityColor = (availability: number) => {
    if (availability < 60)
      return "text-danger bg-danger-soft  ";
    if (availability < 80)
      return "text-bright bg-bright-soft  ";
    if (availability < 100)
      return "text-warning bg-warning-soft  ";
    return "text-success bg-success-soft  ";
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

  const departments = Array.from(new Set(resources.map((r) => r.department)));

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-surface rounded-lg border border-line p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, position, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info dark:text-white"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-1">
              Department
            </label>
            <Dropdown
              value={String(departmentFilter ?? '')}
              onChange={(__v: string) => setDepartmentFilter(__v)}
              options={[
              { value: String("all"), label: "All Departments" },
              ...departments.map((dept) => ({ value: String(dept), label: dept })),
            ]}
            />
          </div>

          {/* Availability Filter */}
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-1">
              Availability
            </label>
            <Dropdown
              value={String(availabilityFilter ?? '')}
              onChange={(__v: string) => setAvailabilityFilter(__v)}
              options={[
              { value: String("all"), label: "All Availability" },
              { value: String("0-60"), label: "0-60%" },
              { value: String("60-80"), label: "60-80%" },
              { value: String("80-100"), label: "80-100%" },
            ]}
            />
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-1">
              Sort By
            </label>
            <Dropdown
              value={String(sortBy ?? '')}
              onChange={(__v: string) => setSortBy(__v as any)}
              options={[
              { value: String("name"), label: "Name" },
              { value: String("utilization"), label: "Utilization" },
              { value: String("rate"), label: "Hourly Rate" },
            ]}
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Showing {filteredResources.length} of {resources.length} resources
        </p>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => (
          <div
            key={resource.id}
            className="bg-surface rounded-lg border border-line p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleCardClick(resource)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  resource.type === "material" 
                    ? "bg-success-soft " 
                    : "bg-info-soft "
                }`}>
                  <User className={`w-6 h-6 ${
                    resource.type === "material" 
                      ? "text-success" 
                      : "text-info"
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 
                      className="font-semibold text-ink truncate"
                      title={`${resource.firstName} ${resource.lastName}`}
                    >
                      {resource.firstName} {resource.lastName}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      resource.type === "material" 
                        ? "bg-success-soft text-success  "
                        : resource.type === "equipment"
                        ? "bg-accent-violet-soft text-accent-violet  "
                        : "bg-info-soft text-info  "
                    }`}>
                      {resource.type}
                    </span>
                  </div>
                  <p 
                    className="text-sm text-muted truncate"
                    title={resource.position}
                  >
                    {resource.position}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(resource.rating)
                        ? "text-warning fill-current"
                        : "text-faint "
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Department & Location */}
            <div className="flex items-center space-x-2 mb-4 text-sm text-muted">
              <span>{resource.department}</span>
              <span>•</span>
              <MapPin className="w-4 h-4" />
              <span>{resource.location}</span>
            </div>

            {/* Utilization/Capacity - Different display for materials */}
            {resource.type === "material" ? (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ink-3">
                    Stock Status
                  </span>
                  <span
                    className={`text-sm font-semibold px-2 py-1 rounded-full ${
                      resource.status === "active"
                        ? "bg-success-soft text-success  "
                        : "bg-danger-soft text-danger  "
                    }`}
                  >
                    {resource.status === "active" ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted">
                  <Clock className="w-4 h-4" />
                  <span>
                    Quantity: {resource.quantity ?? resource.totalCapacity} {resource.unit ?? "kg"}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* Utilization */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink-3">
                      Utilization
                    </span>
                    <span
                      className={`text-sm font-semibold px-2 py-1 rounded-full ${getUtilizationColor(
                        resource.utilization
                      )}`}
                    >
                      {resource.utilization}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-3 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        resource.utilization < 60
                          ? "bg-danger"
                          : resource.utilization < 80
                          ? "bg-bright"
                          : resource.utilization < 100
                          ? "bg-warning"
                          : "bg-success"
                      }`}
                      style={{ width: `${Math.min(resource.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Availability */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink-3">
                      Availability
                    </span>
                    <span
                      className={`text-sm font-semibold px-2 py-1 rounded-full ${getAvailabilityColor(
                        resource.availability
                      )}`}
                    >
                      {resource.availability}%
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Rate - Different display for materials */}
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign className="w-4 h-4 text-faint" />
              <span className="text-sm font-medium text-ink">
                OMR {resource.hourlyRate}/{resource.type === "material" ? (resource.unit ?? "kg") : "hr"}
              </span>
            </div>

            {/* Skills/Properties - Different display for materials */}
            {resource.type === "material" ? (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-ink-3 mb-2">
                  Material Properties
                </h4>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs px-2 py-1 rounded-full bg-surface-2 text-ink-2">
                    {resource.department}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-info-soft text-info">
                    {resource.position}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-success-soft text-success">
                    Material
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-ink-3 mb-2">
                  Top Skills
                </h4>
                <div className="flex flex-wrap gap-1">
                  {resource.skills.slice(0, 3).map((skill, index) => (
                    <span
                      key={index}
                      className={`text-xs px-2 py-1 rounded-full ${getSkillLevelColor(
                        skill.level
                      )}`}
                      title={`${skill.name} - ${skill.level} (${skill.yearsExperience} years)`}
                    >
                      {skill.name}
                    </span>
                  ))}
                  {resource.skills.length > 3 && (
                    <span className="text-xs text-muted">
                      +{resource.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end pt-4 border-t border-line">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditResource?.(resource);
                }}
                className="p-2 text-faint hover:text-muted hover:bg-surface-2 rounded-lg transition-colors"
                title="Edit Resource"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteResource?.(resource);
                }}
                className="p-2 text-faint hover:text-danger hover:bg-danger-soft rounded-lg transition-colors ml-2"
                title="Delete Resource"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-faint mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink mb-2">
            No resources found
          </h3>
          <p className="text-muted">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResourceGrid;
