"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Edit, Eye, FolderOpen, Shield, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPagination } from "@/components/ui/list-pagination";
import { ViewToggle, type ListViewMode } from "@/components/ui/view-toggle";
import { PersonCell } from "@/components/ui/person-cell";
import { LoadingState, Spinner } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/useDebounce";
import { PortfolioWithRelations } from "@/types/portfolio";
import useCurrentUser from "@/hooks/useCurrentUser";
import { PortfolioStatus, PortfolioPriority } from "@/types/enums";
import {
  DeletePortfolioDialog,
  type ProjectInfo,
} from "./_components/DeletePortfolioDialog";
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
  humanize,
  portfolioStatusTone,
  priorityTone,
} from "@/lib/status-tone";

const PAGE_SIZE = 12;
const VIEW_ROLES = ["PMO", "PJM", "ADMIN", "IT", "DIR"];
const MANAGE_ROLES = ["PMO", "PJM", "ADMIN", "DIR"];
const COLUMNS = ["Portfolio", "Status", "Priority", "Manager", "Projects", "Progress"];
const ACTIVE_STATUSES = [
  "planning",
  "execution",
  "pending_approval",
  "approved",
  "on_hold",
];

interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  role: { role_name?: string; name?: string };
}

interface FilterState {
  search: string;
  status: string;
  priority: string;
  tag: string;
}

const EMPTY_FILTERS: FilterState = {
  search: "",
  status: "",
  priority: "",
  tag: "",
};

const auth = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default function PortfoliosPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [view, setView] = useState<ListViewMode>("grid");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(filters.search, 300);

  const [portfolioToDelete, setPortfolioToDelete] =
    useState<PortfolioWithRelations | null>(null);
  const [deleteProjects, setDeleteProjects] = useState<ProjectInfo[]>([]);
  const [hasActiveProjects, setHasActiveProjects] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /*
   * The role comes from the shared cache, not this page's own /api/auth/me
   * call. Two reasons: after the first screen of a session the cache answers
   * synchronously, so the edit, delete and "New portfolio" controls are present
   * in the first paint instead of popping in a beat later; and `roleLoading`
   * keeps "not known yet" distinct from "not permitted", which a plain
   * `user === null` check cannot express.
   *
   * The page still fetches the full user separately for `canView`, which needs
   * the record itself rather than just the role name.
   */
  const { userRole, roleLoading } = useCurrentUser();
  const roleName = userRole ?? user?.role?.role_name ?? user?.role?.name;
  const canView = Boolean(roleName && VIEW_ROLES.includes(roleName));

  // While the role is unknown, render neither the permitted nor the denied
  // state — showing the denied one first is what caused the flash.
  const canManage =
    !roleLoading && Boolean(roleName && MANAGE_ROLES.includes(roleName));
  const isAdmin = roleName === "ADMIN";

  useEffect(() => setPage(0), [debouncedSearch, filters.status, filters.priority, filters.tag]);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found. Please log in.");
        return;
      }
      const response = await axios.get("/api/portfolios", auth());
      setPortfolios(response.data);
    } catch (error) {
      console.error("Error fetching portfolios:", error);
      toast.error("Failed to fetch portfolios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    axios
      .get("/api/auth/me", auth())
      .then((res) => setUser(res.data.user))
      .catch((error) => {
        console.error("Error fetching user data:", error);
        setUser(null);
      });
    fetchPortfolios();
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    portfolios.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [portfolios]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return portfolios.filter((portfolio) => {
      const matchesSearch =
        !q ||
        portfolio.name.toLowerCase().includes(q) ||
        portfolio.description?.toLowerCase().includes(q) ||
        `${portfolio.manager?.first_name ?? ""} ${portfolio.manager?.last_name ?? ""}`
          .toLowerCase()
          .includes(q) ||
        portfolio.tags?.some((tag) => tag.toLowerCase().includes(q));

      return (
        matchesSearch &&
        (!filters.status || portfolio.status === filters.status) &&
        (!filters.priority || portfolio.priority === filters.priority) &&
        (!filters.tag || portfolio.tags?.includes(filters.tag))
      );
    });
  }, [portfolios, debouncedSearch, filters.status, filters.priority, filters.tag]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  );

  const activeFilterCount =
    (filters.status ? 1 : 0) + (filters.priority ? 1 : 0) + (filters.tag ? 1 : 0);

  const managerName = (portfolio: PortfolioWithRelations) =>
    `${portfolio.manager?.first_name ?? ""} ${portfolio.manager?.last_name ?? ""}`.trim();

  const handleDeleteClick = (portfolio: PortfolioWithRelations) => {
    if (!canManage) {
      toast.error("You don't have permission to delete portfolios");
      return;
    }

    // The API has returned both full and minimal project rows here, so fall
    // back through the shapes rather than assuming `name` is present.
    const projects: ProjectInfo[] = (portfolio.projects ?? []).map((p: any) => ({
      project_id: p.project_id,
      name: p.name || p.project_name || `Project #${p.project_id}`,
      status: p.status || "unknown",
    }));

    setPortfolioToDelete(portfolio);
    setDeleteProjects(projects);
    setHasActiveProjects(
      projects.some((p) => ACTIVE_STATUSES.includes(p.status)),
    );
  };

  const closeDeleteDialog = () => {
    setPortfolioToDelete(null);
    setDeleteProjects([]);
    setHasActiveProjects(false);
  };

  const handleDeleteConfirm = async (forceDelete = false) => {
    if (!portfolioToDelete || (hasActiveProjects && !forceDelete)) return;

    setIsDeleting(true);
    try {
      const response = await axios.delete(
        `/api/portfolios/${portfolioToDelete.portfolio_id}${forceDelete ? "?force=true" : ""}`,
        auth(),
      );

      if (response.status === 200) {
        setPortfolios((prev) =>
          prev.filter(
            (p) => p.portfolio_id !== portfolioToDelete.portfolio_id,
          ),
        );
        toast.success(
          forceDelete
            ? "Portfolio force deleted successfully (including active projects)"
            : "Portfolio deleted successfully",
        );
        closeDeleteDialog();
      }
    } catch (error: any) {
      console.error("Error deleting portfolio:", error);
      const message =
        error.response?.data?.message ??
        error.response?.data?.error ??
        "Failed to delete portfolio. Please try again.";

      // The server is the authority on what is blocking the delete: when it
      // rejects with the live list of active projects, show that rather than
      // the stale set we derived from the row.
      if (
        error.response?.status === 403 &&
        error.response?.data?.activeProjects &&
        !forceDelete
      ) {
        setDeleteProjects(error.response.data.activeProjects);
        setHasActiveProjects(true);
      } else {
        closeDeleteDialog();
      }
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const rowActions = (portfolio: PortfolioWithRelations) => (
    <RowActions>
      <RowAction
        icon={Eye}
        label={`View ${portfolio.name}`}
        onClick={() => router.push(`/portfolios/${portfolio.portfolio_id}`)}
      />
      {canManage && (
        <>
          <RowAction
            icon={Edit}
            label={`Edit ${portfolio.name}`}
            onClick={() =>
              router.push(`/portfolios/${portfolio.portfolio_id}/edit`)
            }
          />
          <RowAction
            icon={Trash2}
            label={`Delete ${portfolio.name}`}
            tone="danger"
            onClick={() => handleDeleteClick(portfolio)}
          />
        </>
      )}
    </RowActions>
  );

  const renderCard = (portfolio: PortfolioWithRelations) => {
    const burn = portfolio.total_budget
      ? (portfolio.total_actual_cost / portfolio.total_budget) * 100
      : 0;

    return (
      <EntityCard
        key={portfolio.portfolio_id}
        onClick={() => router.push(`/portfolios/${portfolio.portfolio_id}`)}
      >
        <EntityCardHeader
          title={portfolio.name}
          subtitle={portfolio.description}
          badges={
            <>
              <StatusBadge
                label={humanize(portfolio.status)}
                tone={portfolioStatusTone(portfolio.status)}
              />
              <StatusBadge
                label={humanize(portfolio.priority)}
                tone={priorityTone(portfolio.priority)}
              />
              {portfolio.tags?.slice(0, 2).map((tag) => (
                <StatusBadge key={tag} label={tag} tone="info" />
              ))}
              {portfolio.tags && portfolio.tags.length > 2 && (
                <StatusBadge label={`+${portfolio.tags.length - 2}`} />
              )}
            </>
          }
        />

        <EntityStats>
          <EntityStat icon={<FolderOpen className="h-3.5 w-3.5" />}>
            {portfolio.project_count}{" "}
            {portfolio.project_count === 1 ? "project" : "projects"}
          </EntityStat>
          <EntityStat icon={<DollarSign className="h-3.5 w-3.5" />}>
            {portfolio.total_budget?.toLocaleString() ?? 0}
          </EntityStat>
        </EntityStats>

        <EntityProgress label="Progress" value={portfolio.avg_progress ?? 0} />
        <EntityProgress
          label="Budget used"
          value={burn}
          display={portfolio.total_actual_cost?.toLocaleString() ?? "0"}
          tone={burnTone(burn)}
        />

        <EntityCardFooter
          actions={
            <div onClick={(e) => e.stopPropagation()}>
              {rowActions(portfolio)}
            </div>
          }
        >
          <PersonCell name={managerName(portfolio)} subtitle="Manager" />
        </EntityCardFooter>
      </EntityCard>
    );
  };

  // Role gate. Rendered only once the user is known, so a slow /me does not
  // flash "Access restricted" at someone who does have permission.
  if (user && !canView) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Portfolios">
          <EmptyState
            icon={<Shield className="h-10 w-10" />}
            title="Access restricted"
            message="You don't have permission to view portfolios."
          />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout
        title="Portfolios"
        subtitle="Groups of related projects, with their combined budget and progress."
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            {canManage && (
              <NewButton label="New portfolio" href="/portfolios/new" />
            )}
          </>
        }
      >
        <div className="space-y-6">
          <FilterBar
            search={filters.search}
            onSearch={(v) => setFilters({ ...filters, search: v })}
            searchPlaceholder="Search portfolios by name, description, manager or tag…"
            resultLabel={
              loading
                ? "Loading…"
                : `${filtered.length} ${filtered.length === 1 ? "portfolio" : "portfolios"}`
            }
            activeCount={activeFilterCount}
            onClear={() =>
              setFilters({ ...filters, status: "", priority: "", tag: "" })
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
                ...Object.values(PortfolioStatus).map((status) => ({
                  value: status,
                  label: humanize(status),
                })),
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
                ...Object.values(PortfolioPriority).map((priority) => ({
                  value: priority,
                  label: humanize(priority),
                })),
              ]}
            />
            <FilterSelect
              label="Tag"
              value={filters.tag || "all"}
              onChange={(v) =>
                setFilters({ ...filters, tag: v === "all" ? "" : v })
              }
              searchable={allTags.length > 10}
              options={[
                { value: "all", label: "All tags" },
                ...allTags.map((t) => ({ value: t, label: t })),
              ]}
            />
          </FilterBar>

          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="h-10 w-10" />}
              title="No portfolios found"
              message={
                activeFilterCount > 0 || filters.search
                  ? "Try adjusting your filters to see more results."
                  : "No portfolios have been created yet."
              }
              action={
                activeFilterCount > 0 || filters.search ? (
                  <button
                    type="button"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                  >
                    Clear all filters
                  </button>
                ) : canManage ? (
                  <NewButton
                    label="New portfolio"
                    href="/portfolios/new"
                  />
                ) : undefined
              }
            />
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
                      No portfolios on this page.
                    </ListMessage>
                  ) : (
                    visible.map((portfolio) => (
                      <ListRow
                        key={portfolio.portfolio_id}
                        onClick={() =>
                          router.push(`/portfolios/${portfolio.portfolio_id}`)
                        }
                      >
                        {/*
                          * `truncate` is inert in an auto-layout table cell
                          * with no width bound — the column simply grows to fit
                          * the description, which is what pushed this table
                          * into horizontal scrolling. The cap gives the
                          * truncation something to bite on; the columns that
                          * follow are all short, so they take `whitespace-nowrap`
                          * and leave the flexible width to this one.
                          */}
                        <td className="max-w-[280px] px-4 py-3">
                          <div className="truncate text-[13.5px] font-medium text-ink">
                            {portfolio.name}
                          </div>
                          {portfolio.description && (
                            <div
                              className="truncate text-[11.5px] text-faint"
                              title={portfolio.description}
                            >
                              {portfolio.description}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge
                            label={humanize(portfolio.status)}
                            tone={portfolioStatusTone(portfolio.status)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge
                            label={humanize(portfolio.priority)}
                            tone={priorityTone(portfolio.priority)}
                          />
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          <PersonCell name={managerName(portfolio)} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                          {portfolio.project_count}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-3">
                              <div
                                className="h-full rounded-full bg-bright"
                                style={{
                                  width: `${Math.min(100, Math.max(0, portfolio.avg_progress ?? 0))}%`,
                                }}
                              />
                            </div>
                            <span className="text-[12px] tabular-nums text-muted">
                              {Math.round(portfolio.avg_progress ?? 0)}%
                            </span>
                          </div>
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {rowActions(portfolio)}
                        </td>
                      </ListRow>
                    ))
                  )}
                </tbody>
              </table>
            </ListCard>
          )}

          {!loading && filtered.length > 0 && (
            <ListPagination
              page={page}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              noun="portfolio"
            />
          )}
        </div>

        <DeletePortfolioDialog
          isOpen={portfolioToDelete !== null}
          onClose={closeDeleteDialog}
          onConfirm={() => handleDeleteConfirm(false)}
          onForceDelete={() => handleDeleteConfirm(true)}
          portfolioName={portfolioToDelete?.name ?? ""}
          isDeleting={isDeleting}
          projects={deleteProjects}
          hasActiveProjects={hasActiveProjects}
          canForceDelete={canManage && isAdmin}
        />



        {isDeleting && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink-solid/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-[14px] border border-line bg-surface p-8 shadow-card-lg">
              <Spinner size={48} />
              <p className="text-[13px] text-muted">Deleting portfolio…</p>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
