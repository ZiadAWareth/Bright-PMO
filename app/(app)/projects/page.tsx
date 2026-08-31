"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Archive,
  Calendar,
  DollarSign,
  Edit,
  Eye,
  FolderOpen,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import axios from "axios";
import { ProjectSetup, ProjectWithRelations } from "@/types/project";
import { ProjectStatus, ProjectPriority } from "@/types/enums";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import MassUpdateModal from "@/components/MassUpdateModal";
import ArchivedProjectsModal from "@/components/ArchivedProjectsModal";
import { Spinner, LoadingState } from "@/components/ui/spinner";
import { ListPagination } from "@/components/ui/list-pagination";
import { ViewToggle, type ListViewMode } from "@/components/ui/view-toggle";
import { PersonCell, personName } from "@/components/ui/person-cell";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useDebounce } from "@/hooks/useDebounce";
import {
  EntityCard,
  EntityCardFooter,
  EntityCardHeader,
  EntityProgress,
  EntityStat,
  EntityStats,
  EmptyState,
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
import {
  burnTone,
  complianceTone,
  humanize,
  priorityTone,
  projectStatusTone,
} from "@/lib/status-tone";

const PAGE_SIZE = 12;
const MANAGE_ROLES = ["PJM", "PMO", "ADMIN"];
const COLUMNS = ["Project", "Status", "Priority", "Manager", "Finish", "Progress"];

interface Portfolio {
  portfolio_id: number;
  name: string;
  description: string | null;
}

interface FilterState {
  search: string;
  portfolio: string;
  status: string;
  priority: string;
}

const EMPTY_FILTERS: FilterState = {
  search: "",
  portfolio: "",
  status: "",
  priority: "",
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const shortDate = (date: Date | string | null | undefined) =>
  date
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(date))
    : "—";

const auth = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const ProjectsPage = () => {
  const router = useRouter();
  const confirm = useConfirm();

  const [activeView, setActiveView] = useState("ADMIN");
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [view, setView] = useState<ListViewMode>("grid");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(filters.search, 300);

  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [projectToEdit, setProjectToEdit] =
    useState<ProjectWithRelations | null>(null);

  const canManage = MANAGE_ROLES.includes(activeView);

  // A narrowed result set can leave the current page past the end of the list.
  useEffect(() => setPage(0), [debouncedSearch, filters.status, filters.portfolio, filters.priority]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("api/projects", auth());
      setProjects(response.data as ProjectWithRelations[]);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProjects = async () => {
    try {
      const response = await axios.get("/api/projects", auth());
      setProjects(response.data);
    } catch (error) {
      console.error("Error refreshing projects:", error);
    }
  };

  useEffect(() => {
    loadProjects();

    axios
      .get(`api/auth/me`, auth())
      .then((res) =>
        axios.get(`api/users/${res.data.user.user_id}`, auth()).then((userRes) =>
          setUserName(
            `${userRes.data.user.account.first_name} ${userRes.data.user.account.last_name}`,
          ),
        ),
      )
      .catch((error) => console.error("Error fetching user details:", error));

    axios
      .get("api/portfolios", auth())
      .then((res) => setPortfolios(res.data))
      .catch((error) => console.error("Error fetching portfolios:", error));
  }, [activeView]);

  /**
   * Role scoping. Technical staff see only projects they are on; executives see
   * only the strategically significant ones. Everyone else sees the lot.
   */
  const roleScoped = useMemo(() => {
    const onTheProject = (project: ProjectWithRelations) =>
      project.tasks?.some((task) =>
        task.assigned_users?.some(
          (a) =>
            `${a.user.account?.first_name} ${a.user.account?.last_name}` ===
            userName,
        ),
      ) ||
      project.team_members?.some(
        (m) =>
          `${m.user.account?.first_name} ${m.user.account?.last_name}` ===
          userName,
      );

    switch (activeView) {
      case "project-manager":
        return projects.filter(
          (p) => personName(p.creator) === userName || onTheProject(p),
        );
      case "technical":
        return projects.filter(onTheProject);
      case "executive":
        return projects.filter(
          (p) => p.strategicValue === "high" || p.budget_amount > 20000000,
        );
      default:
        return projects;
    }
  }, [projects, activeView, userName]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return roleScoped.filter((project) => {
      const matchesSearch =
        !q ||
        project.name.toLowerCase().includes(q) ||
        project.description?.toLowerCase().includes(q) ||
        personName(project.creator).toLowerCase().includes(q);

      return (
        matchesSearch &&
        (!filters.portfolio || project.portfolio?.name === filters.portfolio) &&
        (!filters.status || project.status === filters.status) &&
        (!filters.priority || project.priority === filters.priority)
      );
    });
  }, [roleScoped, debouncedSearch, filters.portfolio, filters.status, filters.priority]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  );

  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.portfolio ? 1 : 0) +
    (filters.priority ? 1 : 0);

  /** A planning project still needs setting up before it has a detail screen worth reading. */
  const needsSetup = (project: ProjectWithRelations) =>
    project.status === "planning";

  /**
   * The seven steps of project setup, in the order the setup screen walks
   * them. Kept here rather than imported so the directory does not depend on
   * the setup screen's internals.
   */
  const SETUP_STEPS: (keyof ProjectSetup)[] = [
    "wbs",
    "schedule",
    "budget",
    "team",
    "risk",
    "baseline",
    "execution",
  ];

  /**
   * How many setup steps are done.
   *
   * A planning project's "Progress 0%" bar is accurate but tells the reader
   * nothing — no work is logged yet because the project has not started. Setup
   * completion is the number that actually moves during planning, so that is
   * what the card shows instead.
   */
  const setupProgress = (project: ProjectWithRelations) => {
    const setup = project.setup;
    if (!setup) return { done: 0, total: SETUP_STEPS.length };
    const done = SETUP_STEPS.filter((step) => Boolean(setup[step])).length;
    return { done, total: SETUP_STEPS.length };
  };

  /**
   * The card / row default: setup while a project is still being planned,
   * the detail screen once it is underway.
   */
  const openProject = (project: ProjectWithRelations) =>
    router.push(
      needsSetup(project)
        ? `/projects/${project.project_id}/setup`
        : `/projects/${project.project_id}`,
    );

  /** The eye icon always means "show me this project", whatever its status. */
  const viewProject = (project: ProjectWithRelations) =>
    router.push(`/projects/${project.project_id}`);

  const handleDelete = async (project: ProjectWithRelations) => {
    const ok = await confirm({
      title: "Delete project?",
      message: (
        <>
          <span className="font-semibold text-ink">{project.name}</span> and all
          of its associated data will be permanently removed. This cannot be
          undone.
        </>
      ),
      confirmText: "Delete project",
      tone: "danger",
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await axios.delete(`api/projects/${project.project_id}`, auth());
      setProjects((prev) =>
        prev.filter((p) => p.project_id !== project.project_id),
      );
      toast.success("Project deleted successfully");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedProjects.length === 0) {
      toast.error("Please select projects to archive");
      return;
    }
    try {
      const response = await axios.post(
        "/api/projects/archive",
        { project_ids: selectedProjects },
        auth(),
      );
      toast.success(response.data.message);
      await refreshProjects();
      setSelectedProjects([]);
    } catch (error: any) {
      console.error("Error archiving projects:", error);
      toast.error(error.response?.data?.error || "Failed to archive projects");
    }
  };

  const toggleSelected = (id: number) =>
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const rowActions = (project: ProjectWithRelations) => (
    <RowActions>
      <RowAction
        icon={Eye}
        label={`View ${project.name}`}
        onClick={() => viewProject(project)}
      />
      {canManage && (
        <>
          <RowAction
            icon={Edit}
            label={`Edit ${project.name}`}
            onClick={() => router.push(`/projects/${project.project_id}/edit`)}
          />
          <RowAction
            icon={Trash2}
            label={`Delete ${project.name}`}
            tone="danger"
            onClick={() => handleDelete(project)}
          />
        </>
      )}
    </RowActions>
  );

  const renderCard = (project: ProjectWithRelations) => {
    const burn = project.budget_amount
      ? (project.actual_cost / project.budget_amount) * 100
      : 0;

    return (
      <EntityCard
        key={project.project_id}
        selected={selectedProjects.includes(project.project_id)}
        onClick={() => openProject(project)}
      >
        {canManage && (
          <label
            className="absolute right-4 top-4 z-10 flex cursor-pointer items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selectedProjects.includes(project.project_id)}
              onChange={() => toggleSelected(project.project_id)}
              aria-label={`Select ${project.name}`}
              className="h-4 w-4 cursor-pointer accent-bright"
            />
          </label>
        )}

        <div className={canManage ? "pr-7" : undefined}>
          <EntityCardHeader
            title={project.name}
            subtitle={project.description}
            badges={
              <>
                <StatusBadge
                  label={humanize(project.status)}
                  tone={projectStatusTone(project.status)}
                />
                <StatusBadge
                  label={humanize(project.priority)}
                  tone={priorityTone(project.priority)}
                />
                {activeView === "PMO" && (
                  <StatusBadge
                    label={humanize(project.compliance)}
                    tone={complianceTone(project.compliance)}
                  />
                )}
                {needsSetup(project) && (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted">
                    <Settings className="h-3 w-3" aria-hidden="true" />
                    Continue setup
                  </span>
                )}
              </>
            }
          />
        </div>

        <EntityStats>
          <EntityStat icon={<Users className="h-3.5 w-3.5" />}>
            {project.team_members?.length ?? 0} members
          </EntityStat>
          <EntityStat icon={<Calendar className="h-3.5 w-3.5" />}>
            {shortDate(project.planned_end_date)}
          </EntityStat>
          <EntityStat icon={<DollarSign className="h-3.5 w-3.5" />}>
            {currency(project.budget_amount)}
          </EntityStat>
        </EntityStats>

        {needsSetup(project) ? (
          (() => {
            const { done, total } = setupProgress(project);
            return (
              <EntityProgress
                label="Setup"
                value={(done / total) * 100}
                display={`${done}/${total}`}
                tone={done === total ? "success" : "brand"}
              />
            );
          })()
        ) : (
          <EntityProgress
            label="Progress"
            value={project.progress_percentage ?? 0}
          />
        )}
        {canManage && (
          <EntityProgress
            label="Budget used"
            value={burn}
            display={`${burn.toFixed(1)}%`}
            tone={burnTone(burn)}
          />
        )}

        <EntityCardFooter
          actions={
            <div onClick={(e) => e.stopPropagation()}>{rowActions(project)}</div>
          }
        >
          <PersonCell
            name={personName(project.manager) || personName(project.creator)}
            email={project.manager?.email ?? project.creator?.email}
            subtitle="Manager"
          />
        </EntityCardFooter>
      </EntityCard>
    );
  };

  const emptyState = (
    <EmptyState
      icon={<FolderOpen className="h-10 w-10" />}
      title="No projects found"
      message={
        activeFilterCount > 0 || filters.search
          ? "Try adjusting your filters to see more results."
          : "No projects are available for your current role."
      }
      action={
        canManage && activeFilterCount === 0 && !filters.search ? (
          <NewButton href="/projects/new" label="New project" />
        ) : activeFilterCount > 0 || filters.search ? (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="text-[13px] font-semibold text-bright hover:text-bright-deep"
          >
            Clear all filters
          </button>
        ) : undefined
      }
    />
  );

  return (
    <ProtectedRoute>
      <DashboardLayout
        title="Projects"
        subtitle="Every project you have access to, across all portfolios."
        onViewChange={setActiveView}
        activeView={activeView}
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setShowArchivedModal(true)}
                  className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-line bg-surface px-3.5 text-[13.5px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Archived</span>
                </button>
                {selectedProjects.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleArchiveSelected}
                      className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-line bg-surface px-3.5 text-[13.5px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Archive className="h-4 w-4" aria-hidden="true" />
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMassUpdateModal(true)}
                      className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-line bg-surface px-3.5 text-[13.5px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                      Mass update
                    </button>
                  </>
                )}
                <NewButton href="/projects/new" label="New project" />
              </>
            )}
          </>
        }
      >
        <div className="space-y-6">
          <FilterBar
            search={filters.search}
            onSearch={(v) => setFilters({ ...filters, search: v })}
            searchPlaceholder="Search projects by name, description or manager…"
            resultLabel={
              isLoading
                ? "Loading…"
                : `${filtered.length} ${filtered.length === 1 ? "project" : "projects"}`
            }
            activeCount={activeFilterCount}
            onClear={() =>
              setFilters({ ...filters, status: "", portfolio: "", priority: "" })
            }
          >
            <FilterSelect
              label="Status"
              value={filters.status || "all"}
              onChange={(v) =>
                setFilters({ ...filters, status: v === "all" ? "" : v })
              }
              options={[
                { value: "all", label: "All statuses" },
                ...Object.values(ProjectStatus).map((status) => ({
                  value: status,
                  label: humanize(status),
                })),
              ]}
            />
            <FilterSelect
              label="Portfolio"
              value={filters.portfolio || "all"}
              onChange={(v) =>
                setFilters({ ...filters, portfolio: v === "all" ? "" : v })
              }
              searchable={portfolios.length > 10}
              options={[
                { value: "all", label: "All portfolios" },
                ...portfolios.map((p) => ({ value: p.name, label: p.name })),
              ]}
            />
            <FilterSelect
              label="Priority"
              value={filters.priority || "all"}
              onChange={(v) =>
                setFilters({ ...filters, priority: v === "all" ? "" : v })
              }
              options={[
                { value: "all", label: "All priorities" },
                ...Object.values(ProjectPriority).map((priority) => ({
                  value: priority,
                  label: humanize(priority),
                })),
              ]}
            />
          </FilterBar>

          {selectedProjects.length > 0 && canManage && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-bright/40 bg-bright-soft px-4 py-3">
              <span className="text-[13px] font-semibold text-bright-deep">
                {selectedProjects.length}{" "}
                {selectedProjects.length === 1 ? "project" : "projects"} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedProjects([])}
                className="text-[12.5px] font-semibold text-bright-deep underline-offset-2 hover:underline"
              >
                Clear selection
              </button>
            </div>
          )}

          {isLoading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            emptyState
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map(renderCard)}
            </div>
          ) : (
            <ListCard>
              <table className="w-full border-collapse">
                <ListHead columns={COLUMNS} />
                <tbody>
                  {visible.length === 0 ? (
                    <ListMessage colSpan={COLUMNS.length + 1}>
                      No projects on this page.
                    </ListMessage>
                  ) : (
                    visible.map((project) => (
                      <ListRow
                        key={project.project_id}
                        onClick={() => openProject(project)}
                      >
                        <td className="max-w-[280px] px-4 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-[13.5px] font-medium text-ink">
                              {project.name}
                            </div>
                            <div className="truncate text-[11.5px] text-faint">
                              {project.portfolio?.name ?? "—"}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="flex items-center gap-2">
                            <StatusBadge
                              label={humanize(project.status)}
                              tone={projectStatusTone(project.status)}
                            />
                            {needsSetup(project) && (
                              <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted">
                                <Settings className="h-3 w-3" aria-hidden="true" />
                                Continue setup
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge
                            label={humanize(project.priority)}
                            tone={priorityTone(project.priority)}
                          />
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          <PersonCell
                            name={
                              personName(project.manager) ||
                              personName(project.creator)
                            }
                            email={
                              project.manager?.email ?? project.creator?.email
                            }
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-ink-2">
                          {shortDate(project.planned_end_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {(() => {
                            const planning = needsSetup(project);
                            const { done, total } = setupProgress(project);
                            const pct = planning
                              ? (done / total) * 100
                              : (project.progress_percentage ?? 0);
                            return (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
                                  <div
                                    className={`h-full rounded-full ${
                                      planning && done === total
                                        ? "bg-success"
                                        : "bg-bright"
                                    }`}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, pct))}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[12px] tabular-nums text-muted">
                                  {planning
                                    ? `${done}/${total}`
                                    : `${Math.round(pct)}%`}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {rowActions(project)}
                        </td>
                      </ListRow>
                    ))
                  )}
                </tbody>
              </table>
            </ListCard>
          )}

          {!isLoading && filtered.length > 0 && (
            <ListPagination
              page={page}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              noun="project"
            />
          )}
        </div>

        <MassUpdateModal
          isOpen={showMassUpdateModal}
          onClose={() => setShowMassUpdateModal(false)}
          selectedProjects={selectedProjects}
          onSuccess={async () => {
            await refreshProjects();
            setSelectedProjects([]);
          }}
        />

        <ArchivedProjectsModal
          isOpen={showArchivedModal}
          onClose={() => setShowArchivedModal(false)}
          onRestore={refreshProjects}
        />

        {isDeleting && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink-solid/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-[14px] border border-line bg-surface p-8 shadow-card-lg">
              <Spinner size={48} />
              <p className="text-[13px] text-muted">Deleting project…</p>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default ProjectsPage;
