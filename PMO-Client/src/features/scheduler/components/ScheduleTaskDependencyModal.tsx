import React, { useState, useEffect } from 'react';
import { X, Link, AlertTriangle, CheckCircle } from 'lucide-react';
import { Modal } from "@/components/ui/modal";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/ui/dropdown';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { notConnected } from "@/lib/not-connected";
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
  // notConnected: the task's dependencies would be loaded here. Until then
  // there are none; candidate predecessors come from allTasks.
  const [dependencies] = useState<Dependency[]>([]);
  const loading = false;
  const saving = false;
  const [selectedPredecessor, setSelectedPredecessor] = useState<string>('');
  const [dependencyType, setDependencyType] = useState<'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'>('finish_to_start');
  const [lagTime, setLagTime] = useState<number>(0);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);

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

  const addDependency = () => {
    if (!selectedPredecessor || selectedPredecessor === "no-tasks") {
      toast.error('Please select a predecessor task');
      return;
    }

    notConnected('Adding a dependency');
  };

  const removeDependency = (_dependencyId: number) => notConnected('Removing a dependency');

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
    <Modal
      open
      onClose={onClose}
      title="Task Dependencies"
      description={`Manage dependencies for "${task.name}"`}
      maxWidthClass="max-w-4xl"
    >

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
                            aria-label="Remove dependency"
                            className="text-danger hover:text-danger hover:bg-danger-soft"
                          >
                            <X size={14} aria-hidden="true" />
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
                  <div className="mb-4 p-3 bg-surface border border-line border-l-[3px] border-l-warning rounded-lg">
                    <p className="flex items-start gap-1.5 text-sm text-ink-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
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
                    <Dropdown
                      value={selectedPredecessor}
                      onChange={setSelectedPredecessor}
                      placeholder="Select a task..."
                      searchable
                      options={availableTasks.map((t) => ({ value: t.task_id.toString(), label: t.name }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dependencyType">Dependency Type</Label>
                    <Dropdown
                      value={dependencyType}
                      onChange={(value) => setDependencyType(value as typeof dependencyType)}
                      options={[
                        { value: "finish_to_start", label: "Finish to Start" },
                        { value: "start_to_start", label: "Start to Start" },
                        { value: "finish_to_finish", label: "Finish to Finish" },
                        { value: "start_to_finish", label: "Start to Finish" },
                      ]}
                    />
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
              <div className="bg-surface border border-line border-l-[3px] border-l-info rounded-lg p-4">
                <h5 className="font-semibold text-ink mb-2">
                  Dependency Types
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <Badge className="bg-info-soft text-info mr-2">Finish to Start</Badge>
                    <span className="text-ink-2">Most common. Successor starts after predecessor finishes.</span>
                  </div>
                  <div>
                    <Badge className="bg-success-soft text-success mr-2">Start to Start</Badge>
                    <span className="text-ink-2">Both tasks start at the same time.</span>
                  </div>
                  <div>
                    <Badge className="bg-accent-violet-soft text-accent-violet mr-2">Finish to Finish</Badge>
                    <span className="text-ink-2">Both tasks finish at the same time.</span>
                  </div>
                  <div>
                    <Badge className="bg-bright-soft text-bright mr-2">Start to Finish</Badge>
                    <span className="text-ink-2">Successor finishes when predecessor starts.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
    </Modal>
  );
};

export default ScheduleTaskDependencyModal; 