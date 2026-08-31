import React, { useState, useEffect } from 'react';
import { X, Link, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from '@/lib/axios';
import { Spinner } from "@/components/ui/spinner";

interface ScheduleTaskDependencyModalProps {
  scheduleId: number;
  task: any;
  allTasks: any[];
  onClose: () => void;
  onSave: () => void;
}

interface Dependency {
  dependency_id: number;
  predecessor_task_id: number;
  successor_task_id: number;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_time: number;
  predecessor: any;
  successor: any;
}

const ScheduleTaskDependencyModal: React.FC<ScheduleTaskDependencyModalProps> = ({
  scheduleId,
  task,
  allTasks,
  onClose,
  onSave
}) => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPredecessor, setSelectedPredecessor] = useState<string>('');
  const [dependencyType, setDependencyType] = useState<'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'>('finish_to_start');
  const [lagTime, setLagTime] = useState<number>(0);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchDependencies();
    fetchTasks();
  }, []);

  // Update available tasks when dependencies change
  useEffect(() => {
    if (allTasks.length > 0) {
      const filteredTasks = allTasks.filter((t: any) => 
        t.task_id !== task.task_id && 
        !dependencies.some(dep => dep.predecessor_task_id === t.task_id)
      );
      setAvailableTasks(filteredTasks);
    }
  }, [dependencies, allTasks, task.task_id]);

  // Fallback: if availableTasks is empty but allTasks has data, use allTasks
  useEffect(() => {
    if (availableTasks.length === 0 && allTasks.length > 0) {
      const filteredTasks = allTasks.filter((t: any) => 
        t.task_id !== task.task_id && 
        !dependencies.some(dep => dep.predecessor_task_id === t.task_id)
      );
      setAvailableTasks(filteredTasks);
    }
  }, [availableTasks.length, allTasks, task.task_id, dependencies]);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/schedules/${scheduleId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        // Filter out the current task and tasks that are already dependencies
        const filteredTasks = response.data.filter((t: any) => 
          t.task_id !== task.task_id && 
          !dependencies.some(dep => dep.predecessor_task_id === t.task_id)
        );
        setAvailableTasks(filteredTasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    }
  };

  const fetchDependencies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/schedules/${scheduleId}/tasks/${task.task_id}/dependencies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDependencies(response.data);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
      toast.error('Failed to load dependencies');
    } finally {
      setLoading(false);
    }
  };

  const addDependency = async () => {
    if (!selectedPredecessor || selectedPredecessor === "no-tasks") {
      toast.error('Please select a predecessor task');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/schedules/${scheduleId}/tasks/${task.task_id}/dependencies`, {
        predecessor_task_id: parseInt(selectedPredecessor),
        dependency_type: dependencyType,
        lag_time: lagTime
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Dependency added successfully');
      setSelectedPredecessor('');
      setDependencyType('finish_to_start');
      setLagTime(0);
      await fetchDependencies();
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add dependency');
    } finally {
      setSaving(false);
    }
  };

  const removeDependency = async (dependencyId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/schedules/${scheduleId}/tasks/${task.task_id}/dependencies/${dependencyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Dependency removed successfully');
      await fetchDependencies();
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove dependency');
    }
  };

  const getDependencyTypeLabel = (type: string) => {
    const labels = {
      'finish_to_start': 'Finish to Start',
      'start_to_start': 'Start to Start',
      'finish_to_finish': 'Finish to Finish',
      'start_to_finish': 'Start to Finish'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getDependencyTypeColor = (type: string) => {
    const colors = {
      'finish_to_start': 'bg-info-soft text-info',
      'start_to_start': 'bg-success-soft text-success',
      'finish_to_finish': 'bg-accent-violet-soft text-accent-violet',
      'start_to_finish': 'bg-bright-soft text-bright'
    };
    return colors[type as keyof typeof colors] || 'bg-surface-2 text-ink-2';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-ink">
                Task Dependencies
              </h3>
              <p className="text-muted">
                Manage dependencies for "{task.name}"
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size={32} className="text-bright-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Dependencies */}
              <div>
                <h4 className="text-lg font-semibold text-ink mb-4">
                  Current Dependencies
                </h4>
                {dependencies.length === 0 ? (
                  <div className="text-center py-8 text-muted">
                    <Link size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No dependencies configured for this task</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dependencies.map((dependency) => (
                      <div
                        key={dependency.dependency_id}
                        className="flex items-center justify-between p-4 bg-surface-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-bright rounded-full"></div>
                            <span className="font-medium text-ink">
                              {dependency.predecessor.name}
                            </span>
                          </div>
                          <span className="text-faint">→</span>
                          <span className="font-medium text-ink">
                            {dependency.successor.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getDependencyTypeColor(dependency.dependency_type)}>
                            {getDependencyTypeLabel(dependency.dependency_type)}
                          </Badge>
                          {dependency.lag_time > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{dependency.lag_time} days
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeDependency(dependency.dependency_id)}
                            className="text-danger hover:text-danger hover:bg-danger-soft"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Dependency */}
              <div className="border-t border-line pt-6">
                <h4 className="text-lg font-semibold text-ink mb-4">
                  Add New Dependency
                </h4>
                {availableTasks.length === 0 && (
                  <div className="mb-4 p-3 bg-warning-soft border border-warning rounded-lg">
                    <p className="text-sm text-warning">
                      {allTasks.length === 0 
                        ? "No tasks found in this schedule. Please create some tasks first before adding dependencies."
                        : "No available tasks to create dependencies with. All tasks may already have dependencies or this is the only task."
                      }
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="predecessor">Predecessor Task</Label>
                    <Select value={selectedPredecessor} onValueChange={setSelectedPredecessor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTasks.length === 0 ? (
                          <SelectItem value="no-tasks" disabled>
                            No tasks available
                          </SelectItem>
                        ) : (
                          availableTasks.map((t) => (
                            <SelectItem key={t.task_id} value={t.task_id.toString()}>
                              {t.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dependencyType">Dependency Type</Label>
                    <Select value={dependencyType} onValueChange={(value: any) => setDependencyType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="finish_to_start">Finish to Start</SelectItem>
                        <SelectItem value="start_to_start">Start to Start</SelectItem>
                        <SelectItem value="finish_to_finish">Finish to Finish</SelectItem>
                        <SelectItem value="start_to_finish">Start to Finish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="lagTime">Lag Time (days)</Label>
                    <Input
                      id="lagTime"
                      type="number"
                      min="0"
                      value={lagTime}
                      onChange={(e) => setLagTime(parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={addDependency}
                      disabled={!selectedPredecessor || selectedPredecessor === "no-tasks" || saving || availableTasks.length === 0}
                      className="w-full"
                    >
                      {saving ? 'Adding...' : 'Add Dependency'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Dependency Type Help */}
              <div className="bg-info-soft border border-info rounded-lg p-4">
                <h5 className="font-semibold text-info mb-2">
                  Dependency Types
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <Badge className="bg-info-soft text-info mr-2">Finish to Start</Badge>
                    <span className="text-info">Most common. Successor starts after predecessor finishes.</span>
                  </div>
                  <div>
                    <Badge className="bg-success-soft text-success mr-2">Start to Start</Badge>
                    <span className="text-success">Both tasks start at the same time.</span>
                  </div>
                  <div>
                    <Badge className="bg-accent-violet-soft text-accent-violet mr-2">Finish to Finish</Badge>
                    <span className="text-accent-violet">Both tasks finish at the same time.</span>
                  </div>
                  <div>
                    <Badge className="bg-bright-soft text-bright mr-2">Start to Finish</Badge>
                    <span className="text-bright">Successor finishes when predecessor starts.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleTaskDependencyModal; 