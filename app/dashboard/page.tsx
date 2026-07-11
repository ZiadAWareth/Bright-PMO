"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import axios from "@/lib/axios";
import {
    LayoutDashboard,
    AlertTriangle,
    Users,
    DollarSign,
    Plus,
    ArrowUp,
    ArrowDown,
    CheckCircle,
    Clock,
    Target,
    TrendingUp,
    Shield,
    FileCheck,
    BarChart3,
    Activity,
    Calendar,
    Settings,
} from "lucide-react";

interface Project {
    project_id: number;
    project_code: string;
    name: string;
    description: string;
    start_date: string;
    planned_end_date: string;
    actual_end_date: string | null;
    status: string;
    budget_amount: number;
    actual_cost: number;
    progress_percentage: number;
    creator: {
        account: {
            first_name: string;
            last_name: string;
        };
    };
    team_members: Array<{
        user: {
            account: {
                first_name: string;
                last_name: string;
            };
        };
    }>;
}

interface Activity {
    id: number;
    type: "success" | "warning" | "danger" | "primary";
    title: string;
    description: string;
    time: string;
}

// Real activity interface from API
interface RecentActivity {
    activity_id: number;
    user_id: number;
    action: string;
    entity_type: string;
    entity_id: number | null;
    title: string;
    description: string | null;
    metadata: any;
    created_at: string;
    user: {
        username: string;
        account: {
            first_name: string;
            last_name: string;
        } | null;
    };
}

interface Metric {
    label: string;
    value: string;
    change: string;
    changeType: "positive" | "negative";
    icon: React.ReactNode;
    iconColor: string;
}

interface Task {
    id: number;
    title: string;
    project: string;
    priority: "high" | "medium" | "low";
    dueDate: string;
    status: "pending" | "in-progress" | "completed";
}

interface RFQResponse {
    rfq_response_id: number;
    procurement_id: number;
    vendor_id: number;
    quote_amount: number;
    delivery_time: string;
    technical_score: number;
    commercial_score: number;
    total_score: number;
    status: string;
    submitted_date: string;
    notes: string | null;
    procurement: {
        procurement_id: number;
        description: string;
        type: string;
        status: string;
        estimated_cost: number;
        project: {
            name: string;
        };
    };
    vendor: {
        name: string;
    };
}

interface Procurement {
    procurement_id: number;
    project_id: number;
    type: string;
    description: string;
    estimated_cost: number;
    actual_cost: number;
    status: string;
    created_at: string;
    project: {
        name: string;
    };
    contracts: Array<{
        contract_id: number;
        status: string;
    }>;
}

const Dashboard = () => {
    const router = useRouter();
    const [activeView, setActiveView] = useState("admin");
    const [projects, setProjects] = useState<Project[]>([]);
    const [portfolios, setPortfolios] = useState<any[]>([]);
    const [rfqResponses, setRfqResponses] = useState<RFQResponse[]>([]);
    const [procurements, setProcurements] = useState<Procurement[]>([]);
    const [userTasks, setUserTasks] = useState<any[]>([]);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [activityPage, setActivityPage] = useState(0);
    const [hasMoreActivities, setHasMoreActivities] = useState(true);
    const activityPageSize = 10;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [resourceUtilization, setResourceUtilization] = useState(0);


    useEffect(() => {
        setIsClient(true);
    }, []);

    // Fetch projects from API
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                const response = await axios.get("/api/projects", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });
                setProjects(response.data);
                setError(null);
            } catch (err) {
                console.error("Error fetching projects:", err);
                setError("Failed to load projects");
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    // --- Recent Activities fetch function ---
    const fetchRecentActivities = React.useCallback(async (page = 0) => {
        try {
            const response = await axios.get(`/api/recent-activities?limit=${activityPageSize}&offset=${page * activityPageSize}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            const newActivities = response.data.activities || [];
            if (page === 0) {
                setRecentActivities(newActivities);
            } else {
                setRecentActivities((prev) => [...prev, ...newActivities]);
            }
            setHasMoreActivities(newActivities.length === activityPageSize);
        } catch (err) {
            console.error("Error fetching recent activities:", err);
        }
    }, [activityPageSize]);

    // --- Infinite scroll handler for recent activities ---
    const handleActivityScroll = React.useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop <= clientHeight + 50 && hasMoreActivities) {
                // Load next page
                const nextPage = activityPage + 1;
                fetchRecentActivities(nextPage);
                setActivityPage(nextPage);
            }
        },
        [activityPage, hasMoreActivities, fetchRecentActivities]
    );

    // --- Fetching data ---
    useEffect(() => {
        const fetchPortfolios = async () => {
            try {
                const response = await axios.get("/api/portfolios", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });
                setPortfolios(response.data);
            } catch (err) {
                console.error("Error fetching portfolios:", err);
            }
        };

        const fetchRFQData = async () => {
            try {
                // Fetch RFQ responses
                const rfqResponse = await axios.get("/api/rfq-responses", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });
                setRfqResponses(rfqResponse.data);

                // Fetch procurements
                const procurementResponse = await axios.get(
                    "/api/procurements",
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    }
                );
                setProcurements(procurementResponse.data);
            } catch (err) {
                console.error("Error fetching RFQ/procurement data:", err);
            }
        };

        const fetchUserTasks = async () => {
            try {
                const response = await axios.get("/api/tasks", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });
                setUserTasks(response.data);
            } catch (err) {
                console.error("Error fetching user tasks:", err);
            }
        };

        const fetchResourceUtilization = async () => {
            try {
                const getCurrentDate = new Date();
                const startDate = new Date(getCurrentDate.getFullYear(), 0, 1); // January 1st of current year
                const endDate = new Date(getCurrentDate.getFullYear(), 11, 31); // December 31st of current year
                console.log(startDate, endDate);
                const response = await axios.get(
                    `/api/resources/workload?start_date=${
                        startDate.toISOString().split("T")[0]
                    }&end_date=${endDate.toISOString().split("T")[0]}`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    }
                );
                console.log(response.data);
                // Calculate average utilization from all resources
                const resources = response.data.resources || [];
                if (resources.length > 0) {
                    const avgUtilization = resources.reduce(
                        (sum: number, r: any) => sum + (r.planned_utilization_rate || 0),
                        0
                    ) / resources.length;
                    setResourceUtilization(avgUtilization);
                } else {
                    setResourceUtilization(0);
                }
            } catch (err) {
                console.error("Error fetching resource utilization:", err);
                setResourceUtilization(0);
            }
        };

        const fetchUserRole = async () => {
            try {
                const response = await axios.get("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });
                console.log("User role:", response.data.user.role.name);
                setActiveView(response.data.user.role.name);
            } catch (err) {
                console.error("Error fetching user role:", err);
            }
        };

        fetchUserRole();
        fetchResourceUtilization();
        fetchPortfolios();
        fetchRFQData();
        fetchUserTasks();
        fetchRecentActivities(0);
        setActivityPage(0);
    }, [fetchRecentActivities]);

    // Role-specific data
    const getRoleSpecificMetrics = (role: string): Metric[] => {
        const totalProjects = projects.length;
        const activeProjects = projects.filter(
            (p) => p.status === "execution"
        ).length;
        const completedProjects = projects.filter(
            (p) => p.status === "completed"
        ).length;
        const delayedProjects = projects.filter((p) => {
            if (p.actual_end_date) return false;
            const plannedEnd = p.planned_end_date ? new Date(p.planned_end_date) : new Date();
            const today = new Date();
            return plannedEnd < today && p.progress_percentage < 100;
        }).length;

        switch (role) {
            case "ADMIN": {
                // Calculate total budget variance (Planned - Actual)
                const totalPlannedBudget = projects.reduce(
                    (sum, p) => sum + (p.budget_amount || 0),
                    0
                );
                const totalActualCost = projects.reduce(
                    (sum, p) => sum + (p.actual_cost || 0),
                    0
                );
                const totalVariance = totalPlannedBudget - totalActualCost;
                const variancePercentage = totalPlannedBudget > 0 
                    ? ((totalVariance / totalPlannedBudget) * 100)
                    : 0;
                const formattedVariance = `OMR ${Math.abs(totalVariance).toLocaleString()}`;
                return [
                    {
                        label: "Total Projects",
                        value: totalProjects.toString(),
                        change: `${activeProjects} active, ${completedProjects} completed`,
                        changeType: "positive",
                        icon: <LayoutDashboard size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Total Portfolios",
                        value: portfolios.length.toString(),
                        change: `${
                            portfolios.filter((p) => p.status === "active")
                                .length
                        } active, ${
                            portfolios.filter((p) => p.status === "completed")
                                .length
                        } completed`,
                        changeType: "positive",
                        icon: <LayoutDashboard size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Resource Utilization",
                        value: resourceUtilization
                            ? `${resourceUtilization.toFixed(1)}%`
                            : "N/A",
                        change: resourceUtilization
                            ? `${
                                  resourceUtilization >= 80 ? "Above" : "Below"
                              } target`
                            : "No data",
                        changeType:
                            resourceUtilization >= 80 ? "positive" : "negative",
                        icon: <Users size={24} />,
                        iconColor:
                            resourceUtilization >= 80 ? "success" : "warning",
                    },
                    {
                        label: "Budget Variance",
                        value: formattedVariance,
                        change:
                            totalVariance >= 0 
                                ? `${variancePercentage.toFixed(1)}% under budget` 
                                : `${Math.abs(variancePercentage).toFixed(1)}% over budget`,
                        changeType: totalVariance >= 0 ? "positive" : "negative",
                        icon: <DollarSign size={24} />,
                        iconColor: totalVariance >= 0 ? "success" : "warning",
                    },
                ];
            }

            case "PJM": {
                // Calculate PJM-specific metrics from real data
                const pjmProjects = projects.filter(
                    (p) => p.status === "active" || p.status === "execution"
                );
                const totalPJMBudget = pjmProjects.reduce(
                    (sum, p) => sum + (p.budget_amount || 0),
                    0
                );
                const totalPJMActual = pjmProjects.reduce(
                    (sum, p) => sum + (p.actual_cost || 0),
                    0
                );
                const pjmBudgetUtilization =
                    totalPJMBudget > 0
                        ? ((totalPJMActual / totalPJMBudget) * 100).toFixed(1)
                        : "0";

                return [
                    {
                        label: "My Projects",
                        value: activeProjects.toString(),
                        change: `${completedProjects} completed`,
                        changeType: "positive",
                        icon: <LayoutDashboard size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Project Tasks",
                        value: userTasks
                            .filter((t) => t.status !== "completed")
                            .length.toString(),
                        change: `${
                            userTasks.filter((t) => t.status === "completed")
                                .length
                        } completed`,
                        changeType: "positive",
                        icon: <FileCheck size={24} />,
                        iconColor: "success",
                    },
                    {
                        label: "Budget Utilization",
                        value:
                            totalPJMBudget > 0
                                ? `${pjmBudgetUtilization}%`
                                : "N/A",
                        change:
                            totalPJMBudget > 0
                                ? "Of allocated budget"
                                : "No budget data",
                        changeType:
                            parseFloat(pjmBudgetUtilization) <= 90
                                ? "positive"
                                : "negative",
                        icon: <DollarSign size={24} />,
                        iconColor:
                            parseFloat(pjmBudgetUtilization) <= 90
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Project Progress",
                        value:
                            pjmProjects.length > 0
                                ? `${(
                                      pjmProjects.reduce(
                                          (sum, p) =>
                                              sum + p.progress_percentage,
                                          0
                                      ) / pjmProjects.length
                                  ).toFixed(1)}%`
                                : "N/A",
                        change:
                            pjmProjects.length > 0
                                ? "Average completion"
                                : "No projects",
                        changeType: "positive",
                        icon: <Target size={24} />,
                        iconColor: "primary",
                    },
                ];
            }

            case "technical": {
                // Calculate technical-specific metrics from real data
                const technicalTasks = userTasks.filter(
                    (t) => t.status !== "completed"
                );
                const completedTechnicalTasks = userTasks.filter(
                    (t) => t.status === "completed"
                );
                const avgTaskProgress =
                    technicalTasks.length > 0
                        ? (
                              technicalTasks.reduce(
                                  (sum, t) =>
                                      sum + (t.progress_percentage || 0),
                                  0
                              ) / technicalTasks.length
                          ).toFixed(1)
                        : "0";

                return [
                    {
                        label: "Assigned Tasks",
                        value: technicalTasks.length.toString(),
                        change: `${completedTechnicalTasks.length} completed`,
                        changeType: "positive",
                        icon: <CheckCircle size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Task Progress",
                        value:
                            technicalTasks.length > 0
                                ? `${avgTaskProgress}%`
                                : "N/A",
                        change:
                            technicalTasks.length > 0
                                ? "Average completion"
                                : "No tasks",
                        changeType:
                            parseFloat(avgTaskProgress) >= 50
                                ? "positive"
                                : "negative",
                        icon: <Target size={24} />,
                        iconColor:
                            parseFloat(avgTaskProgress) >= 50
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Active Projects",
                        value: projects
                            .filter(
                                (p) =>
                                    p.status === "active" ||
                                    p.status === "execution"
                            )
                            .length.toString(),
                        change: "Projects with tasks",
                        changeType: "positive",
                        icon: <LayoutDashboard size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Pending Tasks",
                        value: userTasks
                            .filter((t) => t.status === "todo")
                            .length.toString(),
                        change: "Not started",
                        changeType:
                            userTasks.filter((t) => t.status === "todo")
                                .length === 0
                                ? "positive"
                                : "negative",
                        icon: <Clock size={24} />,
                        iconColor:
                            userTasks.filter((t) => t.status === "todo")
                                .length === 0
                                ? "success"
                                : "warning",
                    },
                ];
            }

            case "pmo": {
                // Calculate PMO-specific metrics from real data
                const pmoPortfolioHealth =
                    portfolios.length > 0
                        ? (
                              (portfolios.filter((p) => p.status === "active")
                                  .length /
                                  portfolios.length) *
                              100
                          ).toFixed(1)
                        : "0";
                const pmoActiveProjects = projects.filter(
                    (p) => p.status === "active" || p.status === "execution"
                ).length;
                const totalPMOBudget = projects.reduce(
                    (sum, p) => sum + (p.budget_amount || 0),
                    0
                );
                const totalPMOActual = projects.reduce(
                    (sum, p) => sum + (p.actual_cost || 0),
                    0
                );
                const pmoResourceEfficiency =
                    totalPMOBudget > 0
                        ? (
                              ((totalPMOBudget - totalPMOActual) /
                                  totalPMOBudget) *
                              100
                          ).toFixed(1)
                        : "0";

                return [
                    {
                        label: "Portfolio Health",
                        value:
                            portfolios.length > 0
                                ? `${pmoPortfolioHealth}%`
                                : "N/A",
                        change:
                            portfolios.length > 0
                                ? `${
                                      portfolios.filter(
                                          (p) => p.status === "active"
                                      ).length
                                  } active portfolios`
                                : "No portfolios",
                        changeType:
                            parseFloat(pmoPortfolioHealth) >= 80
                                ? "positive"
                                : "negative",
                        icon: <BarChart3 size={24} />,
                        iconColor:
                            parseFloat(pmoPortfolioHealth) >= 80
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Active Projects",
                        value: pmoActiveProjects.toString(),
                        change: `${projects.length} total projects`,
                        changeType: "positive",
                        icon: <LayoutDashboard size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Budget Efficiency",
                        value:
                            totalPMOBudget > 0
                                ? `${pmoResourceEfficiency}%`
                                : "N/A",
                        change:
                            totalPMOBudget > 0
                                ? "Budget variance"
                                : "No budget data",
                        changeType:
                            parseFloat(pmoResourceEfficiency) >= 0
                                ? "positive"
                                : "negative",
                        icon: <DollarSign size={24} />,
                        iconColor:
                            parseFloat(pmoResourceEfficiency) >= 0
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Delayed Projects",
                        value: delayedProjects.toString(),
                        change:
                            delayedProjects === 0
                                ? "All on track"
                                : "Need attention",
                        changeType:
                            delayedProjects === 0 ? "positive" : "negative",
                        icon: <AlertTriangle size={24} />,
                        iconColor:
                            delayedProjects === 0 ? "success" : "warning",
                    },
                ];
            }

            case "FIN": {
                // Calculate financial metrics
                const totalBudget = projects.reduce(
                    (sum, p) => sum + (p.budget_amount || 0),
                    0
                );
                const totalActualCost = projects.reduce(
                    (sum, p) => sum + (p.actual_cost || 0),
                    0
                );
                const budgetUtilization =
                    totalBudget > 0
                        ? ((totalActualCost / totalBudget) * 100).toFixed(1)
                        : "0";
                const costVarianceNum =
                    totalBudget > 0
                        ? ((totalActualCost - totalBudget) / totalBudget) * 100
                        : 0;
                const costVariance = costVarianceNum.toFixed(1);
                // Calculate actual ROI from project data
                const totalInvestment = projects.reduce(
                    (sum, p) => sum + (p.budget_amount || 0),
                    0
                );
                const totalReturns = projects.reduce(
                    (sum, p) => sum + (p.actual_cost || 0),
                    0
                );
                const actualROI =
                    totalInvestment > 0
                        ? ((totalInvestment - totalReturns) / totalInvestment) *
                          100
                        : 0;
                const avgProjectROI = actualROI.toFixed(1);
                const ongoingProjects = projects.filter(
                    (p) => p.status === "execution" || p.status === "active"
                ).length;

                return [
                    {
                        label: "Budget Utilization",
                        value: `${budgetUtilization}%`,
                        change: `$${(totalActualCost / 1000000).toFixed(
                            1
                        )}M spent of $${(totalBudget / 1000000).toFixed(1)}M`,
                        changeType:
                            parseFloat(budgetUtilization) <= 95
                                ? "positive"
                                : "negative",
                        icon: <DollarSign size={24} />,
                        iconColor:
                            parseFloat(budgetUtilization) <= 95
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Cost Variance",
                        value: `${
                            costVarianceNum >= 0 ? "+" : ""
                        }${costVariance}%`,
                        change:
                            costVarianceNum < 0
                                ? "Under budget"
                                : "Over budget",
                        changeType:
                            costVarianceNum <= 0 ? "positive" : "negative",
                        icon: <TrendingUp size={24} />,
                        iconColor: costVarianceNum <= 0 ? "success" : "warning",
                    },
                    {
                        label: "Portfolio ROI",
                        value:
                            totalInvestment > 0 ? `${avgProjectROI}%` : "N/A",
                        change:
                            totalInvestment > 0
                                ? actualROI >= 0
                                    ? "Positive returns"
                                    : "Negative returns"
                                : "No data",
                        changeType: actualROI >= 0 ? "positive" : "negative",
                        icon: <BarChart3 size={24} />,
                        iconColor: actualROI >= 0 ? "success" : "warning",
                    },
                    {
                        label: "Ongoing Projects",
                        value: ongoingProjects.toString(),
                        change: `${totalProjects} total projects`,
                        changeType: "positive",
                        icon: <LayoutDashboard size={24} />,
                        iconColor: "primary",
                    },
                ];
            }

            case "executive": {
                // Calculate executive-specific metrics from real data
                const executiveTotalBudget = projects.reduce(
                    (sum, p) => sum + (p.budget_amount || 0),
                    0
                );
                const executiveTotalActual = projects.reduce(
                    (sum, p) => sum + (p.actual_cost || 0),
                    0
                );
                const executiveROI =
                    executiveTotalBudget > 0
                        ? (
                              ((executiveTotalBudget - executiveTotalActual) /
                                  executiveTotalBudget) *
                              100
                          ).toFixed(1)
                        : "0";
                const budgetPerformance =
                    executiveTotalBudget > 0
                        ? (
                              (executiveTotalActual / executiveTotalBudget) *
                              100
                          ).toFixed(1)
                        : "0";

                return [
                    {
                        label: "Portfolio ROI",
                        value:
                            executiveTotalBudget > 0
                                ? `${executiveROI}%`
                                : "N/A",
                        change:
                            executiveTotalBudget > 0
                                ? parseFloat(executiveROI) >= 0
                                    ? "Positive returns"
                                    : "Negative returns"
                                : "No data",
                        changeType:
                            parseFloat(executiveROI) >= 0
                                ? "positive"
                                : "negative",
                        icon: <TrendingUp size={24} />,
                        iconColor:
                            parseFloat(executiveROI) >= 0
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Strategic Projects",
                        value: `${activeProjects}/${totalProjects}`,
                        change:
                            activeProjects === 0
                                ? "No active projects"
                                : "In progress",
                        changeType:
                            activeProjects > 0 ? "positive" : "negative",
                        icon: <Target size={24} />,
                        iconColor: activeProjects > 0 ? "primary" : "warning",
                    },
                    {
                        label: "Budget Performance",
                        value:
                            executiveTotalBudget > 0
                                ? `${budgetPerformance}%`
                                : "N/A",
                        change:
                            executiveTotalBudget > 0
                                ? "Budget utilization"
                                : "No budget data",
                        changeType:
                            parseFloat(budgetPerformance) <= 100
                                ? "positive"
                                : "negative",
                        icon: <DollarSign size={24} />,
                        iconColor:
                            parseFloat(budgetPerformance) <= 100
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Project Health",
                        value:
                            totalProjects > 0
                                ? `${(
                                      ((activeProjects + completedProjects) /
                                          totalProjects) *
                                      100
                                  ).toFixed(1)}%`
                                : "N/A",
                        change:
                            delayedProjects === 0
                                ? "All projects on track"
                                : `${delayedProjects} delayed`,
                        changeType:
                            delayedProjects === 0 ? "positive" : "negative",
                        icon: <Shield size={24} />,
                        iconColor:
                            delayedProjects === 0 ? "success" : "warning",
                    },
                ];
            }

            case "PROC": {
                // Calculate procurement-specific metrics from real data
                const totalContracts = procurements.reduce(
                    (sum, p) => sum + (p.contracts?.length || 0),
                    0
                );
                const pendingRFQs = rfqResponses.filter(
                    (r) => r && r.status === "Submitted"
                ).length;
                const activeRFQs = rfqResponses.filter(
                    (r) =>
                        r && r.status !== "Awarded" && r.status !== "Rejected"
                ).length;
                const contractsComplianceRate =
                    totalContracts > 0
                        ? (
                              (procurements.filter((p) =>
                                  p.contracts?.some(
                                      (c) => c.status === "active"
                                  )
                              ).length /
                                  totalContracts) *
                              100
                          ).toFixed(1)
                        : "0";

                // Calculate average procurement cycle from actual data
                const procurementsWithDates = procurements.filter(
                    (p) => p.created_at
                );
                const avgProcurementCycle =
                    procurementsWithDates.length > 0
                        ? Math.round(
                              procurementsWithDates.reduce((sum, p) => {
                                  const createdDate = new Date(p.created_at);
                                  const today = new Date();
                                  const daysDiff = Math.ceil(
                                      (today.getTime() -
                                          createdDate.getTime()) /
                                          (1000 * 60 * 60 * 24)
                                  );
                                  return sum + daysDiff;
                              }, 0) / procurementsWithDates.length
                          )
                        : 0;

                // Calculate cost savings (estimated vs actual costs)
                const totalEstimated = procurements.reduce(
                    (sum, p) => sum + (p.estimated_cost || 0),
                    0
                );
                const totalActual = procurements.reduce(
                    (sum, p) => sum + (p.actual_cost || 0),
                    0
                );
                const costSavings =
                    totalEstimated > 0 ? totalEstimated - totalActual : 0;
                const savingsPercentage =
                    totalEstimated > 0
                        ? ((costSavings / totalEstimated) * 100).toFixed(1)
                        : "0";

                return [
                    {
                        label: "Active RFQs",
                        value: activeRFQs.toString(),
                        change: `${pendingRFQs} pending evaluation`,
                        changeType: "positive",
                        icon: <FileCheck size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Total Contracts",
                        value: totalContracts.toString(),
                        change: `${procurements.length} procurements`,
                        changeType: "positive",
                        icon: <Shield size={24} />,
                        iconColor: "success",
                    },
                    {
                        label: "Procurement Cycle",
                        value:
                            avgProcurementCycle > 0
                                ? `${avgProcurementCycle} days`
                                : "N/A",
                        change:
                            avgProcurementCycle > 0
                                ? `Average cycle time`
                                : "No data",
                        changeType:
                            avgProcurementCycle > 0 && avgProcurementCycle <= 30
                                ? "positive"
                                : "negative",
                        icon: <Clock size={24} />,
                        iconColor:
                            avgProcurementCycle > 0 && avgProcurementCycle <= 30
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Cost Savings",
                        value: `$${(costSavings / 1000000).toFixed(1)}M`,
                        change: `${savingsPercentage}% savings achieved`,
                        changeType: costSavings >= 0 ? "positive" : "negative",
                        icon: <DollarSign size={24} />,
                        iconColor: costSavings >= 0 ? "success" : "warning",
                    },
                ];
            }

            case "ENG":
            case "SITE": {
                // Calculate engineering/site-specific metrics from real data
                const engineeringProjects = projects.filter(
                    (p) =>
                        p.status === "execution" ||
                        p.status === "active" ||
                        p.status === "planning"
                );
                const assignedTasks = userTasks.filter(
                    (task) => task.status !== "completed"
                );
                const completedTasks = userTasks.filter(
                    (task) => task.status === "completed"
                );
                const avgProgress =
                    assignedTasks.length > 0
                        ? (
                              assignedTasks.reduce(
                                  (sum, task) =>
                                      sum + (task.progress_percentage || 0),
                                  0
                              ) / assignedTasks.length
                          ).toFixed(1)
                        : "0";
                const totalBudgetUsed = engineeringProjects.reduce(
                    (sum, p) => sum + (p.actual_cost || 0),
                    0
                );

                return [
                    {
                        label:
                            role === "SITE"
                                ? "Site Projects"
                                : "Engineering Projects",
                        value: engineeringProjects.length.toString(),
                        change: `${activeProjects} active, ${completedProjects} completed`,
                        changeType: "positive",
                        icon: <LayoutDashboard size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Assigned Tasks",
                        value: assignedTasks.length.toString(),
                        change: `${completedTasks.length} completed`,
                        changeType: "positive",
                        icon: <CheckCircle size={24} />,
                        iconColor: "success",
                    },
                    {
                        label: "Avg Task Progress",
                        value: `${avgProgress}%`,
                        change: "Task completion rate",
                        changeType:
                            parseFloat(avgProgress) >= 75
                                ? "positive"
                                : "negative",
                        icon: <Target size={24} />,
                        iconColor:
                            parseFloat(avgProgress) >= 75
                                ? "success"
                                : "warning",
                    },
                    {
                        label:
                            role === "SITE"
                                ? "Site Budget"
                                : "Engineering Budget",
                        value: `$${(totalBudgetUsed / 1000000).toFixed(1)}M`,
                        change: "Total project costs",
                        changeType: "positive",
                        icon: <DollarSign size={24} />,
                        iconColor: "primary",
                    },
                ];
            }

            case "QAQC": {
                // Calculate QAQC-specific metrics from real data
                const qaqcProjects = projects.filter(
                    (p) =>
                        p.status === "execution" ||
                        p.status === "active" ||
                        p.status === "completed"
                );
                const qaqcTasks = userTasks.filter(
                    (task) => task.status !== "completed"
                );
                const completedQualityTasks = userTasks.filter(
                    (task) => task.status === "completed"
                );
                // Calculate quality score based on project progress and status
                const avgQualityScore =
                    qaqcProjects.length > 0
                        ? (
                              qaqcProjects.reduce((sum, p) => {
                                  // Calculate quality score based on real metrics
                                  let score = 0;
                                  if (
                                      p.status === "completed" &&
                                      p.progress_percentage === 100
                                  ) {
                                      score = 90; // High quality for completed projects
                                  } else if (
                                      p.status === "execution" &&
                                      p.progress_percentage >= 75
                                  ) {
                                      score = 80; // Good quality for well-progressed projects
                                  } else if (
                                      p.status === "active" &&
                                      p.progress_percentage >= 50
                                  ) {
                                      score = 70; // Average quality for progressing projects
                                  } else {
                                      score = 60; // Lower quality for behind-schedule projects
                                  }
                                  return sum + score;
                              }, 0) / qaqcProjects.length
                          ).toFixed(1)
                        : "0";
                const pendingInspections = qaqcTasks.filter(
                    (task) =>
                        task.name?.toLowerCase().includes("inspect") ||
                        task.name?.toLowerCase().includes("quality") ||
                        task.name?.toLowerCase().includes("review")
                ).length;

                return [
                    {
                        label: "Quality Projects",
                        value: qaqcProjects.length.toString(),
                        change: `${activeProjects} active, ${completedProjects} completed`,
                        changeType: "positive",
                        icon: <LayoutDashboard size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Quality Tasks",
                        value: qaqcTasks.length.toString(),
                        change: `${completedQualityTasks.length} completed`,
                        changeType: "positive",
                        icon: <CheckCircle size={24} />,
                        iconColor: "success",
                    },
                    {
                        label: "Avg Quality Score",
                        value:
                            qaqcProjects.length > 0
                                ? `${avgQualityScore}%`
                                : "N/A",
                        change:
                            qaqcProjects.length > 0
                                ? "Project quality rating"
                                : "No projects",
                        changeType:
                            qaqcProjects.length > 0 &&
                            parseFloat(avgQualityScore) >= 80
                                ? "positive"
                                : qaqcProjects.length > 0 &&
                                  parseFloat(avgQualityScore) >= 70
                                ? "positive"
                                : "negative",
                        icon: <Shield size={24} />,
                        iconColor:
                            qaqcProjects.length > 0 &&
                            parseFloat(avgQualityScore) >= 80
                                ? "success"
                                : qaqcProjects.length > 0 &&
                                  parseFloat(avgQualityScore) >= 70
                                ? "warning"
                                : "warning",
                    },
                    {
                        label: "Pending Inspections",
                        value: pendingInspections.toString(),
                        change: "Quality inspections due",
                        changeType:
                            pendingInspections === 0 ? "positive" : "negative",
                        icon: <FileCheck size={24} />,
                        iconColor:
                            pendingInspections === 0 ? "success" : "warning",
                    },
                ];
            }

            case "HR": {
                // Calculate HR-specific resource metrics from simulated data
                const mockResourceData = [
                    {
                        id: 1,
                        name: "John Doe",
                        status: "active",
                        role: "Developer",
                    },
                    {
                        id: 2,
                        name: "Jane Smith",
                        status: "on_leave",
                        role: "Designer",
                    },
                    {
                        id: 3,
                        name: "Mike Johnson",
                        status: "available",
                        role: "Project Manager",
                    },
                    {
                        id: 4,
                        name: "Sarah Brown",
                        status: "assigned",
                        role: "QA Engineer",
                    },
                    {
                        id: 5,
                        name: "David Lee",
                        status: "unavailable",
                        role: "Backend Developer",
                    },
                    {
                        id: 6,
                        name: "Lisa Wang",
                        status: "active",
                        role: "Frontend Developer",
                    },
                    {
                        id: 7,
                        name: "Tom Wilson",
                        status: "assigned",
                        role: "DevOps Engineer",
                    },
                    {
                        id: 8,
                        name: "Emma Davis",
                        status: "available",
                        role: "Business Analyst",
                    },
                ];

                const totalHRResources = mockResourceData.length;
                const activeHRResources = mockResourceData.filter(
                    (r) => r.status === "active" || r.status === "assigned"
                ).length;
                const availableHRResources = mockResourceData.filter(
                    (r) => r.status === "available"
                ).length;
                const onLeaveHRResources = mockResourceData.filter(
                    (r) => r.status === "on_leave" || r.status === "unavailable"
                ).length;

                // Calculate resource utilization rate
                const hrUtilizationRate =
                    totalHRResources > 0
                        ? (activeHRResources / totalHRResources) * 100
                        : 0;

                // Calculate team distribution by project involvement
                const hrTeamDistribution = projects.reduce((count, project) => {
                    return count + (project.team_members?.length || 1);
                }, 0);

                return [
                    {
                        label: "Total Resources",
                        value: totalHRResources.toString(),
                        change: `${activeHRResources} currently active`,
                        changeType: "positive",
                        icon: <Users size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "Resource Utilization",
                        value: `${hrUtilizationRate.toFixed(1)}%`,
                        change:
                            hrUtilizationRate >= 70
                                ? "Optimal utilization"
                                : "Under-utilized",
                        changeType:
                            hrUtilizationRate >= 70 && hrUtilizationRate <= 90
                                ? "positive"
                                : "negative",
                        icon: <Activity size={24} />,
                        iconColor:
                            hrUtilizationRate >= 70 && hrUtilizationRate <= 90
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Available Resources",
                        value: availableHRResources.toString(),
                        change: `${onLeaveHRResources} on leave`,
                        changeType:
                            availableHRResources > 0 ? "positive" : "negative",
                        icon: <CheckCircle size={24} />,
                        iconColor:
                            availableHRResources > 0 ? "success" : "warning",
                    },
                    {
                        label: "Team Distribution",
                        value: hrTeamDistribution.toString(),
                        change: `Across ${projects.length} projects`,
                        changeType: "positive",
                        icon: <Target size={24} />,
                        iconColor: "primary",
                    },
                ];
            }

            case "LEGAL": {
                // Calculate LEGAL-specific metrics from real procurement and contract data
                const legalActiveContracts = procurements.reduce(
                    (count, p) => count + (p.contracts?.length || 0),
                    0
                );
                const legalPendingContracts = procurements.filter(
                    (p) => p.status === "pending" || p.status === "under_review"
                ).length;
                const legalCompletedRFQs = rfqResponses.filter(
                    (r) => r && r.status === "Awarded"
                ).length;
                const legalPendingRFQs = rfqResponses.filter(
                    (r) =>
                        r && r.status !== "Awarded" && r.status !== "Rejected"
                ).length;

                // Calculate contract compliance rate
                const legalTotalContracts = procurements.reduce(
                    (sum, p) => sum + (p.contracts?.length || 0),
                    0
                );
                const legalActiveContractsCount = procurements.filter((p) =>
                    p.contracts?.some((c) => c.status === "active")
                ).length;
                const legalComplianceRate =
                    legalTotalContracts > 0
                        ? (
                              (legalActiveContractsCount /
                                  legalTotalContracts) *
                              100
                          ).toFixed(1)
                        : "0";

                // Calculate average contract value
                const legalTotalContractValue = procurements.reduce(
                    (sum, p) => sum + (p.estimated_cost || 0),
                    0
                );
                const legalAvgContractValue =
                    legalTotalContracts > 0
                        ? legalTotalContractValue / legalTotalContracts
                        : 0;

                return [
                    {
                        label: "Active Contracts",
                        value: legalActiveContracts.toString(),
                        change: `${legalPendingContracts} pending review`,
                        changeType: "positive",
                        icon: <FileCheck size={24} />,
                        iconColor: "primary",
                    },
                    {
                        label: "RFQ Evaluations",
                        value: legalPendingRFQs.toString(),
                        change: `${legalCompletedRFQs} completed`,
                        changeType:
                            legalPendingRFQs === 0 ? "positive" : "negative",
                        icon: <AlertTriangle size={24} />,
                        iconColor:
                            legalPendingRFQs === 0 ? "success" : "warning",
                    },
                    {
                        label: "Contract Compliance",
                        value:
                            legalTotalContracts > 0
                                ? `${legalComplianceRate}%`
                                : "N/A",
                        change:
                            legalTotalContracts > 0
                                ? "Compliance rate"
                                : "No contracts",
                        changeType:
                            legalTotalContracts > 0 &&
                            parseFloat(legalComplianceRate) >= 90
                                ? "positive"
                                : "negative",
                        icon: <Shield size={24} />,
                        iconColor:
                            legalTotalContracts > 0 &&
                            parseFloat(legalComplianceRate) >= 90
                                ? "success"
                                : "warning",
                    },
                    {
                        label: "Avg Contract Value",
                        value:
                            legalTotalContracts > 0
                                ? `$${(legalAvgContractValue / 1000000).toFixed(
                                      1
                                  )}M`
                                : "N/A",
                        change:
                            legalTotalContracts > 0
                                ? "Per contract"
                                : "No data",
                        changeType: "positive",
                        icon: <DollarSign size={24} />,
                        iconColor: "primary",
                    },
                ];
            }

            default:
                return [];
        }
    };

    const getRoleSpecificProjects = (role: string): Project[] => {
        if (loading || error) return [];

        switch (role) {
            case "project-manager":
                // Show only projects managed by current user (simulate by showing active projects)
                return projects.filter(
                    (project) => project.status === "active"
                );
            case "technical":
                // Show projects where user has technical involvement (simulate first 2 projects)
                return projects.slice(0, 2);
            case "pmo":
            case "executive":
                // Show high-priority/strategic projects (active projects)
                return projects.filter(
                    (project) => project.status === "active"
                );
            case "FIN":
                // Show all projects for financial oversight
                return projects;
            case "PROC":
                // Show projects with active procurement activities (contracts, RFQs)
                return projects.filter(
                    (project) =>
                        project.status === "active" ||
                        project.status === "execution" ||
                        project.status === "planning"
                );
            case "ENG":
            case "SITE":
                // Show projects where engineer/site has technical involvement (active and execution projects)
                return projects.filter(
                    (project) =>
                        project.status === "active" ||
                        project.status === "execution" ||
                        project.status === "planning"
                );
            case "QAQC":
                // Show projects needing quality control (active, execution, and recently completed)
                return projects.filter(
                    (project) =>
                        project.status === "active" ||
                        project.status === "execution" ||
                        project.status === "completed" ||
                        project.status === "planning"
                );
            case "HR":
                // Show projects where HR needs to manage resources (projects with team members)
                return projects.filter(
                    (project) =>
                        project.status === "active" ||
                        project.status === "execution" ||
                        project.status === "planning"
                );
            case "LEGAL":
                // Show projects with active procurement activities and contracts
                return projects.filter(
                    (project) =>
                        project.status === "active" ||
                        project.status === "execution" ||
                        project.status === "planning" ||
                        project.status === "procurement"
                );
            default:
                return projects;
        }
    };

    const getRoleSpecificActivities = (role: string): Activity[] => {
        // Convert real activity data to the format expected by the UI
        const convertToActivity = (activity: RecentActivity): Activity => {
            // Determine activity type based on action and entity type
            let type: "success" | "warning" | "danger" | "primary" = "primary";
            
            if (activity.action === "create") {
                type = "success";
            } else if (activity.action === "update") {
                type = "primary";
            } else if (activity.action === "delete") {
                type = "danger";
            } else if (activity.action === "assign" || activity.action === "complete") {
                type = "success";
            } else if (activity.action === "reject" || activity.action === "escalate") {
                type = "warning";
            }

            return {
                id: activity.activity_id,
                type,
                title: activity.title,
                description: activity.description || `${activity.action} ${activity.entity_type}`,
                time: new Date(activity.created_at).toLocaleDateString(),
            };
        };

        // Return real activities, or fallback to project-based activities if no recent activities
        if (recentActivities.length > 0) {
            // Filter activities based on role relevance if needed
            let filteredActivities = recentActivities;

            // For some roles, we might want to show only relevant activities
            switch (role) {
                case "PROC":
                    filteredActivities = recentActivities.filter(
                        activity => 
                            activity.entity_type === "rfq" || 
                            activity.entity_type === "procurement" || 
                            activity.entity_type === "contract" ||
                            activity.entity_type === "vendor"
                    );
                    break;
                case "FIN":
                    filteredActivities = recentActivities.filter(
                        activity => 
                            activity.entity_type === "budget" || 
                            activity.entity_type === "project" ||
                            activity.entity_type === "procurement"
                    );
                    break;
                case "HR":
                    filteredActivities = recentActivities.filter(
                        activity => 
                            activity.entity_type === "user" || 
                            activity.entity_type === "team" ||
                            activity.entity_type === "resource" ||
                            activity.action === "assign"
                    );
                    break;
                case "LEGAL":
                    filteredActivities = recentActivities.filter(
                        activity => 
                            activity.entity_type === "contract" || 
                            activity.entity_type === "procurement" ||
                            activity.entity_type === "approval" ||
                            activity.action === "approve" ||
                            activity.action === "reject"
                    );
                    break;
                default:
                    // For other roles, show all activities
                    break;
            }

            // If we have filtered activities, use them; otherwise fall back to all activities
            const activitiesToShow = filteredActivities.length > 0 ? filteredActivities : recentActivities;

            return activitiesToShow.slice(0, 5).map(convertToActivity);
        }

        // Fallback: Generate activities from project data if no recent activities exist
        const recentProjects = projects
            .sort(
                (a, b) =>
                    new Date(b.start_date).getTime() -
                    new Date(a.start_date).getTime()
            )
            .slice(0, 3);

        return recentProjects.map((project) => ({
            id: project.project_id,
            type:
                project.status === "completed"
                    ? "success"
                    : project.status === "active" || project.status === "execution"
                    ? "primary"
                    : "warning",
            title: `Project ${
                project.status === "completed"
                    ? "completed"
                    : project.status === "active"
                    ? "started"
                    : project.status === "execution"
                    ? "in execution"
                    : "updated"
            }`,
            description: project.name,
            time: new Date(project.start_date).toLocaleDateString(),
        }));
    };

    const getTasks = (role: string): Task[] => {
        if (
            role !== "technical" &&
            role !== "project-manager" &&
            role !== "PROC" &&
            role !== "ENG" &&
            role !== "SITE" &&
            role !== "QAQC" &&
            role !== "HR" &&
            role !== "LEGAL"
        )
            return [];

        // Generate real task data for all roles that need tasks
        const realTasks = userTasks
            .filter((task) => task.status !== "completed")
            .slice(0, 10)
            .map((task) => {
                const priorityMap = {
                    0: "low",
                    1: "low",
                    2: "medium",
                    3: "high",
                };
                const statusMap = {
                    todo: "pending",
                    in_progress: "in-progress",
                    completed: "completed",
                    on_hold: "pending",
                };
                return {
                    id: task.task_id,
                    title: task.name,
                    project: task.wbs?.project?.name || "Unknown Project",
                    status: (statusMap[task.status as keyof typeof statusMap] ||
                        "pending") as "pending" | "in-progress" | "completed",
                    priority: (priorityMap[
                        task.priority as keyof typeof priorityMap
                    ] || "medium") as "high" | "medium" | "low",
                    dueDate: new Date(task.end_date).toLocaleDateString(),
                };
            });

        const tasks = {
            technical: realTasks,
            "project-manager": realTasks,
            PROC: [
                // Generate tasks from real RFQ data
                ...rfqResponses
                    .filter(
                        (rfq) =>
                            rfq &&
                            rfq.procurement_id &&
                            rfq.status !== "Awarded" &&
                            rfq.status !== "Rejected"
                    )
                    .slice(0, 5)
                    .map((rfq, index) => {
                        const priority =
                            rfq.procurement?.estimated_cost > 100000
                                ? "high"
                                : rfq.procurement?.estimated_cost > 50000
                                ? "medium"
                                : "low";
                        const status =
                            rfq.status === "Submitted"
                                ? "pending"
                                : rfq.status === "Under Review"
                                ? "in-progress"
                                : "pending";

                        return {
                            id: rfq.rfq_response_id,
                            title: `RFQ #${rfq.procurement_id
                                .toString()
                                .padStart(3, "0")} - ${
                                rfq.status === "Submitted"
                                    ? "Review submission"
                                    : rfq.status === "Under Review"
                                    ? "Technical evaluation"
                                    : rfq.status === "Evaluated"
                                    ? "Award recommendation"
                                    : "Process response"
                            }`,
                            project:
                                rfq.procurement?.project?.name ||
                                "Unknown Project",
                            priority: priority as "high" | "medium" | "low",
                            dueDate: new Date(
                                Date.now() + (index + 1) * 24 * 60 * 60 * 1000
                            ).toLocaleDateString(),
                            status: status as
                                | "pending"
                                | "in-progress"
                                | "completed",
                        };
                    }),
                // No fallback tasks - show empty list if no RFQ data
            ],

            ENG: realTasks,
            SITE: realTasks,
            QAQC: realTasks,
            IT: [
                // Use real user task data for IT support tasks
                ...realTasks.map((task) => ({
                    ...task,
                    title:
                        task.title.includes("IT") ||
                        task.title.toLowerCase().includes("system") ||
                        task.title.toLowerCase().includes("tech")
                            ? task.title
                            : `IT Support: ${task.title}`,
                })),
                // Add system maintenance tasks from project data if user has few tasks
                ...(realTasks.length < 3
                    ? projects
                          .filter(
                              (p) =>
                                  p.status === "active" ||
                                  p.status === "execution"
                          )
                          .slice(0, 5 - realTasks.length)
                          .map((project, index) => ({
                              id: project.project_id + 2000, // Offset to avoid conflicts
                              title: `System Monitoring - ${project.name}`,
                              project: project.name,
                              priority: "medium" as const,
                              dueDate: new Date(
                                  Date.now() + (index + 1) * 24 * 60 * 60 * 1000
                              ).toLocaleDateString(),
                              status: "pending" as const,
                          }))
                    : []),
            ],
            HR: [
                // Use real user task data for HR resource management tasks
                ...realTasks.map((task) => ({
                    ...task,
                    title:
                        task.title.includes("HR") ||
                        task.title.toLowerCase().includes("resource") ||
                        task.title.toLowerCase().includes("team")
                            ? task.title
                            : `Resource Management: ${task.title}`,
                })),
                // Add resource planning tasks from project data if user has few tasks
                ...(realTasks.length < 3
                    ? projects
                          .filter(
                              (p) =>
                                  p.status === "active" ||
                                  p.status === "execution"
                          )
                          .slice(0, 5 - realTasks.length)
                          .map((project, index) => ({
                              id: project.project_id + 4000, // Offset to avoid conflicts
                              title: `Team Planning - ${project.name}`,
                              project: project.name,
                              priority: "medium" as const,
                              dueDate: new Date(
                                  Date.now() + (index + 1) * 24 * 60 * 60 * 1000
                              ).toLocaleDateString(),
                              status: "pending" as const,
                          }))
                    : []),
            ],
            LEGAL: [
                // Generate tasks from real RFQ data for legal review
                ...rfqResponses
                    .filter(
                        (rfq) =>
                            rfq &&
                            rfq.procurement_id &&
                            rfq.status !== "Awarded" &&
                            rfq.status !== "Rejected"
                    )
                    .slice(0, 5)
                    .map((rfq, index) => {
                        const priority =
                            rfq.procurement?.estimated_cost > 100000
                                ? "high"
                                : rfq.procurement?.estimated_cost > 50000
                                ? "medium"
                                : "low";
                        const status =
                            rfq.status === "Submitted"
                                ? "pending"
                                : rfq.status === "Under Review"
                                ? "in-progress"
                                : "pending";

                        return {
                            id: rfq.rfq_response_id + 6000, // Offset to avoid conflicts
                            title:
                                rfq.procurement?.description ||
                                `RFQ #${rfq.procurement_id
                                    .toString()
                                    .padStart(3, "0")} - ${
                                    rfq.procurement?.type || "Contract Review"
                                }`,
                            project:
                                rfq.procurement?.project?.name ||
                                "Unknown Project",
                            priority: priority as "high" | "medium" | "low",
                            dueDate: new Date(
                                rfq.submitted_date
                            ).toLocaleDateString(),
                            status: status as
                                | "pending"
                                | "in-progress"
                                | "completed",
                        };
                    }),
                // Add contract management tasks from procurements if no RFQ data
                ...(rfqResponses.filter(
                    (rfq) =>
                        rfq &&
                        rfq.procurement_id &&
                        rfq.status !== "Awarded" &&
                        rfq.status !== "Rejected"
                ).length === 0
                    ? procurements
                          .filter((p) => p.status !== "completed")
                          .slice(0, 5)
                          .map((procurement, index) => ({
                              id: procurement.procurement_id + 7000, // Offset to avoid conflicts
                              title:
                                  procurement.description ||
                                  `${procurement.type} - Contract Review`,
                              project:
                                  procurement.project?.name ||
                                  "Unknown Project",
                              priority: (procurement.estimated_cost > 100000
                                  ? "high"
                                  : procurement.estimated_cost > 50000
                                  ? "medium"
                                  : "low") as "high" | "medium" | "low",
                              dueDate: new Date(
                                  procurement.created_at
                              ).toLocaleDateString(),
                              status: "pending" as const,
                          }))
                    : []),
            ],
        };

        return tasks[role as keyof typeof tasks] || [];
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
        switch (status) {
            case "on-track":
                return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
            case "at-risk":
                return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
            case "delayed":
                return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
            case "active":
                return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
            case "completed":
                return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
            case "on-hold":
                return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
        }
    };

    const getPriorityBadge = (priority: string) => {
        const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
        switch (priority) {
            case "high":
                return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
            case "medium":
                return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
            case "low":
                return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
            default:
                return baseClasses;
        }
    };

    const getProgressBarColor = (status: string) => {
        switch (status) {
            case "on-track":
            case "active":
                return "bg-green-500";
            case "at-risk":
            case "on-hold":
                return "bg-yellow-500";
            case "delayed":
                return "bg-red-500";
            case "completed":
                return "bg-blue-500";
            default:
                return "bg-gray-500";
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case "success":
                return <CheckCircle size={20} />;
            case "warning":
                return <AlertTriangle size={20} />;
            case "danger":
                return <AlertTriangle size={20} />;
            default:
                return <Plus size={20} />;
        }
    };

    const getRoleDashboardTitle = (role: string) => {
        switch (role) {
            case "ADMIN":
                return "PMO ADMIN DASHBOARD";
            case "project-manager":
                return "PROJECT MANAGER DASHBOARD";
            case "technical":
                return "TECHNICAL TEAM DASHBOARD";
            case "pmo":
                return "PMO DASHBOARD";
            case "executive":
                return "EXECUTIVE DASHBOARD";
            case "FIN":
                return "FINANCE DASHBOARD";
            case "PROC":
                return "PROCUREMENT DASHBOARD";
            case "ENG":
                return "ENGINEERING DASHBOARD";
            case "SITE":
                return "SITE DASHBOARD";
            case "QAQC":
                return "QUALITY ASSURANCE DASHBOARD";
            case "HR":
                return "HUMAN RESOURCES DASHBOARD";
            case "LEGAL":
                return "LEGAL DASHBOARD";
            default:
                return "DASHBOARD";
        }
    };

    const metrics = getRoleSpecificMetrics(activeView);
    const roleProjects = getRoleSpecificProjects(activeView);
    const activities = getRoleSpecificActivities(activeView);
    const tasks = getTasks(activeView);

    return (
        <DashboardLayout
            title={getRoleDashboardTitle(activeView)}
            onViewChange={setActiveView}
            activeView={activeView}
        >
            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg text-gray-600 dark:text-gray-400">
                        Loading projects...
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                        <span className="text-red-800 dark:text-red-200">
                            {error}
                        </span>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {metrics.map((metric, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                                    {metric.value}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {metric.label}
                                </div>
                                <div
                                    className={`text-xs flex items-center space-x-1 ${
                                        metric.changeType === "positive"
                                            ? "text-green-600"
                                            : "text-red-600"
                                    }`}
                                >
                                    {metric.changeType === "positive" ? (
                                        <ArrowUp size={12} />
                                    ) : (
                                        <ArrowDown size={12} />
                                    )}
                                    <span>{metric.change}</span>
                                </div>
                            </div>
                            <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    metric.iconColor === "primary"
                                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                                        : metric.iconColor === "success"
                                        ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                                        : metric.iconColor === "warning"
                                        ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300"
                                        : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
                                }`}
                            >
                                {metric.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions Section */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Quick Actions
                    </h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Analytics & Insights
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    <button
                        onClick={() => router.push('/dynamic-dashboard')}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:shadow-lg transition-all duration-200 group"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-blue-900 dark:text-blue-100">
                                    Dynamic Analytics
                                </div>
                                <div className="text-sm text-blue-600 dark:text-blue-300">
                                    Interactive dashboards
                                </div>
                            </div>
                        </div>
                        <div className="text-blue-600 dark:text-blue-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>
                    
                    <button
                        onClick={() => router.push('/reports')}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:shadow-lg transition-all duration-200 group"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FileCheck className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-green-900 dark:text-green-100">
                                    Custom Reports
                                </div>
                                <div className="text-sm text-green-600 dark:text-green-300">
                                    Generate & export
                                </div>
                            </div>
                        </div>
                        <div className="text-green-600 dark:text-green-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

 {/*                    <button
                        onClick={() => router.push('/analytics')}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:shadow-lg transition-all duration-200 group"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-purple-900 dark:text-purple-100">
                                    Performance
                                </div>
                                <div className="text-sm text-purple-600 dark:text-purple-300">
                                    KPI monitoring
                                </div>
                            </div>
                        </div>
                        <div className="text-purple-600 dark:text-purple-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button> */}
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Projects/Tasks Table */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {activeView === "technical" ||
                                activeView === "project-manager" ||
                                activeView === "PROC" ||
                                activeView === "ENG" ||
                                activeView === "SITE" ||
                                activeView === "QAQC" ||
                                activeView === "LEGAL"
                                    ? activeView === "technical"
                                        ? "MY TASKS"
                                        : activeView === "project-manager"
                                        ? "PENDING APPROVALS"
                                        : activeView === "PROC"
                                        ? "PROCUREMENT ACTIVITIES"
                                        : activeView === "ENG"
                                        ? "ENGINEERING TASKS"
                                        : activeView === "SITE"
                                        ? "SITE TASKS"
                                        : activeView === "QAQC"
                                        ? "QUALITY CONTROL TASKS"
                                        : activeView === "LEGAL"
                                        ? "CONTRACT & LEGAL TASKS"
                                        : "MY TASKS"
                                    : "PROJECT STATUS"}
                            </h2>
                            {/* <button 
                onClick={() => router.push('/projects/create')}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus size={16} />
                <span>
                  {activeView === 'technical' ? 'New Task' : 
                   activeView === 'project-manager' ? 'New Request' :
                   'New Project'}
                </span>
              </button> */}
                        </div>
                        <div className="overflow-x-auto">
                            {(activeView === "technical" ||
                                activeView === "project-manager" ||
                                activeView === "PROC" ||
                                activeView === "ENG" ||
                                activeView === "SITE" ||
                                activeView === "QAQC" ||
                                activeView === "LEGAL") &&
                            tasks.length > 0 ? (
                                // Tasks Table for Technical/PM roles
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-slate-700">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Task
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Project
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Priority
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Due Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                        {tasks.map((task) => (
                                            <tr key={task.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {task.title}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                    {task.project}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={getPriorityBadge(
                                                            task.priority
                                                        )}
                                                    >
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                    {task.dueDate}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={getStatusBadge(
                                                            task.status
                                                        )}
                                                    >
                                                        {task.status.replace(
                                                            "-",
                                                            " "
                                                        )}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                // Projects Table for other roles
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-slate-700">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Project
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Manager
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Progress
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Due Date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                        {roleProjects.map((project) => (
                                            <tr
                                                key={project.project_id}
                                                onClick={() =>
                                                    router.push(
                                                        `/projects/${project.project_id}`
                                                    )
                                                }
                                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {project.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                    {
                                                        project.creator.account
                                                            .first_name
                                                    }{" "}
                                                    {
                                                        project.creator.account
                                                            .last_name
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={getStatusBadge(
                                                            project.status
                                                        )}
                                                    >
                                                        {project.status.replace(
                                                            "-",
                                                            " "
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-1">
                                                        <div
                                                            className={`h-2 rounded-full ${getProgressBarColor(
                                                                project.status
                                                            )}`}
                                                            style={{
                                                                width: `${project.progress_percentage}%`,
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                                        {
                                                            project.progress_percentage
                                                        }
                                                        %
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                    {new Date(
                                                        project.planned_end_date
                                                    ).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Activities */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {activeView === "executive"
                                ? "STRATEGIC UPDATES"
                                : "RECENT ACTIVITIES"}
                        </h2>
                    </div>
                    <div className="p-6" style={{ maxHeight: 400, overflowY: "auto" }} onScroll={handleActivityScroll}>
                        <div className="space-y-4">
                            {activities.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start space-x-3"
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            activity.type === "primary"
                                                ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                                                : activity.type === "success"
                                                ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                                                : activity.type === "warning"
                                                ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300"
                                                : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
                                        }`}
                                    >
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                            {activity.title}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {activity.description}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                            {activity.time}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!hasMoreActivities && (
                                <div className="text-center text-xs text-gray-400 mt-4">No more activities</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
