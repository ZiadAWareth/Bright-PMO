"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Clock, Calendar, Plus, Download, Eye, Users, Search, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

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
  const [allTimesheets, setAllTimesheets] = useState<Timesheet[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState("current");

  // Modal state
  const [isNewTimesheetModalOpen, setIsNewTimesheetModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creatingTimesheet, setCreatingTimesheet] = useState(false);
  const [allTeamLoading, setAllTeamLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    }
  };

  const fetchAllProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // For admin users, show all projects
      setAllProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch all projects:", error);
      toast.error("Failed to load projects");
    }
  };

  // Helper function to validate date range
  const validateDateRange = (start: string, end: string) => {
    if (!start || !end) return { isValid: true, error: "" };

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    if (startDateObj > endDateObj) {
      return {
        isValid: false,
        error: "Start date cannot be after end date",
      };
    }

    const timeDifference = endDateObj.getTime() - startDateObj.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

    if (daysDifference > 28) {
      return {
        isValid: false,
        error: "Timesheet period cannot exceed 4 weeks",
      };
    }

    return { isValid: true, error: "" };
  };

  const openNewTimesheetModal = () => {
    if (canViewAllTimesheets()) {
      // For admin users, fetch all users and all projects
      fetchAllUsers();
      fetchAllProjects();
    } else {
      // For regular users, only fetch their projects (already loaded)
      setAllProjects(projects); // Use the projects they're already assigned to
      setSelectedUser(currentUser?.user_id?.toString() || ""); // Pre-select current user
    }

    setIsNewTimesheetModalOpen(true);

    // Set default dates (current week)
    const today = new Date();
    const startOfWeek = new Date(
      today.setDate(today.getDate() - today.getDay())
    );
    const endOfWeek = new Date(
      today.setDate(today.getDate() - today.getDay() + 6)
    );

    setStartDate(startOfWeek.toISOString().split("T")[0]);
    setEndDate(endOfWeek.toISOString().split("T")[0]);
  };

  const handleCreateTimesheet = async () => {
    // For regular users, selectedUser should be pre-filled with current user
    const targetUserId = canViewAllTimesheets()
      ? selectedUser
      : currentUser?.user_id?.toString() || "";

    if (!targetUserId || !selectedProject || !startDate || !endDate) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate date range - start date should not be after end date
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (startDateObj > endDateObj) {
      toast.error(
        "Start date cannot be after end date. Please select a valid date range."
      );
      return;
    }

    // Additional validation: check if the date range is reasonable (not more than 4 weeks)
    const timeDifference = endDateObj.getTime() - startDateObj.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

    if (daysDifference > 28) {
      toast.error(
        "Timesheet period cannot exceed 4 weeks. Please select a shorter date range."
      );
      return;
    }

    setCreatingTimesheet(true);
    try {
      const token = localStorage.getItem("token");

      // For admin users, check across all timesheets. For regular users, check their own timesheets
      const checkUrl = canViewAllTimesheets()
        ? "/api/timesheets?view_all=true"
        : "/api/timesheets";
      const checkResponse = await axios.get(checkUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const existingTimesheet = checkResponse.data.find(
        (ts: Timesheet) =>
          (canViewAllTimesheets()
            ? ts.user?.user_id === parseInt(targetUserId)
            : true) &&
          ts.project_id === parseInt(selectedProject) &&
          new Date(ts.start_date).toDateString() ===
            new Date(startDate).toDateString()
      );

      if (existingTimesheet) {
        toast.error("A timesheet already exists for this user and date range");
        return;
      }

      // Create the timesheet - only send user_id if it's different from current user (admin creating for others)
      const createData: any = {
        project_id: parseInt(selectedProject),
        start_date: startDate,
        end_date: endDate,
        status: "DRAFT",
      };

      // Only include user_id if admin is creating for someone else
      if (
        canViewAllTimesheets() &&
        targetUserId !== currentUser?.user_id?.toString()
      ) {
        createData.user_id = parseInt(targetUserId);
      }

      const response = await axios.post("/api/timesheets", createData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Timesheet created successfully");
      setIsNewTimesheetModalOpen(false);
      resetModalForm();

      // Refresh the timesheets
      fetchUserTimesheets();
      if (activeTab === "all-team") {
        fetchAllTimesheets();
      }

      // Navigate to the created timesheet
      router.push(`/timesheet/${response.data.timesheet_id}`);
    } catch (error: any) {
      console.error("Failed to create timesheet:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to create timesheet";
      toast.error(errorMessage);
    } finally {
      setCreatingTimesheet(false);
    }
  };

  const resetModalForm = () => {
    setSelectedUser("");
    setSelectedProject("");
    setStartDate("");
    setEndDate("");
    setUserSearchQuery("");
    setUserDropdownOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "SUBMITTED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "APPROVED":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCurrentWeekTimesheets = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return timesheets.filter((timesheet) => {
      const startDate = new Date(timesheet.start_date);
      return startDate >= oneWeekAgo;
    });
  };

  // Helper function to get projects filtered by selected user
  const getFilteredProjects = () => {
    if (!canViewAllTimesheets()) {
      // For regular users, return their assigned projects
      return projects;
    }

    if (!selectedUser) {
      // If no user selected, return empty array
      return [];
    }

    // For privileged users, filter projects based on selected user (team member, creator, or manager)
    const targetUserId = parseInt(selectedUser);
    return allProjects.filter((project: any) => {
      const isActiveProject =
        project.status === "execution" || project.status === "planning";
      const isTeamMember = project.team_members?.some(
        (member: any) => member.user?.user_id === targetUserId
      );
      const isCreator = project.created_by === targetUserId;
      const isManager = project.manager_id === targetUserId;
      return isActiveProject && (isTeamMember || isCreator || isManager);
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="My Timesheet">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const currentTimesheets = getCurrentWeekTimesheets();

  return (
    <DashboardLayout title="My Timesheet">
      <div className="max-w-7xl mx-auto space-y-8 px-1">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {canViewAllTimesheets() ? "Timesheet Management" : "My Timesheet"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {canViewAllTimesheets()
                ? "Track and manage work hours across all team members and projects"
                : "Track and manage your work hours across projects"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={openNewTimesheetModal}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus size={16} className="mr-2" />
              New Timesheet
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? "Team Total (This Week)"
                      : "This Week"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? "Team Projects"
                      : "Active Projects"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
                <Eye className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? "Total Team Timesheets"
                      : "Total Timesheets"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
                <Download className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {activeTab === "all-team" && canViewAllTimesheets()
                      ? "Team Pending"
                      : "Pending"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
          <TabsList className="mb-6">
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
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No current timesheets
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Start tracking your time by creating a new timesheet
                    </p>
                    <Button
                      onClick={openNewTimesheetModal}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
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
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() =>
                          router.push(`/timesheet/${timesheet.timesheet_id}`)
                        }
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {timesheet.project.name}
                          </h4>
                          <Badge className={getStatusColor(timesheet.status)}>
                            {timesheet.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            {formatDate(timesheet.start_date)} -{" "}
                            {formatDate(timesheet.end_date)}
                          </span>
                          <span className="font-medium">
                            {timesheet.total_hours}h total
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>My Timesheets</CardTitle>
                <CardDescription>
                  Complete history of your timesheet submissions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {timesheets.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No timesheets found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      You haven't created any timesheets yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {timesheets.map((timesheet) => (
                      <div
                        key={timesheet.timesheet_id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() =>
                          router.push(`/timesheet/${timesheet.timesheet_id}`)
                        }
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {timesheet.project.name}
                          </h4>
                          <Badge className={getStatusColor(timesheet.status)}>
                            {timesheet.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            {formatDate(timesheet.start_date)} -{" "}
                            {formatDate(timesheet.end_date)}
                          </span>
                          <span className="font-medium">
                            {timesheet.total_hours}h total
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                          {timesheet.time_entries.length} entries
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No active projects
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
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
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {project.name}
                          </h4>
                          <Badge variant="secondary" className="mb-3">
                            {project.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              if (canViewAllTimesheets()) {
                                setSelectedProject(
                                  project.project_id.toString()
                                );
                                openNewTimesheetModal();
                              } else {
                                router.push(
                                  `/timesheet/new?project=${project.project_id}`
                                );
                              }
                            }}
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>All Team Timesheets</CardTitle>
                  <CardDescription>
                    View and manage timesheets from all team members
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {allTeamLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="h-10 w-10 text-orange-600 animate-spin mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Loading team timesheets...</p>
                    </div>
                  ) : allTimesheets.length === 0 ? (
                    <div className="text-center py-10">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        No team timesheets found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        There are no timesheets submitted by team members yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {allTimesheets.map((timesheet) => (
                        <div
                          key={timesheet.timesheet_id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          onClick={() =>
                            router.push(`/timesheet/${timesheet.timesheet_id}`)
                          }
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                {timesheet.project.name}
                              </h4>
                              {timesheet.user && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-1 rounded">
                                    {timesheet.user.account.first_name}{" "}
                                    {timesheet.user.account.last_name}
                                  </span>
                                  {timesheet.user.role && (
                                    <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-1 rounded">
                                      {timesheet.user.role.name}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Badge className={getStatusColor(timesheet.status)}>
                              {timesheet.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>
                              {formatDate(timesheet.start_date)} -{" "}
                              {formatDate(timesheet.end_date)}
                            </span>
                            <span className="font-medium">
                              {timesheet.total_hours}h total
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-500">
                              {timesheet.time_entries.length} entries
                            </span>
                            {timesheet.user?.account.department && (
                              <span className="text-gray-500 dark:text-gray-500">
                                {timesheet.user.account.department}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* New Timesheet Modal */}
        <Dialog
          open={isNewTimesheetModalOpen}
          onOpenChange={setIsNewTimesheetModalOpen}
        >
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Create New Timesheet</DialogTitle>
              <DialogDescription>
                {canViewAllTimesheets()
                  ? "Create a timesheet for a team member. Select the user, project, and date range."
                  : "Create a new timesheet for yourself. Select the project and date range."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {canViewAllTimesheets() && (
                <div ref={userDropdownRef} className="relative">
                  <Label htmlFor="user-search">User *</Label>
                  <div className="relative mt-1.5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      id="user-search"
                      type="text"
                      value={
                        selectedUser && users.length > 0
                          ? (() => {
                              const u = users.find((u) => u.user_id.toString() === selectedUser);
                              return u
                                ? `${u.account.first_name} ${u.account.last_name} (${u.email}) ${u.role?.name || ""}`
                                : userSearchQuery;
                            })()
                          : userSearchQuery
                      }
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value);
                        setUserDropdownOpen(true);
                        setSelectedUser("");
                        setSelectedProject("");
                      }}
                      onFocus={() => setUserDropdownOpen(true)}
                      placeholder="Search by name, email, or role..."
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  {userDropdownOpen && users.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-lg py-1">
                      {users
                        .filter(
                          (user) =>
                            !userSearchQuery.trim() ||
                            `${user.account.first_name} ${user.account.last_name} ${user.email} ${user.role?.name || ""}`
                              .toLowerCase()
                              .includes(userSearchQuery.trim().toLowerCase())
                        )
                        .map((user) => (
                          <li
                            key={user.user_id}
                            role="option"
                            className="px-3 py-2.5 text-sm cursor-pointer hover:bg-orange-50 dark:hover:bg-slate-600 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-slate-600 last:border-0"
                            onClick={() => {
                              setSelectedUser(user.user_id.toString());
                              setUserSearchQuery("");
                              setUserDropdownOpen(false);
                              setSelectedProject("");
                            }}
                          >
                            <span className="font-medium">
                              {user.account.first_name} {user.account.last_name}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              ({user.email})
                            </span>
                            {user.role && (
                              <span className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 ml-2 px-1.5 py-0.5 rounded">
                                {user.role.name}
                              </span>
                            )}
                          </li>
                        ))}
                      {users.filter(
                        (u) =>
                          !userSearchQuery.trim() ||
                          `${u.account.first_name} ${u.account.last_name} ${u.email} ${u.role?.name || ""}`
                            .toLowerCase()
                            .includes(userSearchQuery.trim().toLowerCase())
                      ).length === 0 && (
                        <li className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                          No matching user
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="project-select" className="block mb-1.5">Project *</Label>
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                  disabled={canViewAllTimesheets() && !selectedUser}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        canViewAllTimesheets() && !selectedUser
                          ? "Select a user first"
                          : "Select a project"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredProjects().map((project) => (
                      <SelectItem
                        key={project.project_id}
                        value={project.project_id.toString()}
                      >
                        <div className="flex items-center space-x-2">
                          <span>{project.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canViewAllTimesheets() && !selectedUser && (
                  <p className="text-xs text-gray-500 mt-1">
                    Please select a user to see their available projects
                  </p>
                )}
                {canViewAllTimesheets() &&
                  selectedUser &&
                  getFilteredProjects().length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      This user is not assigned to any active projects
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="start-date" className="block mb-1.5">Start Date *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    max={endDate || undefined} // Prevent selecting start date after end date
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      // If end date is set and new start date is after it, clear end date
                      if (
                        endDate &&
                        new Date(e.target.value) > new Date(endDate)
                      ) {
                        setEndDate("");
                      }
                    }}
                    className={
                      validateDateRange(startDate, endDate).isValid
                        ? ""
                        : "border-red-500 focus:border-red-500 focus:ring-red-500"
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="block mb-1.5">End Date *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    min={startDate || undefined} // Prevent selecting end date before start date
                    onChange={(e) => setEndDate(e.target.value)}
                    className={
                      validateDateRange(startDate, endDate).isValid
                        ? ""
                        : "border-red-500 focus:border-red-500 focus:ring-red-500"
                    }
                  />
                </div>
              </div>

              {/* Date validation error message */}
              {startDate &&
                endDate &&
                !validateDateRange(startDate, endDate).isValid && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <span className="font-medium">Invalid date range:</span>{" "}
                      {validateDateRange(startDate, endDate).error}
                    </p>
                  </div>
                )}

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsNewTimesheetModalOpen(false);
                    resetModalForm();
                  }}
                  disabled={creatingTimesheet}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTimesheet}
                  disabled={
                    creatingTimesheet ||
                    (canViewAllTimesheets() ? !selectedUser : false) ||
                    (canViewAllTimesheets() &&
                      selectedUser &&
                      getFilteredProjects().length === 0) ||
                    !selectedProject ||
                    !startDate ||
                    !endDate ||
                    !validateDateRange(startDate, endDate).isValid
                  }
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {creatingTimesheet ? "Creating..." : "Create Timesheet"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
