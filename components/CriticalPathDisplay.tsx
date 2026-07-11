'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface CriticalPathTask {
  task_id: number;
  name: string;
  start_date: string;
  end_date: string;
  duration: number;
  early_start: string;
  early_finish: string;
  late_start: string;
  late_finish: string;
  total_float: number;
  free_float: number;
  is_critical_path: boolean;
  wbs?: {
    name: string;
    project: {
      name: string;
    };
  };
  assigned_users?: Array<{
    user: {
      username: string;
      email: string;
    };
  }>;
}

interface CriticalPathData {
  project_id: number;
  critical_tasks: CriticalPathTask[];
  total_critical_tasks: number;
}

interface CriticalPathDisplayProps {
  projectId: number;
}

export default function CriticalPathDisplay({ projectId }: CriticalPathDisplayProps) {
  const [criticalPath, setCriticalPath] = useState<CriticalPathData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const fetchCriticalPath = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/critical-path`);
      if (!response.ok) {
        throw new Error('Failed to fetch critical path');
      }
      const data = await response.json();
      setCriticalPath(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const recalculateCriticalPath = async () => {
    setCalculating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/critical-path`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to recalculate critical path');
      }
      const result = await response.json();
      
      // Refresh the display
      await fetchCriticalPath();
      
      // Show success message
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recalculate');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    fetchCriticalPath();
  }, [projectId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFloatBadgeColor = (float: number) => {
    if (float === 0) return 'destructive';
    if (float <= 5) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading critical path...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchCriticalPath} className="mt-4" variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Critical Path Analysis
          </CardTitle>
          <Button
            onClick={recalculateCriticalPath}
            disabled={calculating}
            variant="outline"
          >
            {calculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Recalculating...
              </>
            ) : (
              'Recalculate'
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {criticalPath ? (
            <>
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {criticalPath.total_critical_tasks}
                    </div>
                    <div className="text-sm text-gray-600">Critical Tasks</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {criticalPath.critical_tasks.reduce((sum, task) => sum + task.duration, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Days (Critical Path)</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {criticalPath.critical_tasks.filter(task => task.total_float === 0).length}
                    </div>
                    <div className="text-sm text-gray-600">Zero Float Tasks</div>
                  </div>
                </div>
              </div>

              {criticalPath.total_critical_tasks > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Critical Path Tasks</h3>
                  {criticalPath.critical_tasks.map((task, index) => (
                    <Card key={task.task_id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{task.name}</h4>
                            <p className="text-sm text-gray-600">
                              Task #{task.task_id}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="destructive">
                              Critical
                            </Badge>
                            <Badge variant={getFloatBadgeColor(task.total_float)}>
                              {task.total_float} days float
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-500">Duration:</span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {task.duration} days
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Planned:</span>
                            <div>{formatDate(task.start_date)} - {formatDate(task.end_date)}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Early:</span>
                            <div>{formatDate(task.early_start)} - {formatDate(task.early_finish)}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Late:</span>
                            <div>{formatDate(task.late_start)} - {formatDate(task.late_finish)}</div>
                          </div>
                        </div>

                        {task.assigned_users && task.assigned_users.length > 0 && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-500 text-sm">Assigned to:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {task.assigned_users.map((assignment, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {assignment.user.username}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No critical path tasks found. All tasks have schedule flexibility.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No critical path data available</p>
              <Button onClick={fetchCriticalPath} className="mt-4" variant="outline">
                Load Critical Path
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
