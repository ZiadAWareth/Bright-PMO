"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle,
  Clock,
  Eye,
  TrendingUp,
  Users,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPagination } from "@/components/ui/list-pagination";
import { ViewToggle, type ListViewMode } from "@/components/ui/view-toggle";
import { PersonCell } from "@/components/ui/person-cell";
import { LoadingState } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/useDebounce";
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
import { capacityTone, humanize, utilizationTone } from "@/lib/status-tone";

const PAGE_SIZE = 12;
const COLUMNS = [
  "Name",
  "Department",
  "Role",
  "Status",
  "Projects",
  "Tasks",
  "Utilization",
  "Capacity",
];

interface UserWorkload {
  user_id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  status: string;
  total_projects: number;
  active_tasks: number;
  total_hours_allocated: number;
  total_hours_logged: number;
  utilization_percentage: number;
  capacity_status: string;
}

interface FilterState {
  search: string;
  department: string;
  role: string;
  capacity: string;
}

const EMPTY_FILTERS: FilterState = {
  search: "",
  department: "",
  role: "",
  capacity: "",
};

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [view, setView] = useState<ListViewMode>("list");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(filters.search, 300);

  useEffect(
    () => setPage(0),
    [debouncedSearch, filters.department, filters.role, filters.capacity],
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/users/workload", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUsers(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error fetching users workload:", error);
        toast.error("Failed to load users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const departments = useMemo(
    () =>
      Array.from(new Set(users.map((u) => u.department).filter(Boolean))).sort(),
    [users],
  );
  const roles = useMemo(
    () => Array.from(new Set(users.map((u) => u.role).filter(Boolean))).sort(),
    [users],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.department ?? "").toLowerCase().includes(q);

      return (
        matchesSearch &&
        (!filters.department || user.department === filters.department) &&
        (!filters.role || user.role === filters.role) &&
        (!filters.capacity || user.capacity_status === filters.capacity)
      );
    });
  }, [
    users,
    debouncedSearch,
    filters.department,
    filters.role,
    filters.capacity,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  );

  const activeFilterCount =
    (filters.department ? 1 : 0) +
    (filters.role ? 1 : 0) +
    (filters.capacity ? 1 : 0);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      overloaded: users.filter((u) => u.capacity_status === "overloaded").length,
      available: users.filter((u) => u.capacity_status === "available").length,
      avgUtilization: users.length
        ? users.reduce((sum, u) => sum + u.utilization_percentage, 0) /
          users.length
        : 0,
    }),
    [users],
  );

  const rowActions = (user: UserWorkload) => (
    <RowActions>
      <RowAction
        icon={Eye}
        label={`View ${user.name}`}
        onClick={() => router.push(`/users/${user.user_id}`)}
      />
    </RowActions>
  );

  const renderCard = (user: UserWorkload) => (
    <EntityCard
      key={user.user_id}
      onClick={() => router.push(`/users/${user.user_id}`)}
    >
      <EntityCardHeader
        title={user.name}
        subtitle={user.email}
        badges={
          <>
            <StatusBadge
              label={humanize(user.capacity_status)}
              tone={capacityTone(user.capacity_status)}
            />
            <StatusBadge
              label={humanize(user.status)}
              tone={user.status === "active" ? "success" : "neutral"}
            />
            {user.role && <StatusBadge label={user.role} tone="info" />}
          </>
        }
      />

      <EntityStats>
        <EntityStat icon={<Briefcase className="h-3.5 w-3.5" />}>
          {user.total_projects}{" "}
          {user.total_projects === 1 ? "project" : "projects"}
        </EntityStat>
        <EntityStat icon={<Clock className="h-3.5 w-3.5" />}>
          {user.total_hours_logged.toFixed(1)}h logged
        </EntityStat>
      </EntityStats>

      <EntityProgress
        label="Utilization"
        value={Math.min(user.utilization_percentage, 100)}
        display={`${user.utilization_percentage.toFixed(0)}%`}
        tone={utilizationTone(user.utilization_percentage)}
      />

      <EntityCardFooter
        actions={
          <div onClick={(e) => e.stopPropagation()}>{rowActions(user)}</div>
        }
      >
        <PersonCell
          name={user.name}
          subtitle={user.department || "No department"}
        />
      </EntityCardFooter>
    </EntityCard>
  );

  return (
    <DashboardLayout
      title="User Management"
      subtitle="Team members, their workload and how much capacity is left."
      actions={
        <>
          <ViewToggle value={view} onChange={setView} />
          <NewButton label="New user" href="/users/new" />
        </>
      }
    >
      <div className="space-y-6">
        <StatGrid>
          <StatTile
            label="Total users"
            value={stats.total}
            hint={`${stats.active} active`}
            icon={<Users className="h-4 w-4" />}
          />
          <StatTile
            label="Available"
            value={stats.available}
            hint="Ready for assignments"
            icon={<CheckCircle className="h-4 w-4" />}
            tone={stats.available > 0 ? "success" : "neutral"}
          />
          <StatTile
            label="Overloaded"
            value={stats.overloaded}
            hint="Need rebalancing"
            icon={<AlertTriangle className="h-4 w-4" />}
            tone={stats.overloaded > 0 ? "danger" : "neutral"}
          />
          <StatTile
            label="Avg utilization"
            value={`${stats.avgUtilization.toFixed(1)}%`}
            hint="Team average"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </StatGrid>

        <FilterBar
          search={filters.search}
          onSearch={(v) => setFilters({ ...filters, search: v })}
          searchPlaceholder="Search users by name, email or department…"
          resultLabel={
            loading
              ? "Loading…"
              : `${filtered.length} ${filtered.length === 1 ? "user" : "users"}`
          }
          activeCount={activeFilterCount}
          onClear={() =>
            setFilters({ ...filters, department: "", role: "", capacity: "" })
          }
        >
          <FilterSelect
            label="Department"
            value={filters.department || "all"}
            onChange={(v) =>
              setFilters({ ...filters, department: v === "all" ? "" : v })
            }
            searchable={departments.length > 10}
            options={[
              { value: "all", label: "All departments" },
              ...departments.map((d) => ({ value: d, label: d })),
            ]}
          />
          <FilterSelect
            label="Role"
            value={filters.role || "all"}
            onChange={(v) =>
              setFilters({ ...filters, role: v === "all" ? "" : v })
            }
            searchable={roles.length > 10}
            options={[
              { value: "all", label: "All roles" },
              ...roles.map((r) => ({ value: r, label: r })),
            ]}
          />
          <FilterSelect
            label="Capacity"
            value={filters.capacity || "all"}
            onChange={(v) =>
              setFilters({ ...filters, capacity: v === "all" ? "" : v })
            }
            options={[
              { value: "all", label: "All capacities" },
              { value: "available", label: "Available" },
              { value: "under_utilized", label: "Under utilized" },
              { value: "optimal", label: "Optimal" },
              { value: "overloaded", label: "Overloaded" },
            ]}
          />
        </FilterBar>

        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No users found"
            message={
              activeFilterCount > 0 || filters.search
                ? "Try adjusting your filters to see more results."
                : "No users have been added yet."
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
                    No users on this page.
                  </ListMessage>
                ) : (
                  visible.map((user) => (
                    <ListRow
                      key={user.user_id}
                      onClick={() => router.push(`/users/${user.user_id}`)}
                    >
                      <td className="max-w-[180px] px-4 py-3">
                        <PersonCell name={user.name} email={user.email} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-ink-2">
                        {user.department || (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-ink-2">
                        {user.role || <span className="text-faint">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge
                          label={humanize(user.status)}
                          tone={user.status === "active" ? "success" : "neutral"}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                        {user.total_projects}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                        {user.active_tasks}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className={`h-full rounded-full ${
                                user.utilization_percentage > 100
                                  ? "bg-danger"
                                  : user.utilization_percentage >= 80
                                    ? "bg-success"
                                    : user.utilization_percentage >= 50
                                      ? "bg-warning"
                                      : "bg-bright"
                              }`}
                              style={{
                                width: `${Math.min(user.utilization_percentage, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[12px] tabular-nums text-muted">
                            {user.utilization_percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge
                          label={humanize(user.capacity_status)}
                          tone={capacityTone(user.capacity_status)}
                        />
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions(user)}
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
            noun="user"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
