"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Users,
  Search,
  Filter,
  Download,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  Clock,
  Activity,
  Building,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import axios from "axios";

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

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const workloadResponse = await axios.get("/api/users/workload", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(workloadResponse.data);
    } catch (error) {
      console.error("Error fetching users workload:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment =
      departmentFilter === "all" || user.department === departmentFilter;

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    const matchesStatus = statusFilter === "all" || user.status === statusFilter;

    const matchesCapacity =
      capacityFilter === "all" || user.capacity_status === capacityFilter;

    return (
      matchesSearch &&
      matchesDepartment &&
      matchesRole &&
      matchesStatus &&
      matchesCapacity
    );
  });

  const departments = Array.from(new Set(users.map((u) => u.department)));
  const roles = Array.from(new Set(users.map((u) => u.role)));

  const getCapacityBadge = (status: string) => {
    const colors: Record<string, string> = {
      available: "bg-blue-500",
      under_utilized: "bg-yellow-500",
      optimal: "bg-green-500",
      overloaded: "bg-red-500",
    };
    return (
      <Badge className={colors[status] || "bg-gray-400"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Department",
      "Role",
      "Status",
      "Projects",
      "Active Tasks",
      "Hours Allocated",
      "Hours Logged",
      "Utilization %",
      "Capacity Status",
    ];

    const rows = filteredUsers.map((user) => [
      user.name,
      user.email,
      user.department,
      user.role,
      user.status,
      user.total_projects,
      user.active_tasks,
      user.total_hours_allocated.toFixed(2),
      user.total_hours_logged.toFixed(2),
      user.utilization_percentage.toFixed(1),
      user.capacity_status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `users_workload_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Statistics
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    overloaded: users.filter((u) => u.capacity_status === "overloaded").length,
    available: users.filter((u) => u.capacity_status === "available").length,
  };

  if (loading) {
    return (
      <DashboardLayout title="User Management">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p>Loading users...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="User Management">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            Manage team members, track workload, and optimize resource allocation
          </p>
          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.available}</div>
              <p className="text-xs text-muted-foreground">
                Ready for assignments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overloaded</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overloaded}</div>
              <p className="text-xs text-muted-foreground">
                Need rebalancing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Utilization
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.length > 0
                  ? (
                      users.reduce((sum, u) => sum + u.utilization_percentage, 0) /
                      users.length
                    ).toFixed(1)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">Team average</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Capacity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Capacities</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="under_utilized">Under Utilized</SelectItem>
                  <SelectItem value="optimal">Optimal</SelectItem>
                  <SelectItem value="overloaded">Overloaded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Active Tasks</TableHead>
                  <TableHead>Hours Allocated</TableHead>
                  <TableHead>Hours Logged</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.user_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/users/${user.user_id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/users/${user.user_id}`}
                          className="block hover:underline focus:outline-none focus:underline"
                        >
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "active" ? "default" : "secondary"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.total_projects}</TableCell>
                      <TableCell>{user.active_tasks}</TableCell>
                      <TableCell>{user.total_hours_allocated.toFixed(1)}h</TableCell>
                      <TableCell>{user.total_hours_logged.toFixed(1)}h</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                user.utilization_percentage > 100
                                  ? "bg-red-500"
                                  : user.utilization_percentage > 80
                                  ? "bg-green-500"
                                  : user.utilization_percentage > 50
                                  ? "bg-yellow-500"
                                  : "bg-blue-500"
                              }`}
                              style={{
                                width: `${Math.min(user.utilization_percentage, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm">
                            {user.utilization_percentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getCapacityBadge(user.capacity_status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
