"use client";

import React, { useState } from "react";
import { Eye, Edit, Trash2, AlertTriangle } from "lucide-react";

interface Risk {
    risk_id: number;
    project_id: number;
    name: string;
    description: string;
    category: string;
    identified_date: string;
    impact: string;
    probability: string;
    riskLevel: string;
    status: string;
    owner_id: number;
    approvalStatus: string;
    currentStatus: string;
    riskScore: number;
    mitigations: any[];
}

interface RiskGridProps {
    risks: Risk[];
    onRiskClick?: (risk: Risk) => void;
    onEditRisk?: (risk: Risk) => void;
    onDeleteRisk?: (risk: Risk) => void;
    projectNames?: { [projectId: number]: string };
    ownerNames?: { [userId: number]: string };
}

const RiskGrid: React.FC<RiskGridProps> = ({
    risks,
    onRiskClick,
    onEditRisk,
    onDeleteRisk,
    projectNames,
    ownerNames,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState<"name" | "score">("name");

    // Get unique categories and statuses for filters
    const categories = Array.from(new Set(risks.map((r) => r.category)));
    const statuses = Array.from(new Set(risks.map((r) => r.status)));

    // Filtering and sorting
    const filteredRisks = risks
        .filter((risk) => {
            const matchesSearch =
                risk.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                risk.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory =
                categoryFilter === "all" || risk.category === categoryFilter;
            const matchesStatus =
                statusFilter === "all" || risk.status === statusFilter;
            return matchesSearch && matchesCategory && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === "score") return b.riskScore - a.riskScore;
            return a.name.localeCompare(b.name);
        });

    // Color helpers
    const getScoreColor = (score: number) => {
        if (score < 4)
            return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20";
        if (score < 7)
            return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20";
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
    };
    const getLevelColor = (level: string) => {
        switch (level) {
            case "High":
                return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
            case "Medium":
                return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20";
            case "Low":
                return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20";
            default:
                return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20";
        }
    };

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
                            placeholder="Search by name or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    {/* Category Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Category
                        </label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="all">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="all">All Statuses</option>
                            {statuses.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Sort By */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) =>
                                setSortBy(e.target.value as "name" | "score")
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="name">Name</option>
                            <option value="score">Score</option>
                        </select>
                    </div>
                </div>
            </div>
            {/* Results Count */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredRisks.length} of {risks.length} risks
                </p>
            </div>
            {/* Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRisks.map((risk) => (
                    <div
                        key={risk.risk_id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full"
                        onClick={() => onRiskClick?.(risk)}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                        {risk.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                        {projectNames?.[risk.project_id] ||
                                            "Unknown Project"}
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`text-sm font-semibold px-2 py-1 rounded-full ${getScoreColor(
                                    risk.riskScore
                                )}`}
                            >
                                {risk.riskScore}
                            </span>
                        </div>

                        {/* Badges Row */}
                        <div className="flex flex-wrap gap-2 mb-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                {risk.category}
                            </span>
                            <span
                                className={`text-xs px-2 py-1 rounded-full ${getLevelColor(
                                    risk.riskLevel
                                )}`}
                            >
                                Level: {risk.riskLevel}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                Impact: {risk.impact}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                                Probability: {risk.probability}
                            </span>
                        </div>

                        {/* Owner, Date, Status Row */}
                        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>
                                Owner:{" "}
                                {ownerNames?.[risk.owner_id] || "Unknown"}
                            </span>
                            <span>•</span>
                            <span>
                                Created:{" "}
                                {(() => {
                                    const d = new Date(risk.identified_date);
                                    return d.toLocaleDateString("en-GB");
                                })()}
                            </span>
                            <span>•</span>
                            <span
                                className={`px-2 py-1 rounded-full ${
                                    risk.currentStatus === "Closed"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                        : risk.currentStatus ===
                                          "Mitigation in Progress"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                                }`}
                            >
                                {risk.currentStatus}
                            </span>
                            <span
                                className={`px-2 py-1 rounded-full ${
                                    risk.approvalStatus ===
                                    "Approved for Mitigation"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                }`}
                            >
                                {risk.approvalStatus}
                            </span>
                        </div>

                        {/* Description Preview */}
                        <div className="mb-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {risk.description}
                            </p>
                        </div>

                        {/* Top Mitigations */}
                        {risk.mitigations && risk.mitigations.length > 0 && (
                            <div className="mb-2">
                                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Top Mitigations
                                </h4>
                                <ul className="list-disc pl-4">
                                    {risk.mitigations
                                        .slice(0, 2)
                                        .map((mit, idx) => (
                                            <li
                                                key={idx}
                                                className="text-xs text-gray-600 dark:text-gray-400 truncate"
                                            >
                                                {mit.description ||
                                                    "No description"}
                                            </li>
                                        ))}
                                    {risk.mitigations.length > 2 && (
                                        <li className="text-xs text-gray-400">
                                            +{risk.mitigations.length - 2} more
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditRisk && onEditRisk(risk);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Edit Risk"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRisk && onDeleteRisk(risk);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors ml-2"
                                title="Delete Risk"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {/* Empty State */}
            {filteredRisks.length === 0 && (
                <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No risks found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Try adjusting your search criteria or filters.
                    </p>
                </div>
            )}
        </div>
    );
};

export default RiskGrid;
