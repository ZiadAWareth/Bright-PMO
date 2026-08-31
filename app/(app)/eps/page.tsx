"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  FolderOpen,
  Layers,
  Pencil,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { format } from "date-fns";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPagination } from "@/components/ui/list-pagination";
import { ViewToggle, type ListViewMode } from "@/components/ui/view-toggle";
import { PersonCell } from "@/components/ui/person-cell";
import { LoadingState } from "@/components/ui/spinner";
import {
  ListCard,
  ListHead,
  ListMessage,
  NewButton,
  RowAction,
  RowActions,
  StatusBadge,
} from "@/components/ui/form-shell";
import {
  EmptyState,
  EntityCard,
  EntityCardFooter,
  EntityCardHeader,
  EntityProgress,
  EntityStat,
  EntityStats,
} from "@/components/ui/entity-card";
import { useDebounce } from "@/hooks/useDebounce";
import { DeleteEpsDialog } from "./_components/DeleteEpsDialog";
import useCurrentUser from "@/hooks/useCurrentUser";

interface CurrentUser {
  user_id: number;
  role?: { role_name?: string; name?: string };
}

interface EPS {
  eps_id: number;
  eps_code: string;
  name: string;
  description: string | null;
  level: number;
  parent_eps_id: number | null;
  projects: unknown[];
  created_at: string;
  updated_at: string;
  manager?: string;
  planned_end_date?: string;
  budget_amount?: number;
  progress_percentage?: number;
}

const PAGE_SIZE = 12;
const MANAGE_ROLES = ["PMO", "PJM", "ADMIN"];
const COLUMNS = [
  "Name",
  "Level",
  "Projects",
  "Manager",
  "Planned finish",
  "Progress",
];

/**
 * One accent per level, so depth is readable at a glance in a flat table.
 *
 * These cycle through the non-status accents deliberately: an EPS level is a
 * position in a hierarchy, not a health signal, so it must not borrow the
 * success/warning/danger colours that mean something specific elsewhere.
 */
const LEVEL_CLASS = [
  "bg-accent-violet-soft text-accent-violet",
  "bg-info-soft text-info",
  "bg-accent-indigo-soft text-accent-indigo",
  "bg-bright-2-soft text-bright-2-deep",
  "bg-bright-soft text-bright-deep",
  "bg-accent-pink-soft text-accent-pink",
];

const LEVEL_OPTIONS = [
  { value: "all", label: "All levels" },
  ...Array.from({ length: 6 }, (_, i) => ({
    value: String(i + 1),
    label: `Level ${i + 1}`,
  })),
];

/** A row in the flattened render order, carrying its indent depth. */
interface Row {
  eps: EPS;
  depth: number;
  hasChildren: boolean;
}

export default function EPSPage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [epsList, setEpsList] = useState<EPS[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [view, setView] = useState<ListViewMode>("list");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const [epsToDelete, setEpsToDelete] = useState<EPS | null>(null);
  const [childCount, setChildCount] = useState(0);
  const [descendantCount, setDescendantCount] = useState(0);
  const [useCascadeDelete, setUseCascadeDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => setPage(0), [debouncedSearch, level, view]);

  /*
   * The role comes from the shared cache rather than this page's own
   * /api/auth/me call, which resolves a beat after the first paint. That delay
   * was visible: `manageAllowed` was false while `user` was still null, so the
   * "New EPS" button rendered *disabled* and then enabled itself, which reads
   * as a broken control rather than a loading one.
   *
   * `roleLoading` keeps "not known yet" distinct from "not permitted" so
   * callers can render neither state until the answer is real.
   *
   * MANAGE_ROLES is narrower than ROUTE_ROLES["/eps"] on purpose: DIR may open
   * the screen but not restructure the hierarchy.
   */
  const { userRole, roleLoading } = useCurrentUser();

  const canManage = () => {
    if (roleLoading) return false;
    const roleName =
      userRole ?? user?.role?.role_name ?? user?.role?.name;
    return Boolean(roleName && MANAGE_ROLES.includes(roleName));
  };

  const fetchEps = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get("/api/eps", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!Array.isArray(res.data)) {
        toast.error("Invalid data format received from server");
        setEpsList([]);
        return;
      }
      // The API has returned partial rows in the past; normalise so the table
      // never has to guard every cell.
      setEpsList(
        res.data
          .filter((e) => e && e.eps_id && e.name)
          .map((e) => ({
            ...e,
            eps_code: e.eps_code || `EPS-${e.eps_id}`,
            description: e.description ?? null,
            level: e.level || 1,
            parent_eps_id: e.parent_eps_id ?? null,
            projects: Array.isArray(e.projects) ? e.projects : [],
          })),
      );
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "Failed to fetch EPS data");
      setEpsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUser(res.data.user);
      } catch {
        // Permission-gated actions stay hidden if we cannot identify the user.
      }
    })();
    void fetchEps();
  }, []);

  const matches = (eps: EPS) => {
    const term = debouncedSearch.trim().toLowerCase();
    const matchesSearch =
      !term ||
      eps.name.toLowerCase().includes(term) ||
      eps.eps_code.toLowerCase().includes(term) ||
      (eps.description ?? "").toLowerCase().includes(term);
    const matchesLevel = level === "all" || String(eps.level) === level;
    return matchesSearch && matchesLevel;
  };

  /**
   * Flatten the tree into render order.
   *
   * With a search term or level filter the hierarchy stops being meaningful —
   * a match's parent may be filtered out — so those render as a flat list.
   * Unfiltered, rows nest and collapse. Card view is always flat: cards have no
   * indent to carry depth, so the level chip does that job instead.
   */
  const isFiltering = debouncedSearch.trim() !== "" || level !== "all";
  const isFlat = isFiltering || view === "grid";

  const { rows, topLevelCount } = useMemo(() => {
    if (isFlat) {
      const flat = epsList.filter(matches);
      return {
        rows: flat.map((eps) => ({ eps, depth: 0, hasChildren: false })),
        topLevelCount: flat.length,
      };
    }

    const childrenOf = (parentId: number | null) =>
      epsList.filter((e) => e.parent_eps_id === parentId);

    const roots = childrenOf(null);
    const out: Row[] = [];

    const walk = (nodes: EPS[], depth: number) => {
      for (const eps of nodes) {
        const kids = childrenOf(eps.eps_id);
        out.push({ eps, depth, hasChildren: kids.length > 0 });
        if (kids.length > 0 && expanded.includes(eps.eps_id)) {
          walk(kids, depth + 1);
        }
      }
    };
    walk(roots, 0);

    return { rows: out, topLevelCount: roots.length };
  }, [epsList, debouncedSearch, level, expanded, isFlat]);

  /**
   * Paginate by top-level entries, not by visible rows — otherwise expanding a
   * node would push its own children onto the next page.
   */
  const pagedRows = useMemo(() => {
    if (isFlat) {
      return rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    }

    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    let rootIndex = -1;
    return rows.filter((row) => {
      if (row.depth === 0) rootIndex += 1;
      return rootIndex >= start && rootIndex < end;
    });
  }, [rows, page, isFlat]);

  const activeCount = level !== "all" ? 1 : 0;
  const pageCount = Math.max(1, Math.ceil(topLevelCount / PAGE_SIZE));

  const toggleExpand = (epsId: number) =>
    setExpanded((prev) =>
      prev.includes(epsId)
        ? prev.filter((id) => id !== epsId)
        : [...prev, epsId],
    );

  const countDescendants = (parentId: number): number => {
    const direct = epsList.filter((e) => e.parent_eps_id === parentId);
    return direct.reduce(
      (sum, child) => sum + 1 + countDescendants(child.eps_id),
      0,
    );
  };

  const requireManage = (action: string) => {
    if (!user?.role) {
      toast.error("Please wait for the page to finish loading.");
      return false;
    }
    if (!canManage()) {
      toast.error(`You don't have permission to ${action} EPS entries`);
      return false;
    }
    return true;
  };

  const handleDeleteClick = (eps: EPS) => {
    if (!requireManage("delete")) return;
    setChildCount(epsList.filter((e) => e.parent_eps_id === eps.eps_id).length);
    setDescendantCount(countDescendants(eps.eps_id));
    setUseCascadeDelete(false);
    setEpsToDelete(eps);
  };

  const handleDeleteConfirm = async () => {
    if (!epsToDelete) return;
    setIsDeleting(true);
    try {
      const url = useCascadeDelete
        ? `/api/eps/${epsToDelete.eps_id}?cascade=true`
        : `/api/eps/${epsToDelete.eps_id}`;
      const res = await axios.delete(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.status === 200) {
        await fetchEps();
        toast.success(
          useCascadeDelete && res.data?.deletedCount
            ? `Deleted ${res.data.deletedCount} EPS ${res.data.deletedCount === 1 ? "entry" : "entries"}`
            : "EPS deleted",
        );
        setEpsToDelete(null);
      }
    } catch (e) {
      const err = e as {
        response?: {
          data?: {
            error?: string;
            message?: string;
            requiresCascade?: boolean;
            totalChildCount?: number;
          };
        };
      };
      if (err.response?.data?.requiresCascade) {
        setDescendantCount(err.response.data.totalChildCount ?? childCount);
        toast.error(
          err.response.data.message ??
            err.response.data.error ??
            "Cascade required",
        );
      } else {
        toast.error(err.response?.data?.error ?? "Failed to delete EPS");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const manageAllowed = canManage();

  const rowActions = (eps: EPS) => (
    <RowActions>
      <RowAction
        icon={Eye}
        label={`View ${eps.name}`}
        onClick={() => router.push(`/eps/${eps.eps_id}`)}
      />
      {manageAllowed && (
        <>
          <RowAction
            icon={Pencil}
            label={`Edit ${eps.name}`}
            onClick={() => {
              if (requireManage("edit")) {
                router.push(`/eps/${eps.eps_id}/edit`);
              }
            }}
          />
          <RowAction
            icon={Trash2}
            label={`Delete ${eps.name}`}
            tone="danger"
            onClick={() => handleDeleteClick(eps)}
          />
        </>
      )}
    </RowActions>
  );

  const levelChip = (value: number) => (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
        LEVEL_CLASS[(value - 1) % LEVEL_CLASS.length]
      }`}
    >
      Level {value}
    </span>
  );

  const renderCard = ({ eps }: Row) => {
    const projectCount = Array.isArray(eps.projects) ? eps.projects.length : 0;
    const progress =
      typeof eps.progress_percentage === "number"
        ? eps.progress_percentage
        : null;

    return (
      <EntityCard
        key={eps.eps_id}
        onClick={() => router.push(`/eps/${eps.eps_id}`)}
      >
        <EntityCardHeader
          title={eps.name}
          subtitle={eps.description ?? eps.eps_code}
          badges={
            <>
              {levelChip(eps.level)}
              <StatusBadge label={eps.eps_code} />
            </>
          }
        />

        <EntityStats>
          <EntityStat icon={<FolderOpen className="h-3.5 w-3.5" />}>
            {projectCount} {projectCount === 1 ? "project" : "projects"}
          </EntityStat>
          {eps.planned_end_date && (
            <EntityStat icon={<Calendar className="h-3.5 w-3.5" />}>
              {format(new Date(eps.planned_end_date), "dd MMM yyyy")}
            </EntityStat>
          )}
        </EntityStats>

        {progress !== null && (
          <EntityProgress label="Progress" value={progress} />
        )}

        <EntityCardFooter
          actions={
            <div onClick={(e) => e.stopPropagation()}>{rowActions(eps)}</div>
          }
        >
          <PersonCell name={eps.manager || "Unassigned"} subtitle="Manager" />
        </EntityCardFooter>
      </EntityCard>
    );
  };

  return (
    <ProtectedRoute>
      <DashboardLayout
        title="EPS"
        subtitle="Enterprise project structure — the hierarchy every project hangs from."
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            {!roleLoading && (
              <NewButton
                href={manageAllowed ? "/eps/new" : undefined}
                label="New EPS"
                disabled={!manageAllowed}
                onClick={() => requireManage("create")}
              />
            )}
          </>
        }
      >
        <div className="space-y-6">
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search by name, code or description…"
            resultLabel={
              isLoading
                ? "Loading…"
                : `${topLevelCount} ${topLevelCount === 1 ? "entry" : "entries"}`
            }
            activeCount={activeCount}
            onClear={() => setLevel("all")}
          >
            <FilterSelect
              label="Level"
              value={level}
              onChange={setLevel}
              options={LEVEL_OPTIONS}
            />
          </FilterBar>

          {isLoading ? (
            <LoadingState />
          ) : topLevelCount === 0 ? (
            <EmptyState
              icon={<Layers className="h-10 w-10" />}
              title="No EPS entries found"
              message={
                epsList.length === 0
                  ? "No EPS entries have been created yet."
                  : "Try adjusting your search or filter to see more results."
              }
              action={
                epsList.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setLevel("all");
                    }}
                    className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                  >
                    Clear all filters
                  </button>
                ) : manageAllowed ? (
                  <NewButton href="/eps/new" label="New EPS" />
                ) : undefined
              }
            />
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pagedRows.map(renderCard)}
            </div>
          ) : (
            <ListCard>
              <table className="w-full border-collapse">
                <ListHead columns={COLUMNS} />
                <tbody>
                  {pagedRows.length === 0 ? (
                    <ListMessage colSpan={COLUMNS.length + 1}>
                      No entries on this page.
                    </ListMessage>
                  ) : (
                    pagedRows.map(({ eps, depth, hasChildren }) => {
                      const isExpanded = expanded.includes(eps.eps_id);
                      const projectCount = Array.isArray(eps.projects)
                        ? eps.projects.length
                        : 0;
                      const progress =
                        typeof eps.progress_percentage === "number"
                          ? eps.progress_percentage
                          : null;

                      return (
                        <tr
                          key={eps.eps_id}
                          className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                        >
                          <td className="max-w-[360px] px-4 py-3">
                            <div
                              className="flex min-w-0 items-center gap-2"
                              style={{ paddingLeft: depth * 20 }}
                            >
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(eps.eps_id)}
                                  aria-label={
                                    isExpanded
                                      ? `Collapse ${eps.name}`
                                      : `Expand ${eps.name}`
                                  }
                                  aria-expanded={isExpanded}
                                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-3 hover:text-ink"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              ) : (
                                <span
                                  className="h-6 w-6 shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                              <Layers
                                className="h-4 w-4 shrink-0 text-faint"
                                aria-hidden="true"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/eps/${eps.eps_id}`)
                                }
                                className="min-w-0 text-left"
                              >
                                <div className="truncate text-[13.5px] font-medium text-ink hover:text-bright">
                                  {eps.name}
                                </div>
                                <div className="truncate text-[11.5px] text-faint">
                                  {eps.eps_code}
                                </div>
                              </button>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{levelChip(eps.level)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                            {projectCount}
                          </td>
                          <td className="max-w-[180px] px-4 py-3 text-[13.5px]">
                            {eps.manager ? (
                              <PersonCell name={eps.manager} />
                            ) : (
                              <span className="text-faint">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-ink-2">
                            {eps.planned_end_date ? (
                              format(
                                new Date(eps.planned_end_date),
                                "dd MMM yyyy",
                              )
                            ) : (
                              <span className="text-faint">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {progress === null ? (
                              <span className="text-[13px] text-faint">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-3">
                                  <div
                                    className="h-full rounded-full bg-bright"
                                    style={{
                                      width: `${Math.min(100, Math.max(0, progress))}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[12px] tabular-nums text-muted">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">{rowActions(eps)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </ListCard>
          )}

          {!isLoading && topLevelCount > 0 && (
            <ListPagination
              page={page}
              pageCount={pageCount}
              total={topLevelCount}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              noun="entry"
            />
          )}
        </div>

        <DeleteEpsDialog
          isOpen={epsToDelete !== null}
          onClose={() => setEpsToDelete(null)}
          onConfirm={handleDeleteConfirm}
          epsName={epsToDelete?.name ?? ""}
          isDeleting={isDeleting}
          childCount={childCount}
          totalDescendantCount={descendantCount}
          useCascadeDelete={useCascadeDelete}
          onCascadeDeleteChange={setUseCascadeDelete}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
