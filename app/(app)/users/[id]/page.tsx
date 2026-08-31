"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  User as UserIcon,
  Mail,
  Building,
  Briefcase,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart,
  FileText,
  ArrowLeft,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSection, InfoGrid } from "@/components/ui/form-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import axios from "axios";
import { Spinner } from "@/components/ui/spinner";

interface User {
  user_id: number;
  username: string;
  email: string;
  status: string;
  account?: {
    first_name: string;
    last_name: string;
    department: string;
    phone_number?: string;
  };
  role?: {
    role_id: number;
    name: string;
  };
}

interface Role {
  role_id: number;
  name: string;
}

interface UserWorkload {
  user_id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  status: string;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  overdue_tasks_count: number;
  total_hours_allocated: number;
  total_hours_logged: number;
  total_capacity_hours: number;
  available_hours: number;
  utilization_percentage: number;
  capacity_status: string;
  project_breakdown: Array<{
    project_id: number;
    project_name: string;
    project_status: string;
    role: string;
    is_lead: boolean;
    task_count: number;
    active_tasks: number;
    completed_tasks: number;
    estimated_hours: number;
    actual_hours: number;
    progress: number;
  }>;
  task_breakdown: {
    todo: number;
    in_progress: number;
    completed: number;
    total: number;
  };
  upcoming_tasks: Array<{
    task_id: number;
    task_name: string;
    project_id: number;
    status: string;
    start_date: string;
    end_date: string;
    estimated_hours: number;
    progress: number;
  }>;
  overdue_tasks_list: Array<{
    task_id: number;
    task_name: string;
    status: string;
    end_date: string;
    days_overdue: number;
  }>;
  weekly_time_distribution: Array<{
    week_start: string;
    week_end: string;
    hours: number;
    entries_count: number;
  }>;
  period: {
    start_date: string;
    end_date: string;
    weeks: number;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [workload, setWorkload] = useState<UserWorkload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios
      .get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setCurrentUserRole(res.data?.user?.role?.name ?? null))
      .catch(() => {});
  }, []);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch user basic info
      const userResponse = await axios.get(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch user workload
      const workloadResponse = await axios.get(`/api/users/${userId}/workload`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(userResponse.data.user);
      setWorkload(workloadResponse.data);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      available: "bg-info",
      under_utilized: "bg-warning",
      optimal: "bg-success",
      overloaded: "bg-danger",
    };
    return <Badge className={colors[status] || "bg-faint"}>{status.replace("_", " ")}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout
        title="User Details"
        backHref="/users"
        backLabel="Back to Users"
      >
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Spinner size={48} className="mx-auto mb-4 text-bright-primary" />
            <p>Loading user details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !workload) {
    return (
      <DashboardLayout
        title="User Details"
        backHref="/users"
        backLabel="Back to Users"
      >
        <div className="flex flex-col items-center justify-center h-screen">
          <AlertTriangle className="h-16 w-16 text-danger mb-4" />
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The user you're looking for doesn't exist or you don't have permission to view it.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const profileRows: [string, React.ReactNode][] = [
    ["Email", workload.email],
    ["Department", workload.department || "—"],
    ["Role", workload.role || "—"],
    [
      "Account Status",
      <Badge
        key="status"
        variant={user.status === "active" ? "default" : "secondary"}
      >
        {user.status}
      </Badge>,
    ],
    ["Capacity", getStatusBadge(workload.capacity_status)],
    [
      "Utilization",
      <span key="utilization" className="tabular-nums">
        {workload.utilization_percentage.toFixed(0)}%
      </span>,
    ],
  ];

  return (
    <DashboardLayout
      title={workload.name}
      subtitle={[workload.role, workload.department]
        .filter(Boolean)
        .join(" · ")}
      backHref="/users"
      backLabel="Back to Users"
      actions={
        currentUserRole === "ADMIN" ? (
          <Button variant="outline" size="sm" onClick={() => router.push(`/users/${userId}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit user
          </Button>
        ) : undefined
      }
    >
      <div className="container mx-auto p-6 space-y-6">

        <FormSection title="Profile">
          <InfoGrid rows={profileRows} />
        </FormSection>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workload.active_projects}</div>
              <p className="text-xs text-muted-foreground">
                of {workload.total_projects} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workload.active_tasks}</div>
              <p className="text-xs text-muted-foreground">
                {workload.completed_tasks} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Allocated</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workload.total_hours_allocated.toFixed(0)}h
              </div>
              <p className="text-xs text-muted-foreground">
                {workload.total_hours_logged.toFixed(0)}h logged
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-danger">
                {workload.overdue_tasks_count}
              </div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="workload">Workload</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Capacity Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Hours Allocated</span>
                      <span className="font-medium">
                        {workload.total_hours_allocated.toFixed(0)}h
                      </span>
                    </div>
                    <Progress
                      value={
                        (workload.total_hours_allocated /
                          workload.total_capacity_hours) *
                        100
                      }
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Hours Logged</span>
                      <span className="font-medium">
                        {workload.total_hours_logged.toFixed(0)}h
                      </span>
                    </div>
                    <Progress
                      value={
                        (workload.total_hours_logged /
                          workload.total_capacity_hours) *
                        100
                      }
                    />
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Total Capacity</span>
                      <span className="font-medium">
                        {workload.total_capacity_hours}h
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Available Hours</span>
                      <span className="font-medium text-success">
                        {workload.available_hours.toFixed(0)}h
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Period</span>
                      <span className="font-medium">
                        {workload.period.weeks} weeks
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Task Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">To Do</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-surface-3 rounded-full h-2">
                          <div
                            className="bg-info h-2 rounded-full"
                            style={{
                              width: `${
                                workload.task_breakdown.total > 0
                                  ? (workload.task_breakdown.todo /
                                      workload.task_breakdown.total) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">
                          {workload.task_breakdown.todo}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">In Progress</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-surface-3 rounded-full h-2">
                          <div
                            className="bg-warning h-2 rounded-full"
                            style={{
                              width: `${
                                workload.task_breakdown.total > 0
                                  ? (workload.task_breakdown.in_progress /
                                      workload.task_breakdown.total) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">
                          {workload.task_breakdown.in_progress}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completed</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-surface-3 rounded-full h-2">
                          <div
                            className="bg-success h-2 rounded-full"
                            style={{
                              width: `${
                                workload.task_breakdown.total > 0
                                  ? (workload.task_breakdown.completed /
                                      workload.task_breakdown.total) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">
                          {workload.task_breakdown.completed}
                        </span>
                      </div>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Total Tasks</span>
                        <span>{workload.task_breakdown.total}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overdue Tasks Alert */}
            {workload.overdue_tasks_count > 0 && (
              <Card className="border-danger">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-danger">
                    <AlertTriangle className="h-5 w-5" />
                    Overdue Tasks ({workload.overdue_tasks_count})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Days Overdue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workload.overdue_tasks_list?.map((task) => (
                        <TableRow key={task.task_id}>
                          <TableCell>{task.task_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{task.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(task.end_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-danger font-medium">
                            {task.days_overdue} days
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Project Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead>Est. Hours</TableHead>
                      <TableHead>Actual Hours</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workload.project_breakdown.map((project) => (
                      <TableRow 
                        key={project.project_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/projects/${project.project_id}`)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{project.project_name}</div>
                            {project.is_lead && (
                              <Badge variant="outline" className="mt-1">
                                Lead
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{project.role}</TableCell>
                        <TableCell>
                          <Badge>{project.project_status}</Badge>
                        </TableCell>
                        <TableCell>
                          {project.active_tasks} / {project.task_count}
                        </TableCell>
                        <TableCell>{project.estimated_hours.toFixed(1)}h</TableCell>
                        <TableCell>{project.actual_hours.toFixed(1)}h</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={project.progress} className="w-20" />
                            <span className="text-sm">{project.progress}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {workload.upcoming_tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No upcoming tasks</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Est. Hours</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workload.upcoming_tasks.map((task) => (
                        <TableRow 
                          key={task.task_id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/projects/${task.project_id}?task=${task.task_id}`)}
                        >
                          <TableCell className="font-medium">{task.task_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{task.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(task.start_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(task.end_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{task.estimated_hours}h</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={task.progress} className="w-20" />
                              <span className="text-sm">{task.progress}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workload Tab */}
          <TabsContent value="workload">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Hours Logged</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Capacity Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workload.weekly_time_distribution.map((week, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(week.week_start).toLocaleDateString()} -{" "}
                          {new Date(week.week_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{week.hours.toFixed(1)}h</TableCell>
                        <TableCell>{week.entries_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={(week.hours / 40) * 100} className="w-32" />
                            <span className="text-sm">
                              {((week.hours / 40) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
