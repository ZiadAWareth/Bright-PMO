"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Plus, Download, Eye, Users, Search } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { LoadingState, Spinner } from "@/components/ui/spinner";
import { ListPagination } from "@/components/ui/list-pagination";
import { ViewToggle, type ListViewMode } from "@/components/ui/view-toggle";
import { PersonCell } from "@/components/ui/person-cell";
import {
  EmptyState,
  EntityCard,
  EntityCardFooter,
  EntityCardHeader,
  EntityStat,
  EntityStats,
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
import { humanize, timesheetStatusTone } from "@/lib/status-tone";

const PAGE_SIZE = 12;
const TIMESHEET_COLUMNS = ["Project", "Period", "Status", "Hours", "Entries"];
const TEAM_COLUMNS = [
  "Project",
  "Person",
  "Period",
  "Status",
  "Hours",
  "Entries",
];

interface Timesheet {
  timesheet_id: number;
  project_id: number;
  start_date: string;
  end_date: string;
  status: string;
  total_hours: number;
  comments?: string;
  project: {
    name: string;
  };
  time_entries: TimeEntry[];
  user?: {
    user_id: number;
    username: string;
    email: string;
    account: {
      first_name: string;
      last_name: string;
      department?: string;
    };
    role?: {
      name: string;
    };
  };
}

interface TimeEntry {
  time_entry_id: number;
  date: string;
  hours_spent: number;
  description: string;
  task: {
    name: string;
  };
}

interface Project {
  project_id: number;
  name: string;
  status: string;
}

interface User {
  user_id: number;
  username: string;
  email: string;
  account: {
    first_name: string;
    last_name: string;
    department?: string;
  };
  role: {
    name: string;
  };
}

export default function TimesheetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [timesheetSearch, setTimesheetSearch] = useState("");
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState("all");

  const visibleTimesheets = timesheets.filter((timesheet) => {
    const term = timesheetSearch.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (timesheet.project?.name ?? "").toLowerCase().includes(term) ||
      new Date(timesheet.start_date).toLocaleDateString().toLowerCase().includes(term) ||
      new Date(timesheet.end_date).toLocaleDateString().toLowerCase().includes(term);
    const matchesStatus =
      timesheetStatusFilter === "all" || timesheet.status === timesheetStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const [allTimesheets, setAllTimesheets] = useState<Timesheet[]>([]);

  // The team tab reads from a different endpoint and was previously unfiltered
  // and unpaginated, so it kept its own search/status state rather than sharing
  // the personal tab's — switching tabs should not carry a filter across.
  const [teamSearch, setTeamSearch] = useState("");
  const [teamStatusFilter, setTeamStatusFilter] = useState("all");
  const [view, setView] = useState<ListViewMode>("grid");
  const [page, setPage] = useState(0);
  const [teamPage, setTeamPage] = useState(0);

  const visibleTeamTimesheets = allTimesheets.filter((timesheet) => {
    const term = teamSearch.trim().toLowerCase();
    const who = timesheet.user
      ? `${timesheet.user.account.first_name} ${timesheet.user.account.last_name}`.toLowerCase()
      : "";
    const matchesSearch =
      !term ||
      (timesheet.project?.name ?? "").toLowerCase().includes(term) ||
      who.includes(term) ||
      new Date(timesheet.start_date)
        .toLocaleDateString()
        .toLowerCase()
        .includes(term) ||
      new Date(timesheet.end_date)
        .toLocaleDateString()
        .toLowerCase()
        .includes(term);
    const matchesStatus =
      teamStatusFilter === "all" || timesheet.status === teamStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState("current");

  const [users, setUsers] = useState<User[]>([]);
  const [allTeamLoading, setAllTeamLoading] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchUserTimesheets();
  }, []);

  // Fetch user projects after currentUser is set
  useEffect(() => {
    if (currentUser) {
      fetchUserProjects();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await axios.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API response:", response.data);
      // The API returns user data in a nested 'user' object
      setCurrentUser(response.data.user || response.data);
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      router.push("/auth/login");
    }
  };

  // Helper function to check if user can view all timesheets
  const canViewAllTimesheets = () => {
    console.log("Current user data:", currentUser);
    console.log("Role name:", currentUser?.role?.name);
    console.log(
      "Can view all timesheets:",
      currentUser?.role?.name &&
        ["ADMIN", "PMO", "PJM"].includes(currentUser.role.name)
    );
    return (
      currentUser?.role?.name &&
      ["ADMIN", "PMO", "PJM"].includes(currentUser.role.name)
    );
  };

  const fetchUserTimesheets = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await axios.get("/api/timesheets", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTimesheets(response.data);
    } catch (error) {
      console.error("Failed to fetch timesheets:", error);
      toast.error("Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTimesheets = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await axios.get("/api/timesheets?view_all=true", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAllTimesheets(response.data);
    } catch (error) {
      console.error("Failed to fetch all timesheets:", error);
      toast.error("Failed to load all timesheets");
    }
  };

  // Fetch all timesheets when user switches to the "All Team Timesheets" tab
  useEffect(() => {
    if (activeTab === "all-team" && canViewAllTimesheets()) {
      setAllTeamLoading(true);
      fetchAllTimesheets()
        .then(() => {})
        .finally(() => setAllTeamLoading(false));
    }
  }, [activeTab, currentUser]);

  const fetchUserProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Filter active projects where user is involved (team member, creator, or manager)
      const activeProjects = response.data.filter((project: any) => {
        const isActiveProject =
          project.status === "execution" || project.status === "planning";
        const userId = currentUser?.user_id;
        if (!userId) return false;
        const isTeamMember = project.team_members?.some(
          (member: any) => member.user?.user_id === userId
        );
        const isCreator = project.created_by === userId;
        const isManager = project.manager_id === userId;
        return isActiveProject && (isTeamMember || isCreator || isManager);
      });

      setProjects(activeProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-warning-soft text-warning  ";
      case "SUBMITTED":
        return "bg-info-soft text-info  ";
      case "APPROVED":
        return "bg-success-soft text-success  ";
      case "REJECTED":
        return "bg-danger-soft text-danger  ";
      default:
        return "bg-surface-2 text-ink-2  ";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filtering changes what "page 1" means, so reset rather than stranding the
  // user on a page index that no longer has rows.
  useEffect(
    () => setPage(0),
    [timesheetSearch, timesheetStatusFilter, view],
  );
  useEffect(() => setTeamPage(0), [teamSearch, teamStatusFilter, view]);

  const timesheetPageCount = Math.max(
    1,
    Math.ceil(visibleTimesheets.length / PAGE_SIZE),
  );
  const pagedTimesheets = visibleTimesheets.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );
  const teamPageCount = Math.max(
    1,
    Math.ceil(visibleTeamTimesheets.length / PAGE_SIZE),
  );
  const pagedTeamTimesheets = visibleTeamTimesheets.slice(
    teamPage * PAGE_SIZE,
    (teamPage + 1) * PAGE_SIZE,
  );

  const personOf = (timesheet: Timesheet) =>
    timesheet.user
      ? `${timesheet.user.account.first_name} ${timesheet.user.account.last_name}`.trim()
      : "";

  /**
   * One card renderer for both the personal and team tabs. `withPerson` adds
   * the owner row, which is meaningless on your own timesheets but is the first
   * thing you look for on the team tab.
   */
  const renderTimesheetCard = (timesheet: Timesheet, withPerson = false) => (
    <EntityCard
      key={timesheet.timesheet_id}
      onClick={() => router.push(`/timesheet/${timesheet.timesheet_id}`)}
    >
      <EntityCardHeader
        title={timesheet.project?.name ?? "Untitled project"}
        subtitle={`${formatDate(timesheet.start_date)} – ${formatDate(timesheet.end_date)}`}
        badges={
          <StatusBadge
            label={humanize(timesheet.status)}
            tone={timesheetStatusTone(timesheet.status)}
          />
        }
      />

      <EntityStats>
        <EntityStat icon={<Clock className="h-3.5 w-3.5" />}>
          {timesheet.total_hours}h total
        </EntityStat>
        <EntityStat icon={<Calendar className="h-3.5 w-3.5" />}>
          {timesheet.time_entries.length}{" "}
          {timesheet.time_entries.length === 1 ? "entry" : "entries"}
        </EntityStat>
      </EntityStats>

      <EntityCardFooter
        actions={
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions>
              <RowAction
                icon={Eye}
                label={`View ${timesheet.project?.name ?? "timesheet"}`}
                onClick={() =>
                  router.push(`/timesheet/${timesheet.timesheet_id}`)
                }
              />
            </RowActions>
          </div>
        }
      >
        {withPerson && personOf(timesheet) ? (
          <PersonCell
            name={personOf(timesheet)}
            subtitle={
              timesheet.user?.role?.name ??
              timesheet.user?.account.department ??
              undefined
            }
          />
        ) : (
          <span className="text-[12px] text-faint">
            {timesheet.time_entries.length}{" "}
            {timesheet.time_entries.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </EntityCardFooter>
    </EntityCard>
  );

  const renderTimesheetRow = (timesheet: Timesheet, withPerson = false) => (
    <ListRow
      key={timesheet.timesheet_id}
      onClick={() => router.push(`/timesheet/${timesheet.timesheet_id}`)}
    >
      <td className="max-w-[200px] px-4 py-3">
        <div className="min-w-0 truncate text-[13.5px] font-medium text-ink">
          {timesheet.project?.name ?? "Untitled project"}
        </div>
      </td>
      {withPerson && (
        <td className="max-w-[180px] px-4 py-3">
          {personOf(timesheet) ? (
            <PersonCell
              name={personOf(timesheet)}
              subtitle={timesheet.user?.role?.name ?? undefined}
            />
          ) : (
            <span className="text-faint">—</span>
          )}
        </td>
      )}
      <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-ink-2">
        {formatDate(timesheet.start_date)} – {formatDate(timesheet.end_date)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <StatusBadge
          label={humanize(timesheet.status)}
          tone={timesheetStatusTone(timesheet.status)}
        />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
        {timesheet.total_hours}h
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
        {timesheet.time_entries.length}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <RowActions>
          <RowAction
            icon={Eye}
            label={`View ${timesheet.project?.name ?? "timesheet"}`}
            onClick={() => router.push(`/timesheet/${timesheet.timesheet_id}`)}
          />
        </RowActions>
      </td>
    </ListRow>
  );

  const getCurrentWeekTimesheets = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return timesheets.filter((timesheet) => {
      const startDate = new Date(timesheet.start_date);
      return startDate >= oneWeekAgo;
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="My Timesheet">
        <div className="flex items-center justify-center h-64">
          <Spinner size={48} className="text-bright-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const currentTimesheets = getCurrentWeekTimesheets();

  return (
    <DashboardLayout
      title={canViewAllTimesheets() ? "Timesheet Management" : "My Timesheet"}
      subtitle={
        canViewAllTimesheets()
          ? "Track and manage work hours across all team members and projects."
          : "Track and manage your work hours across projects."
      }
      actions={
        <>
          {(activeTab === "all" || activeTab === "all-team") && (
            <ViewToggle value={view} onChange={setView} />
          )}
          <NewButton label="New timesheet" href="/timesheet/new" />
        </>
      }
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-bright" />
                <div>
                  <p className="text-sm font-medium text-muted">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? "Team Total (This Week)"
                      : "This Week"}
                  </p>
                  <p className="text-2xl font-bold text-ink">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? allTimesheets
                          .filter((ts) => {
                            const startDate = new Date(ts.start_date);
                            const now = new Date();
                            const oneWeekAgo = new Date(
                              now.getTime() - 7 * 24 * 60 * 60 * 1000
                            );
                            return startDate >= oneWeekAgo;
                          })
                          .reduce((total, ts) => total + ts.total_hours, 0)
                      : currentTimesheets.reduce(
                          (total, ts) => total + ts.total_hours,
                          0
                        )}
                    h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-info" />
                <div>
                  <p className="text-sm font-medium text-muted">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? "Team Projects"
                      : "Active Projects"}
                  </p>
                  <p className="text-2xl font-bold text-ink">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? new Set(allTimesheets.map((ts) => ts.project_id)).size
                      : projects.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-muted">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? "Total Team Timesheets"
                      : "Total Timesheets"}
                  </p>
                  <p className="text-2xl font-bold text-ink">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? allTimesheets.length
                      : timesheets.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center space-x-2">
                <Download className="h-5 w-5 text-accent-violet" />
                <div>
                  <p className="text-sm font-medium text-muted">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? "Team Pending"
                      : "Pending"}
                  </p>
                  <p className="text-2xl font-bold text-ink">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? allTimesheets.filter((ts) => ts.status === "SUBMITTED")
                          .length
                      : timesheets.filter((ts) => ts.status === "DRAFT").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList variant="line">
            <TabsTrigger value="current">Current Week</TabsTrigger>
            <TabsTrigger value="all">My Timesheets</TabsTrigger>
            {canViewAllTimesheets() && (
              <TabsTrigger value="all-team">All Team Timesheets</TabsTrigger>
            )}
            <TabsTrigger value="projects">My Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Current Week Timesheets</CardTitle>
                <CardDescription>
                  Your recent timesheet entries and current work hours
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {currentTimesheets.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-faint mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-ink mb-2">
                      No current timesheets
                    </h3>
                    <p className="text-muted mb-4">
                      Start tracking your time by creating a new timesheet
                    </p>
                    <Button
                      onClick={() => router.push("/timesheet/new")}
                      className="bg-bright hover:bg-bright-deep text-white"
                    >
                      <Plus size={16} className="mr-2" />
                      Create Timesheet
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {currentTimesheets.map((timesheet) => (
                      <div
                        key={timesheet.timesheet_id}
                        className="border border-line rounded-lg p-5 hover:bg-surface-2 cursor-pointer transition-colors"
                        onClick={() =>
                          router.push(`/timesheet/${timesheet.timesheet_id}`)
                        }
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-ink">
                            {timesheet.project.name}
                          </h4>
                          <Badge className={getStatusColor(timesheet.status)}>
                            {timesheet.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted">
                          <span>
                            {formatDate(timesheet.start_date)} -{" "}
                            {formatDate(timesheet.end_date)}
                          </span>
                          <span className="font-medium">
                            {timesheet.total_hours}h total
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-faint">
                          {timesheet.time_entries.length} entries
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <div className="space-y-6">
              <FilterBar
                search={timesheetSearch}
                onSearch={setTimesheetSearch}
                searchPlaceholder="Search timesheets by project or period…"
                resultLabel={`${visibleTimesheets.length} ${visibleTimesheets.length === 1 ? "timesheet" : "timesheets"}`}
                activeCount={timesheetStatusFilter !== "all" ? 1 : 0}
                onClear={() => setTimesheetStatusFilter("all")}
              >
                <FilterSelect
                  label="Status"
                  value={timesheetStatusFilter}
                  onChange={setTimesheetStatusFilter}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "DRAFT", label: "Draft" },
                    { value: "SUBMITTED", label: "Submitted" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "REJECTED", label: "Rejected" },
                  ]}
                />
              </FilterBar>

              {visibleTimesheets.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-10 w-10" />}
                  title="No timesheets found"
                  message={
                    timesheets.length === 0
                      ? "You haven't created any timesheets yet."
                      : "Try adjusting your search or filter to see more results."
                  }
                  action={
                    timesheets.length === 0 ? (
                      <NewButton
                        label="New timesheet"
                        href="/timesheet/new"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTimesheetSearch("");
                          setTimesheetStatusFilter("all");
                        }}
                        className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                      >
                        Clear all filters
                      </button>
                    )
                  }
                />
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {pagedTimesheets.map((timesheet) =>
                    renderTimesheetCard(timesheet)
                  )}
                </div>
              ) : (
                <ListCard>
                  <table className="w-full border-collapse">
                    <ListHead columns={TIMESHEET_COLUMNS} />
                    <tbody>
                      {pagedTimesheets.length === 0 ? (
                        <ListMessage colSpan={TIMESHEET_COLUMNS.length + 1}>
                          No timesheets on this page.
                        </ListMessage>
                      ) : (
                        pagedTimesheets.map((timesheet) =>
                          renderTimesheetRow(timesheet)
                        )
                      )}
                    </tbody>
                  </table>
                </ListCard>
              )}

              {visibleTimesheets.length > 0 && (
                <ListPagination
                  page={page}
                  pageCount={timesheetPageCount}
                  total={visibleTimesheets.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  noun="timesheet"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>My Active Projects</CardTitle>
                <CardDescription>
                  Projects available for timesheet creation
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {projects.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-faint mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-ink mb-2">
                      No active projects
                    </h3>
                    <p className="text-muted">
                      You're not currently assigned to any active projects
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {projects.map((project) => (
                      <Card
                        key={project.project_id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-5">
                          <h4 className="font-semibold text-ink mb-2">
                            {project.name}
                          </h4>
                          <Badge variant="secondary" className="mb-3">
                            {project.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              router.push(
                                `/timesheet/new?project=${project.project_id}`
                              )
                            }
                          >
                            Create Timesheet
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canViewAllTimesheets() && (
            <TabsContent value="all-team">
              <div className="space-y-6">
                <FilterBar
                  search={teamSearch}
                  onSearch={setTeamSearch}
                  searchPlaceholder="Search team timesheets by project, person or period…"
                  resultLabel={
                    allTeamLoading
                      ? "Loading…"
                      : `${visibleTeamTimesheets.length} ${visibleTeamTimesheets.length === 1 ? "timesheet" : "timesheets"}`
                  }
                  activeCount={teamStatusFilter !== "all" ? 1 : 0}
                  onClear={() => setTeamStatusFilter("all")}
                >
                  <FilterSelect
                    label="Status"
                    value={teamStatusFilter}
                    onChange={setTeamStatusFilter}
                    options={[
                      { value: "all", label: "All statuses" },
                      { value: "DRAFT", label: "Draft" },
                      { value: "SUBMITTED", label: "Submitted" },
                      { value: "APPROVED", label: "Approved" },
                      { value: "REJECTED", label: "Rejected" },
                    ]}
                  />
                </FilterBar>

                {allTeamLoading ? (
                  <LoadingState label="Loading team timesheets…" />
                ) : visibleTeamTimesheets.length === 0 ? (
                  <EmptyState
                    icon={<Clock className="h-10 w-10" />}
                    title="No team timesheets found"
                    message={
                      allTimesheets.length === 0
                        ? "There are no timesheets submitted by team members yet."
                        : "Try adjusting your search or filter to see more results."
                    }
                    action={
                      allTimesheets.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTeamSearch("");
                            setTeamStatusFilter("all");
                          }}
                          className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                        >
                          Clear all filters
                        </button>
                      ) : undefined
                    }
                  />
                ) : view === "grid" ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {pagedTeamTimesheets.map((timesheet) =>
                      renderTimesheetCard(timesheet, true)
                    )}
                  </div>
                ) : (
                  <ListCard>
                    <table className="w-full border-collapse">
                      <ListHead columns={TEAM_COLUMNS} />
                      <tbody>
                        {pagedTeamTimesheets.length === 0 ? (
                          <ListMessage colSpan={TEAM_COLUMNS.length + 1}>
                            No timesheets on this page.
                          </ListMessage>
                        ) : (
                          pagedTeamTimesheets.map((timesheet) =>
                            renderTimesheetRow(timesheet, true)
                          )
                        )}
                      </tbody>
                    </table>
                  </ListCard>
                )}

                {!allTeamLoading && visibleTeamTimesheets.length > 0 && (
                  <ListPagination
                    page={teamPage}
                    pageCount={teamPageCount}
                    total={visibleTeamTimesheets.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setTeamPage}
                    noun="timesheet"
                  />
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

      </div>
    </DashboardLayout>
  );
}
