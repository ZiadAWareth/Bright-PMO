"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    AlertTriangle,
    Edit,
    Trash2,
    Eye,
    X,
    Calendar,
    CheckCircle,
    BarChart,
    DollarSign,
    FolderOpen,
    Save,
} from "lucide-react";
import axios from "axios";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import ProjectCalendarView from "@/components/calendar-component";
import { LoadingState, Spinner } from "@/components/ui/spinner";
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
    NewButton,
    RowAction,
    RowActions,
    StatusBadge,
} from "@/components/ui/form-shell";
import { humanize, riskLevelTone, riskStatusTone } from "@/lib/status-tone";

const PAGE_SIZE = 12;
const RISK_COLUMNS = [
    "Risk",
    "Project",
    "Category",
    "Level",
    "Status",
    "Score",
    "Owner",
];

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
    mitigations: RiskMitigation[];
}

interface RiskMitigation {
    mitigation_id: number;
    risk_id: number;
    description: string;
    action_plan: string;
    start_date: string;
    due_date: string;
    status: string;
    responsible_id: number;
    assigned_to: number;
}

interface Project {
    project_id: number;
    name: string;
}

interface User {
    user_id: number;
    account: {
        first_name: string;
        last_name: string;
    };
}

const RiskPage = () => {
    const router = useRouter();
    const [risks, setRisks] = useState<Risk[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [filteredRisks, setFilteredRisks] = useState<Risk[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [riskToDelete, setRiskToDelete] = useState<Risk | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<"grid" | "calendar">("grid");
    const [showGrid, setShowGrid] = useState(true);
    const [showCalendar, setShowCalendar] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [view, setView] = useState<ListViewMode>("grid");
    const [page, setPage] = useState(0);

    // Filtering changes what "page 1" means, so reset rather than stranding the
    // user on a page index that no longer has rows.
    useEffect(() => setPage(0), [search, levelFilter, statusFilter, view]);

    const riskPageCount = Math.max(
        1,
        Math.ceil(filteredRisks.length / PAGE_SIZE),
    );
    const visibleRisks = useMemo(
        () => filteredRisks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [filteredRisks, page],
    );

    // Dropdown options (reuse from create page)
    const approvalStatusOptions = ["Pending", "Approved for Mitigation"];
    const statusOptions = ["Open", "Mitigation in Progress", "Closed"];
    const categoryOptions = [
        "Technical",
        "Schedule",
        "Cost",
        "Resource",
        "Quality",
        "Communication",
        "External",
        "Other",
    ];

    // Prepare risk events for calendar
    const riskEvents = risks.map((risk) => ({
        id: risk.risk_id.toString(),
        title: risk.name,
        startDate: risk.identified_date,
        endDate: risk.identified_date,
        type: "critical" as const,
        isOverdue: risk.status === "Overdue",
        status: risk.currentStatus,
        category: risk.category,
        impact: risk.impact,
        probability: risk.probability,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
    }));

    // Statistics for risks (use only currentStatus)
    const totalRisks = risks.length;
    const openRisks = risks.filter(
        (r) => r.currentStatus.toLowerCase() === "open"
    ).length;
    const closedRisks = risks.filter(
        (r) => r.currentStatus.toLowerCase() === "closed"
    ).length;
    const avgRiskScore =
        risks.length > 0
            ? risks.reduce((acc, r) => acc + (r.riskScore || 0), 0) / risks.length
            : 0;

    const renderStatsCards = () => (
        <StatGrid>
            <StatTile
                label="Total risks"
                value={totalRisks}
                hint={`${openRisks} still open`}
                icon={<AlertTriangle className="h-4 w-4" />}
            />
            <StatTile
                label="Open risks"
                value={openRisks}
                hint="Being tracked"
                icon={<BarChart className="h-4 w-4" />}
                tone={openRisks > 0 ? "warning" : "neutral"}
            />
            <StatTile
                label="Closed risks"
                value={closedRisks}
                hint="Resolved or retired"
                icon={<CheckCircle className="h-4 w-4" />}
                tone={closedRisks > 0 ? "success" : "neutral"}
            />
            <StatTile
                label="Avg. risk score"
                value={avgRiskScore.toFixed(1)}
                hint="Impact × probability"
                icon={<DollarSign className="h-4 w-4" />}
            />
        </StatGrid>
    );

    useEffect(() => {
        setLoading(true);
        axios
            .get("/api/risks", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => {
                // Ensure res.data is an array, if not, use empty array
                console.log(res.data.risks);
                const risksData = Array.isArray(res.data.risks)
                    ? res.data.risks
                    : [];
                setRisks(risksData);
                setFilteredRisks(risksData);
                console.log(risksData);
            })
            .catch((err) => {
                console.error("Failed to fetch risks", err);
                // Set empty arrays on error
                setRisks([]);
                setFilteredRisks([]);
            })
            .finally(() => {
                setLoading(false);
            });

        // Fetch all projects for mapping project_id to name
        axios
            .get("/api/projects", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => {
                setProjects(res.data);
            })
            .catch((err) => {
                console.error("Failed to fetch projects", err);
            });

        // Fetch all users for mapping owner_id to name
        axios
            .get("/api/users", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => {
                setUsers(res.data);
            })
            .catch((err) => {
                console.error("Failed to fetch users", err);
            });
    }, []);

    useEffect(() => {
        const term = search.trim().toLowerCase();
        setFilteredRisks(
            risks.filter((risk) => {
                const matchesSearch =
                    !term ||
                    risk.name.toLowerCase().includes(term) ||
                    risk.category.toLowerCase().includes(term) ||
                    (risk.description ?? "").toLowerCase().includes(term);
                const matchesLevel =
                    levelFilter === "all" || risk.riskLevel === levelFilter;
                const matchesStatus =
                    statusFilter === "all" || risk.status === statusFilter;
                return matchesSearch && matchesLevel && matchesStatus;
            })
        );
    }, [search, risks, levelFilter, statusFilter]);

    const handleDelete = (risk: Risk) => {
        setRiskToDelete(risk);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!riskToDelete) return;
        setIsDeleting(true);
        try {
            await axios.delete(`/api/risks/${riskToDelete.risk_id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setRisks(risks.filter((r) => r.risk_id !== riskToDelete.risk_id));
            setShowDeleteModal(false);
        } catch (err) {
            console.error("Delete failed", err);
        } finally {
            setIsDeleting(false);
        }
    };

    // Edit handlers
    const handleEditRisk = (risk: Risk) => {
        router.push(`/risk/${risk.risk_id}/edit`);
    };
    // Tab navigation config
    // Tab navigation config
    const riskTabs = [
        { id: "grid", label: "Risks", icon: <AlertTriangle size={16} /> },
        { id: "calendar", label: "Calendar", icon: <Calendar size={16} /> },
    ];

    const projectNameOf = (risk: Risk) =>
        projects.find((p) => p.project_id === risk.project_id)?.name ?? "";

    const ownerNameOf = (risk: Risk) => {
        const owner = users.find((u) => u.user_id === risk.owner_id);
        return owner
            ? `${owner.account.first_name} ${owner.account.last_name}`.trim()
            : "";
    };

    const rowActions = (risk: Risk) => (
        <RowActions>
            <RowAction
                icon={Eye}
                label={`View ${risk.name}`}
                onClick={() => router.push(`/risk/${risk.risk_id}`)}
            />
            <RowAction
                icon={Edit}
                label={`Edit ${risk.name}`}
                onClick={() => handleEditRisk(risk)}
            />
            <RowAction
                icon={Trash2}
                label={`Delete ${risk.name}`}
                tone="danger"
                onClick={() => handleDelete(risk)}
            />
        </RowActions>
    );

    const renderCard = (risk: Risk) => (
        <EntityCard
            key={risk.risk_id}
            onClick={() => router.push(`/risk/${risk.risk_id}`)}
        >
            <EntityCardHeader
                title={risk.name}
                subtitle={risk.description}
                badges={
                    <>
                        <StatusBadge
                            label={humanize(risk.riskLevel)}
                            tone={riskLevelTone(risk.riskLevel)}
                        />
                        <StatusBadge
                            label={humanize(risk.currentStatus)}
                            tone={riskStatusTone(risk.currentStatus)}
                        />
                        {risk.category && (
                            <StatusBadge label={risk.category} tone="info" />
                        )}
                    </>
                }
            />

            <EntityStats>
                <EntityStat icon={<FolderOpen className="h-3.5 w-3.5" />}>
                    {projectNameOf(risk) || "No project"}
                </EntityStat>
                <EntityStat icon={<BarChart className="h-3.5 w-3.5" />}>
                    Score {risk.riskScore ?? 0}
                </EntityStat>
            </EntityStats>

            {/*
              * Risk score runs 1–9 (impact × probability, each 1–3), so it is
              * scaled to a percentage for the bar. The raw score stays the
              * printed figure — that is the number people quote.
              */}
            <EntityProgress
                label="Risk score"
                value={((risk.riskScore ?? 0) / 9) * 100}
                display={`${risk.riskScore ?? 0} / 9`}
                tone={
                    riskLevelTone(risk.riskLevel) === "danger"
                        ? "danger"
                        : riskLevelTone(risk.riskLevel) === "warning"
                          ? "warning"
                          : "success"
                }
            />

            <EntityCardFooter
                actions={
                    <div onClick={(e) => e.stopPropagation()}>
                        {rowActions(risk)}
                    </div>
                }
            >
                <PersonCell
                    name={ownerNameOf(risk) || "Unassigned"}
                    subtitle="Owner"
                />
            </EntityCardFooter>
        </EntityCard>
    );

    return (
        <DashboardLayout
            title="Risk Management"
            subtitle="Monitor, track and manage project risks."
            actions={
                <>
                    {activeTab === "grid" && (
                        <ViewToggle value={view} onChange={setView} />
                    )}
                    <NewButton label="New risk" href="/risk/new" />
                </>
            }
        >
            <div className="space-y-6">
                {/* Statistics Cards */}
                {renderStatsCards()}

                <TabRow
                    tabs={riskTabs}
                    value={activeTab}
                    onChange={(id) => {
                        setActiveTab(id as "grid" | "calendar");
                        setShowGrid(id === "grid");
                        setShowCalendar(id === "calendar");
                    }}
                />

                {/* Tab Content */}
                {activeTab === "grid" && showGrid && (
                    <div className="space-y-6">
                        <FilterBar
                            search={search}
                            onSearch={setSearch}
                            searchPlaceholder="Search risks by name, category or description…"
                            resultLabel={
                                loading
                                    ? "Loading…"
                                    : `${filteredRisks.length} ${filteredRisks.length === 1 ? "risk" : "risks"}`
                            }
                            activeCount={
                                (levelFilter !== "all" ? 1 : 0) +
                                (statusFilter !== "all" ? 1 : 0)
                            }
                            onClear={() => {
                                setLevelFilter("all");
                                setStatusFilter("all");
                            }}
                        >
                            <FilterSelect
                                label="Risk level"
                                value={levelFilter}
                                onChange={setLevelFilter}
                                options={[
                                    { value: "all", label: "All levels" },
                                    { value: "high", label: "High" },
                                    { value: "medium", label: "Medium" },
                                    { value: "low", label: "Low" },
                                ]}
                            />
                            <FilterSelect
                                label="Status"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[
                                    { value: "all", label: "All statuses" },
                                    { value: "identified", label: "Identified" },
                                    { value: "assessed", label: "Assessed" },
                                    { value: "monitoring", label: "Monitoring" },
                                    { value: "mitigated", label: "Mitigated" },
                                    { value: "escalated", label: "Escalated" },
                                    { value: "closed", label: "Closed" },
                                ]}
                            />
                        </FilterBar>

                        {loading ? (
                            <LoadingState />
                        ) : filteredRisks.length === 0 ? (
                            <EmptyState
                                icon={<AlertTriangle className="h-10 w-10" />}
                                title="No risks found"
                                message={
                                    risks.length === 0
                                        ? "No risks have been logged yet."
                                        : "Try adjusting your filters to see more results."
                                }
                                action={
                                    risks.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch("");
                                                setLevelFilter("all");
                                                setStatusFilter("all");
                                            }}
                                            className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                                        >
                                            Clear all filters
                                        </button>
                                    ) : (
                                        <NewButton
                                            label="New risk"
                                            href="/risk/new"
                                        />
                                    )
                                }
                            />
                        ) : view === "grid" ? (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {visibleRisks.map(renderCard)}
                            </div>
                        ) : (
                            <ListCard>
                                <table className="w-full border-collapse">
                                    <ListHead columns={RISK_COLUMNS} />
                                    <tbody>
                                        {visibleRisks.length === 0 ? (
                                            <ListMessage
                                                colSpan={RISK_COLUMNS.length + 1}
                                            >
                                                No risks on this page.
                                            </ListMessage>
                                        ) : (
                                            visibleRisks.map((risk) => (
                                                <ListRow
                                                    key={risk.risk_id}
                                                    onClick={() =>
                                                        router.push(
                                                            `/risk/${risk.risk_id}`,
                                                        )
                                                    }
                                                >
                                                    <td className="max-w-[280px] px-4 py-3">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-[13.5px] font-medium text-ink">
                                                                {risk.name}
                                                            </div>
                                                            {risk.description && (
                                                                <div className="truncate text-[11.5px] text-faint">
                                                                    {risk.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-[13.5px] text-ink-2">
                                                        {projectNameOf(risk) || (
                                                            <span className="text-faint">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-[13.5px] text-ink-2">
                                                        {risk.category || (
                                                            <span className="text-faint">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <StatusBadge
                                                            label={humanize(
                                                                risk.riskLevel,
                                                            )}
                                                            tone={riskLevelTone(
                                                                risk.riskLevel,
                                                            )}
                                                        />
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <StatusBadge
                                                            label={humanize(
                                                                risk.currentStatus,
                                                            )}
                                                            tone={riskStatusTone(
                                                                risk.currentStatus,
                                                            )}
                                                        />
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                                                        {risk.riskScore ?? 0}
                                                    </td>
                                                    <td className="max-w-[180px] px-4 py-3">
                                                        {ownerNameOf(risk) ? (
                                                            <PersonCell
                                                                name={ownerNameOf(risk)}
                                                            />
                                                        ) : (
                                                            <span className="text-[13px] text-faint">
                                                                Unassigned
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td
                                                        className="px-4 py-3"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        {rowActions(risk)}
                                                    </td>
                                                </ListRow>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </ListCard>
                        )}

                        {!loading && filteredRisks.length > 0 && (
                            <ListPagination
                                page={page}
                                pageCount={riskPageCount}
                                total={filteredRisks.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setPage}
                                noun="risk"
                            />
                        )}
                    </div>
                )}

                {/* Calendar View Content */}
                {activeTab === "calendar" && showCalendar && (
                    <div className="rounded-[14px] border border-line bg-surface p-6 shadow-card">
                        {loading ? (
                            <LoadingState label="Loading calendar…" />
                        ) : (
                            <ProjectCalendarView
                                events={riskEvents}
                                onEventClick={(event) => {
                                    const risk = risks.find(
                                        (r) => r.risk_id.toString() === event.id,
                                    );
                                    if (risk) router.push(`/risk/${risk.risk_id}`);
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Delete Modal */}
                {showDeleteModal && riskToDelete && (
                    <div
                        className="fixed inset-0 bg-transparent backdrop-blur-xs z-50 flex items-center justify-center"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowDeleteModal(false);
                            }
                        }}
                    >
                        <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-bright-soft rounded-lg">
                                        <AlertTriangle className="h-6 w-6 text-bright" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-ink">
                                        Delete Risk
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="text-faint hover:text-bright"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-muted mb-6">
                                Are you sure you want to delete{" "}
                                <span className="font-semibold text-ink">
                                    {riskToDelete.name}
                                </span>
                                ? This action cannot be undone and all
                                associated data will be permanently removed.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 border border-line rounded-lg text-sm font-medium text-ink-3 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bright disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-bright text-white rounded-lg text-sm font-medium hover:bg-bright-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bright disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? "Deleting..." : "Delete Risk"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}

            </div>
        </DashboardLayout>
    );
};

export default RiskPage;
