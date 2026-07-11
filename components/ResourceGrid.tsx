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
      return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
    if (utilization < 80)
      return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20";
    if (utilization < 100)
      return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20";
    return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20";
  };

  const getAvailabilityColor = (availability: number) => {
    if (availability < 60)
      return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
    if (availability < 80)
      return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20";
    if (availability < 100)
      return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20";
    return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20";
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

  const departments = Array.from(new Set(resources.map((r) => r.department)));

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, position, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Availability
            </label>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Availability</option>
              <option value="0-60">0-60%</option>
              <option value="60-80">60-80%</option>
              <option value="80-100">80-100%</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="name">Name</option>
              <option value="utilization">Utilization</option>
              <option value="rate">Hourly Rate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredResources.length} of {resources.length} resources
        </p>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => (
          <div
            key={resource.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleCardClick(resource)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  resource.type === "material" 
                    ? "bg-green-100 dark:bg-green-900/20" 
                    : "bg-blue-100 dark:bg-blue-900/20"
                }`}>
                  <User className={`w-6 h-6 ${
                    resource.type === "material" 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-blue-600 dark:text-blue-400"
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 
                      className="font-semibold text-gray-900 dark:text-white truncate"
                      title={`${resource.firstName} ${resource.lastName}`}
                    >
                      {resource.firstName} {resource.lastName}
                    </h3>
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
                  <p 
                    className="text-sm text-gray-600 dark:text-gray-400 truncate"
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
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Department & Location */}
            <div className="flex items-center space-x-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{resource.department}</span>
              <span>•</span>
              <MapPin className="w-4 h-4" />
              <span>{resource.location}</span>
            </div>

            {/* Utilization/Capacity - Different display for materials */}
            {resource.type === "material" ? (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stock Status
                  </span>
                  <span
                    className={`text-sm font-semibold px-2 py-1 rounded-full ${
                      resource.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {resource.status === "active" ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
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
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        resource.utilization < 60
                          ? "bg-red-500"
                          : resource.utilization < 80
                          ? "bg-orange-500"
                          : resource.utilization < 100
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(resource.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Availability */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                OMR {resource.hourlyRate}/{resource.type === "material" ? (resource.unit ?? "kg") : "hr"}
              </span>
            </div>

            {/* Skills/Properties - Different display for materials */}
            {resource.type === "material" ? (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Material Properties
                </h4>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {resource.department}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {resource.position}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Material
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{resource.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditResource?.(resource);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Edit Resource"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteResource?.(resource);
                }}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2"
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
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No resources found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResourceGrid;
