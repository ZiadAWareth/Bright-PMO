"use client";

import React, { useState } from "react";
import { Eye, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";

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
            return "text-success bg-success-soft  ";
        if (score < 7)
            return "text-warning bg-warning-soft  ";
        return "text-danger bg-danger-soft  ";
    };
    const getLevelColor = (level: string) => {
        switch (level) {
            case "High":
                return "text-danger bg-danger-soft  ";
            case "Medium":
                return "text-bright bg-bright-soft  ";
            case "Low":
                return "text-success bg-success-soft  ";
            default:
                return "text-muted bg-surface-2  ";
        }
    };

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
                            placeholder="Search by name or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-bright dark:text-white"
                        />
                    </div>
                    {/* Category Filter */}
                    <div>
                        <label className="block text-sm font-medium text-ink-3 mb-1">
                            Category
                        </label>
                        <Dropdown
                          value={String(categoryFilter ?? '')}
                          onChange={(__v: string) => setCategoryFilter(__v)}
                          options={[
                          { value: String("all"), label: "All Categories" },
                          ...categories.map((cat) => ({ value: String(cat), label: cat })),
                        ]}
                        />
                    </div>
                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-ink-3 mb-1">
                            Status
                        </label>
                        <Dropdown
                          value={String(statusFilter ?? '')}
                          onChange={(__v: string) => setStatusFilter(__v)}
                          options={[
                          { value: String("all"), label: "All Statuses" },
                          ...statuses.map((status) => ({ value: String(status), label: status })),
                        ]}
                        />
                    </div>
                    {/* Sort By */}
                    <div>
                        <label className="block text-sm font-medium text-ink-3 mb-1">
                            Sort By
                        </label>
                        <Dropdown
                          value={String(sortBy ?? '')}
                          onChange={(__v: string) =>
                                setSortBy(__v as "name" | "score")}
                          options={[
                          { value: String("name"), label: "Name" },
                          { value: String("score"), label: "Score" },
                        ]}
                        />
                    </div>
                </div>
            </div>
            {/* Results Count */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted">
                    Showing {filteredRisks.length} of {risks.length} risks
                </p>
            </div>
            {/* Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRisks.map((risk) => (
                    <div
                        key={risk.risk_id}
                        className="bg-surface rounded-lg border border-line p-6 hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full"
                        onClick={() => onRiskClick?.(risk)}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="w-12 h-12 bg-bright-soft rounded-full flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-bright" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-ink truncate">
                                        {risk.name}
                                    </h3>
                                    <p className="text-sm text-muted truncate">
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
                            <span className="text-xs px-2 py-1 rounded-full bg-info-soft text-info">
                                {risk.category}
                            </span>
                            <span
                                className={`text-xs px-2 py-1 rounded-full ${getLevelColor(
                                    risk.riskLevel
                                )}`}
                            >
                                Level: {risk.riskLevel}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-info-soft text-info">
                                Impact: {risk.impact}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-accent-violet-soft text-accent-violet">
                                Probability: {risk.probability}
                            </span>
                        </div>

                        {/* Owner, Date, Status Row */}
                        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-muted">
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
                                        ? "bg-success-soft text-success  "
                                        : risk.currentStatus ===
                                          "Mitigation in Progress"
                                        ? "bg-info-soft text-info  "
                                        : "bg-bright-soft text-bright-deep  "
                                }`}
                            >
                                {risk.currentStatus}
                            </span>
                            <span
                                className={`px-2 py-1 rounded-full ${
                                    risk.approvalStatus ===
                                    "Approved for Mitigation"
                                        ? "bg-success-soft text-success  "
                                        : "bg-info-soft text-info  "
                                }`}
                            >
                                {risk.approvalStatus}
                            </span>
                        </div>

                        {/* Description Preview */}
                        <div className="mb-2">
                            <p className="text-xs text-muted line-clamp-2">
                                {risk.description}
                            </p>
                        </div>

                        {/* Top Mitigations */}
                        {risk.mitigations && risk.mitigations.length > 0 && (
                            <div className="mb-2">
                                <h4 className="text-xs font-medium text-ink-3 mb-1">
                                    Top Mitigations
                                </h4>
                                <ul className="list-disc pl-4">
                                    {risk.mitigations
                                        .slice(0, 2)
                                        .map((mit, idx) => (
                                            <li
                                                key={idx}
                                                className="text-xs text-muted truncate"
                                            >
                                                {mit.description ||
                                                    "No description"}
                                            </li>
                                        ))}
                                    {risk.mitigations.length > 2 && (
                                        <li className="text-xs text-faint">
                                            +{risk.mitigations.length - 2} more
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end pt-4 border-t border-line mt-auto">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditRisk && onEditRisk(risk);
                                }}
                                className="p-2 text-faint hover:text-muted hover:bg-surface-2 rounded-lg transition-colors"
                                title="Edit Risk"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRisk && onDeleteRisk(risk);
                                }}
                                className="p-2 text-faint hover:text-danger hover:bg-danger-soft rounded-lg transition-colors ml-2"
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
                    <AlertTriangle className="w-16 h-16 text-bright mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-ink mb-2">
                        No risks found
                    </h3>
                    <p className="text-muted">
                        Try adjusting your search criteria or filters.
                    </p>
                </div>
            )}
        </div>
    );
};

export default RiskGrid;
