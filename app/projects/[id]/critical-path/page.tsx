'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    ArrowLeft,
    Activity,
    Target,
    Clock,
    TrendingUp,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Calendar,
    Users,
    FileText,
    Download,
    ExternalLink,
    BarChart3,
    Zap,
    Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface CriticalPathTask {
    task_id: number;
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    duration: number;
    early_start?: string;
    early_finish?: string;
    late_start?: string;
    late_finish?: string;
    total_float?: number;
    free_float?: number;
    is_critical_path?: boolean;
    progress_percentage: number;
    status: string;
    priority: string;
    assigned_users?: Array<{
        user: {
            username: string;
            email: string;
            account: {
                first_name: string;
                last_name: string;
            };
        };
    }>;
}

interface CriticalPathData {
    success: boolean;
    project_id: number;
    calculation_summary?: {
        total_tasks: number;
        critical_tasks_count: number;
        non_critical_tasks_count: number;
        project_duration: number;
        critical_path_duration: number;
        max_float: number;
        last_calculated: string;
    };
    critical_tasks?: CriticalPathTask[];
    all_tasks?: CriticalPathTask[];
    execution_time_ms?: number;
    timestamp: string;
}

export default function CriticalPathPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [projectId, setProjectId] = useState<string>('');
    const [criticalPathData, setCriticalPathData] = useState<CriticalPathData | null>(null);
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [project, setProject] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'gantt'>('summary');

    useEffect(() => {
        const getParams = async () => {
            const { id } = await params;
            setProjectId(id);
            await fetchProject(id);
            await fetchCriticalPath(id);
        };
        getParams();
    }, [params]);

    const getAuthHeaders = (): Record<string, string> => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                return { Authorization: `Bearer ${token}` };
            }
        }
        return {};
    };

    const fetchProject = async (id: string) => {
        try {
            const response = await fetch(`/api/projects/${id}`, {
                headers: {
                    ...getAuthHeaders(),
                },
            });
            if (response.ok) {
                const data = await response.json();
                setProject(data);
            }
        } catch (error) {
            console.error('Error fetching project:', error);
        }
    };

    const fetchCriticalPath = async (id: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${id}/critical-path`, {
                headers: {
                    ...getAuthHeaders(),
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch critical path data');
            }
            const data = await response.json();
            setCriticalPathData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            toast.error('Failed to fetch critical path data');
        } finally {
            setLoading(false);
        }
    };

    const calculateCriticalPath = async () => {
        setCalculating(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/critical-path`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                },
            });
            if (!response.ok) {
                throw new Error('Failed to calculate critical path');
            }
            const data = await response.json();
            setCriticalPathData(data);
            toast.success('Critical path calculated successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to calculate critical path');
            toast.error('Failed to calculate critical path');
        } finally {
            setCalculating(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getFloatBadgeColor = (float: number) => {
        if (float === 0) return 'destructive';
        if (float <= 5) return 'secondary';
        return 'outline';
    };

    const getStatusBadge = (status: string) => {
        const statusColors: { [key: string]: string } = {
            todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
            'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
            completed: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
            blocked: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
        };
        return statusColors[status] || statusColors.todo;
    };

    const getPriorityBadge = (priority: string) => {
        const priorityColors: { [key: string]: string } = {
            low: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
            high: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
        };
        return priorityColors[priority] || priorityColors.medium;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    <span>Loading critical path analysis...</span>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex items-center space-x-2"
                        >
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                Critical Path Analysis
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                {project?.name || 'Project'} - Detailed critical path analysis
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button
                            onClick={calculateCriticalPath}
                            disabled={calculating}
                            className="flex items-center space-x-2"
                        >
                            {calculating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            <span>{calculating ? 'Calculating...' : 'Recalculate'}</span>
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert className="mb-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Summary Cards */}
                {criticalPathData?.calculation_summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Critical Tasks</CardTitle>
                                <Activity className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {criticalPathData.calculation_summary.critical_tasks_count}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    of {criticalPathData.calculation_summary.total_tasks} total tasks
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Project Duration</CardTitle>
                                <Clock className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">
                                    {criticalPathData.calculation_summary.critical_path_duration} days
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Critical path length
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Max Float</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {criticalPathData.calculation_summary.max_float} days
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Maximum slack time
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Last Calculated</CardTitle>
                                <BarChart3 className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-600">
                                    {criticalPathData.execution_time_ms}ms
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Calculation time
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs - moved below the cards */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'summary' | 'gantt')} className="mb-8">
                    <TabsList>
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="summary">

                        {/* Critical Path Tasks */}
                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Zap className="h-5 w-5 text-red-500" />
                                    <span>Critical Path Tasks</span>
                                    <Badge variant="destructive">
                                        {criticalPathData?.critical_tasks?.length || 0} tasks
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {criticalPathData?.critical_tasks && criticalPathData.critical_tasks.length > 0 ? (
                                    <div className="space-y-4">
                                        {criticalPathData.critical_tasks.map((task, index) => (
                                            <div 
                                                key={task.task_id} 
                                                className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                onClick={() => router.push(`/projects/${projectId}/tasks/${task.task_id}`)}
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{task.name}</h4>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <Badge className={getStatusBadge(task.status)}>
                                                                {task.status}
                                                            </Badge>
                                                            <Badge className={getPriorityBadge(task.priority)}>
                                                                {task.priority}
                                                            </Badge>
                                                            <Badge variant="destructive">
                                                                Critical
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        <div>Duration: {task.duration} days</div>
                                                        <div>Float: {task.total_float || 0} days</div>
                                                        <div>
                                                            {task.early_start && task.early_finish && (
                                                                <span>
                                                                    {formatDate(task.early_start)} - {formatDate(task.early_finish)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500">No critical path data available</p>
                                        <Button onClick={calculateCriticalPath} className="mt-4">
                                            Calculate Critical Path
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* All Tasks with Float Analysis */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Target className="h-5 w-5 text-blue-500" />
                                    <span>All Tasks Float Analysis</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {criticalPathData?.all_tasks && criticalPathData.all_tasks.length > 0 ? (
                                    <div className="space-y-3">
                                        {criticalPathData.all_tasks.map((task) => (
                                            <div 
                                                key={task.task_id} 
                                                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                                                    task.is_critical_path 
                                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30' 
                                                        : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900/30'
                                                }`}
                                                onClick={() => router.push(`/projects/${projectId}/tasks/${task.task_id}`)}
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                        task.is_critical_path 
                                                            ? 'bg-red-500 text-white' 
                                                            : 'bg-gray-500 text-white'
                                                    }`}>
                                                        {task.is_critical_path ? 'C' : 'N'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{task.name}</h4>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <Badge className={getStatusBadge(task.status)}>
                                                                {task.status}
                                                            </Badge>
                                                            <Badge variant={getFloatBadgeColor(task.total_float || 0)}>
                                                                {task.total_float || 0} days float
                                                            </Badge>
                                                            {task.is_critical_path && (
                                                                <Badge variant="destructive">
                                                                    Critical
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                                                    <div>Duration: {task.duration} days</div>
                                                    <div>
                                                        {task.early_start && task.early_finish && (
                                                            <span>
                                                                {formatDate(task.early_start)} - {formatDate(task.early_finish)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500">No tasks available</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="gantt">
                        {/* Gantt Chart for critical path tasks */}
                        <CriticalPathGanttChart
                            tasks={criticalPathData?.critical_tasks || []}
                            project={project}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}

// Add a new component for the Gantt chart view
interface GanttChartTask {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    duration: number;
    progress: number;
    status: string;
    isCritical: boolean;
}

function CriticalPathGanttChart({ tasks, project }: { tasks: any[]; project: any }) {
    const [timelineView, setTimelineView] = useState<'days' | 'months' | 'quarters'>('days');
    
    // Transform critical path tasks to GanttChartTask[]
    const ganttTasks: GanttChartTask[] = (tasks || []).map((task) => ({
        id: String(task.task_id),
        name: task.name,
        startDate: new Date(task.early_start || task.start_date),
        endDate: new Date(task.early_finish || task.end_date),
        duration: task.duration,
        progress: task.progress_percentage || 0,
        status: task.status,
        isCritical: true,
    }));
    
    if (ganttTasks.length === 0) {
        return (
            <Card>
                <CardContent className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No critical path tasks to display</p>
                </CardContent>
            </Card>
        );
    }

    // Calculate timeline columns based on view
    const minStart = ganttTasks.reduce((min, t) => t.startDate < min ? t.startDate : min, ganttTasks[0]?.startDate || new Date());
    const maxEnd = ganttTasks.reduce((max, t) => t.endDate > max ? t.endDate : max, ganttTasks[0]?.endDate || new Date());
    
    let timeline: Date[] = [];
    let timeUnit = '';
    let columnWidth = '';
    
    if (timelineView === 'days') {
        const days = Math.ceil((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        timeline = Array.from({ length: days }, (_, i) => new Date(minStart.getTime() + i * 24 * 60 * 60 * 1000));
        timeUnit = 'day';
        columnWidth = 'w-16';
    } else if (timelineView === 'months') {
        const startMonth = new Date(minStart.getFullYear(), minStart.getMonth(), 1);
        const endMonth = new Date(maxEnd.getFullYear(), maxEnd.getMonth(), 1);
        const months = Math.ceil((endMonth.getTime() - startMonth.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1;
        timeline = Array.from({ length: months }, (_, i) => {
            const date = new Date(startMonth);
            date.setMonth(date.getMonth() + i);
            return date;
        });
        timeUnit = 'month';
        columnWidth = 'w-24';
    } else if (timelineView === 'quarters') {
        const startQuarter = Math.floor(minStart.getMonth() / 3);
        const endQuarter = Math.floor(maxEnd.getMonth() / 3);
        const yearDiff = maxEnd.getFullYear() - minStart.getFullYear();
        const quarters = (yearDiff * 4) + (endQuarter - startQuarter) + 1;
        timeline = Array.from({ length: quarters }, (_, i) => {
            const quarterIndex = startQuarter + i;
            const year = minStart.getFullYear() + Math.floor(quarterIndex / 4);
            const quarter = quarterIndex % 4;
            return new Date(year, quarter * 3, 1);
        });
        timeUnit = 'quarter';
        columnWidth = 'w-32';
    }

    const formatTimelineHeader = (date: Date) => {
        if (timelineView === 'days') {
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } else if (timelineView === 'months') {
            return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        } else if (timelineView === 'quarters') {
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            return `Q${quarter} ${date.getFullYear()}`;
        }
        return '';
    };

    const getTaskPosition = (task: GanttChartTask) => {
        if (timelineView === 'days') {
            const startIdx = Math.max(0, Math.floor((task.startDate.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24)));
            const endIdx = Math.max(0, Math.floor((task.endDate.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24)));
            return { startIdx, endIdx, width: endIdx - startIdx + 1 };
        } else if (timelineView === 'months') {
            const startMonth = (task.startDate.getFullYear() - minStart.getFullYear()) * 12 + task.startDate.getMonth() - minStart.getMonth();
            const endMonth = (task.endDate.getFullYear() - minStart.getFullYear()) * 12 + task.endDate.getMonth() - minStart.getMonth();
            return { startIdx: Math.max(0, startMonth), endIdx: Math.max(0, endMonth), width: endMonth - startMonth + 1 };
        } else if (timelineView === 'quarters') {
            const startQuarter = (task.startDate.getFullYear() - minStart.getFullYear()) * 4 + Math.floor(task.startDate.getMonth() / 3);
            const endQuarter = (task.endDate.getFullYear() - minStart.getFullYear()) * 4 + Math.floor(task.endDate.getMonth() / 3);
            return { startIdx: Math.max(0, startQuarter), endIdx: Math.max(0, endQuarter), width: endQuarter - startQuarter + 1 };
        }
        return { startIdx: 0, endIdx: 0, width: 1 };
    };
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <span>Critical Path Gantt Chart</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Timeline View:</span>
                        <div className="flex rounded-md border border-gray-200 dark:border-gray-700">
                            <Button
                                variant={timelineView === 'days' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setTimelineView('days')}
                                className="rounded-r-none"
                            >
                                Days
                            </Button>
                            <Button
                                variant={timelineView === 'months' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setTimelineView('months')}
                                className="rounded-none border-x"
                            >
                                Months
                            </Button>
                            <Button
                                variant={timelineView === 'quarters' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setTimelineView('quarters')}
                                className="rounded-l-none"
                            >
                                Quarters
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="min-w-max">
                        {/* Timeline Header */}
                        <div className="flex border-b bg-gray-50 dark:bg-gray-700">
                            <div className="w-64 px-4 py-2 border-r font-semibold">Task</div>
                            {timeline.map((date, idx) => (
                                <div key={idx} className={`${columnWidth} px-1 py-2 text-xs text-center border-r`}>
                                    {formatTimelineHeader(date)}
                                </div>
                            ))}
                        </div>
                        {/* Tasks Rows */}
                        {ganttTasks.map((task) => {
                            const { startIdx, endIdx, width } = getTaskPosition(task);
                            return (
                                <div key={task.id} className="flex border-b items-center hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div className="w-64 px-4 py-2 border-r text-sm font-medium">
                                        <div className="truncate" title={task.name}>{task.name}</div>
                                        <div className="text-xs text-gray-500">{task.duration} days</div>
                                    </div>
                                    {timeline.map((_, i) => {
                                        if (i < startIdx || i > endIdx) {
                                            return <div key={i} className={`${columnWidth} h-12 border-r`} />;
                                        }
                                        if (i === startIdx) {
                                            const barWidth = timelineView === 'days' ? `${width * 4}rem` : 
                                                            timelineView === 'months' ? `${width * 6}rem` : 
                                                            `${width * 8}rem`;
                                            return (
                                                <div
                                                    key={i}
                                                    className="h-12 border-r flex items-center justify-center relative"
                                                    style={{ width: barWidth }}
                                                >
                                                    <div
                                                        className="h-6 rounded-md bg-gradient-to-r from-red-500 to-orange-400 text-white text-xs font-semibold flex items-center justify-center shadow-sm"
                                                        style={{ width: 'calc(100% - 8px)' }}
                                                        title={`${task.name} (${task.duration} days)`}
                                                    >
                                                        {timelineView === 'days' && width > 2 ? `${task.duration}d` : ''}
                                                        {timelineView !== 'days' ? task.name.substring(0, 10) + (task.name.length > 10 ? '...' : '') : ''}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 