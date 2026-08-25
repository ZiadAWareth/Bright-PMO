"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Eye,
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
import { ListCard, ListHead, NewButton } from "@/components/ui/form-shell";
import { useDebounce } from "@/hooks/useDebounce";
import { DeleteEpsDialog } from "./_components/DeleteEpsDialog";

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
const COLUMNS = ["Name", "Level", "Projects", "Manager", "Planned finish", "Progress"];

/** One accent per level, so depth is readable at a glance in a flat table. */
const LEVEL_CLASS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
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
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const [epsToDelete, setEpsToDelete] = useState<EPS | null>(null);
  const [childCount, setChildCount] = useState(0);
  const [descendantCount, setDescendantCount] = useState(0);
  const [useCascadeDelete, setUseCascadeDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => setPage(0), [debouncedSearch, level]);

  const canManage = () => {
    const roleName = user?.role?.role_name ?? user?.role?.name;
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
   * Unfiltered, rows nest and collapse.
   */
  const { rows, topLevelCount } = useMemo(() => {
    const isFiltering = debouncedSearch.trim() !== "" || level !== "all";

    if (isFiltering) {
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
  }, [epsList, debouncedSearch, level, expanded]);

  /**
   * Paginate by top-level entries, not by visible rows — otherwise expanding a
   * node would push its own children onto the next page.
   */
  const pagedRows = useMemo(() => {
    const isFiltering = debouncedSearch.trim() !== "" || level !== "all";
    if (isFiltering) {
      return rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    }

    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    let rootIndex = -1;
    return rows.filter((row) => {
      if (row.depth === 0) rootIndex += 1;
      return rootIndex >= start && rootIndex < end;
    });
  }, [rows, page, debouncedSearch, level]);

  const activeCount = level !== "all" ? 1 : 0;
  const pageCount = Math.ceil(topLevelCount / PAGE_SIZE);

  const toggleExpand = (epsId: number) =>
    setExpanded((prev) =>
      prev.includes(epsId) ? prev.filter((id) => id !== epsId) : [...prev, epsId],
    );

  const countDescendants = (parentId: number): number => {
    const direct = epsList.filter((e) => e.parent_eps_id === parentId);
    return direct.reduce((sum, child) => sum + 1 + countDescendants(child.eps_id), 0);
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
        response?: { data?: { error?: string; message?: string; requiresCascade?: boolean; totalChildCount?: number } };
      };
      if (err.response?.data?.requiresCascade) {
        setDescendantCount(err.response.data.totalChildCount ?? childCount);
        toast.error(err.response.data.message ?? err.response.data.error ?? "Cascade required");
      } else {
        toast.error(err.response?.data?.error ?? "Failed to delete EPS");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const manageAllowed = canManage();

  return (
    <ProtectedRoute>
      <DashboardLayout
        title="EPS"
        subtitle="Enterprise project structure — the hierarchy every project hangs from"
        actions={
          <NewButton
            href={manageAllowed ? "/eps/new" : undefined}
            label="New EPS"
            disabled={!manageAllowed}
            onClick={() => requireManage("create")}
          />
        }
      >
        <div>
          <div className="mb-4">
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
          </div>

          <ListCard>
            <table className="w-full border-collapse">
              <ListHead columns={COLUMNS} />
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-sm text-text-secondary">
                      Loading EPS data…
                    </td>
                  </tr>
                )}
                {!isLoading && pagedRows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-sm text-text-secondary">
                      {epsList.length === 0
                        ? "No EPS entries yet — create one to get started"
                        : "No entry matches the current search or filter"}
                    </td>
                  </tr>
                )}
                {pagedRows.map(({ eps, depth, hasChildren }) => {
                  const isExpanded = expanded.includes(eps.eps_id);
                  const projectCount = Array.isArray(eps.projects) ? eps.projects.length : 0;
                  const progress =
                    typeof eps.progress_percentage === "number" ? eps.progress_percentage : null;

                  return (
                    <tr
                      key={eps.eps_id}
                      className="border-b border-border transition-colors last:border-0 hover:bg-bg-surface-alt"
                    >
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: depth * 20 }}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(eps.eps_id)}
                              aria-label={isExpanded ? `Collapse ${eps.name}` : `Expand ${eps.name}`}
                              aria-expanded={isExpanded}
                              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <span className="h-6 w-6 shrink-0" aria-hidden="true" />
                          )}
                          <Layers
                            className="h-4 w-4 shrink-0 text-text-secondary/70"
                            aria-hidden="true"
                          />
                          <button
                            type="button"
                            onClick={() => router.push(`/eps/${eps.eps_id}`)}
                            className="min-w-0 text-left"
                          >
                            <div className="truncate text-[13.5px] font-medium text-text-primary hover:text-wujha-primary">
                              {eps.name}
                            </div>
                            <div className="truncate text-[11.5px] text-text-secondary/80">
                              {eps.eps_code}
                            </div>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                            LEVEL_CLASS[(eps.level - 1) % LEVEL_CLASS.length]
                          }`}
                        >
                          Level {eps.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13.5px] tabular-nums text-text-primary">
                        {projectCount}
                      </td>
                      <td className="px-4 py-3 text-[13.5px]">
                        {eps.manager || <span className="text-text-secondary/70">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[13.5px]">
                        {eps.planned_end_date ? (
                          format(new Date(eps.planned_end_date), "dd MMM yyyy")
                        ) : (
                          <span className="text-text-secondary/70">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {progress === null ? (
                          <span className="text-[13px] text-text-secondary/70">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-bg-surface-alt">
                              <div
                                className="h-full rounded-full bg-wujha-primary"
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              />
                            </div>
                            <span className="text-[12px] tabular-nums text-text-secondary">
                              {Math.round(progress)}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/eps/${eps.eps_id}`)}
                            aria-label={`View ${eps.name}`}
                            title="View details"
                            className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary transition-colors hover:bg-wujha-primary/10 hover:text-wujha-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {manageAllowed && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (requireManage("edit")) {
                                    router.push(`/eps/${eps.eps_id}/edit`);
                                  }
                                }}
                                aria-label={`Edit ${eps.name}`}
                                title="Edit"
                                className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary transition-colors hover:bg-wujha-primary/10 hover:text-wujha-primary"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(eps)}
                                aria-label={`Delete ${eps.name}`}
                                title="Delete"
                                className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary transition-colors hover:bg-wujha-danger/10 hover:text-wujha-danger"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ListCard>

          <ListPagination
            page={page}
            pageCount={pageCount}
            total={topLevelCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            noun="entry"
          />
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
