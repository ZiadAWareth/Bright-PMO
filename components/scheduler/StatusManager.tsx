"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "@/lib/axios";

interface StatusManagerProps {
  scheduleId: number;
  currentStatus: 'DRAFT' | 'IN_PROGRESS' | 'ANALYZING' | 'FEASIBLE' | 'INFEASIBLE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

const statusOptions = [
  { value: 'DRAFT', label: 'Draft', description: 'Initial planning phase' },
  { value: 'IN_PROGRESS', label: 'In Progress', description: 'Active development' },
  { value: 'ANALYZING', label: 'Analyzing', description: 'Running feasibility analysis' },
  { value: 'FEASIBLE', label: 'Feasible', description: 'Analysis completed successfully' },
  { value: 'INFEASIBLE', label: 'Infeasible', description: 'Conflicts detected' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval', description: 'Awaiting stakeholder approval' },
  { value: 'APPROVED', label: 'Approved', description: 'Schedule approved' },
  { value: 'REJECTED', label: 'Rejected', description: 'Schedule rejected' },
  { value: 'CONVERTED', label: 'Converted', description: 'Converted to real project' },
];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-surface-2 text-ink-2';
      case 'IN_PROGRESS': return 'bg-info-soft  text-info ';
      case 'ANALYZING': return 'bg-warning-soft  text-warning ';
      case 'FEASIBLE': return 'bg-success-soft  text-success ';
      case 'INFEASIBLE': return 'bg-danger-soft  text-danger ';
      case 'PENDING_APPROVAL': return 'bg-accent-violet-soft  text-accent-violet ';
      case 'APPROVED': return 'bg-success-soft  text-success ';
      case 'REJECTED': return 'bg-danger-soft  text-danger ';
      case 'CONVERTED': return 'bg-success-soft  text-success ';
      default: return 'bg-surface-2 text-ink-2';
    }
  };

const StatusManager: React.FC<StatusManagerProps> = ({
  scheduleId,
  currentStatus,
  onStatusChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async () => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`/api/schedules/${scheduleId}`, {
        status: newStatus,
        status_change_reason: reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      onStatusChange(newStatus);
      setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to update status:", error);
      const errorMessage = error.response?.data?.message || "Failed to update status";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canChangeToStatus = (targetStatus: string) => {
    // Define allowed status transitions
    const allowedTransitions: Record<string, string[]> = {
      'DRAFT': ['IN_PROGRESS', 'ANALYZING'],
      'IN_PROGRESS': ['ANALYZING', 'DRAFT'],
      'ANALYZING': ['FEASIBLE', 'INFEASIBLE', 'IN_PROGRESS', 'DRAFT'],
      'FEASIBLE': ['PENDING_APPROVAL', 'ANALYZING', 'DRAFT'],
      'INFEASIBLE': ['ANALYZING', 'DRAFT'],
      'PENDING_APPROVAL': ['APPROVED', 'REJECTED', 'FEASIBLE'],
      'APPROVED': ['CONVERTED', 'REJECTED'],
      'REJECTED': ['DRAFT', 'IN_PROGRESS', 'FEASIBLE'],
      'CONVERTED': [] // Final state
    };

    return allowedTransitions[currentStatus]?.includes(targetStatus) || false;
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={getStatusColor(currentStatus)}>
        {currentStatus.replace('_', ' ')}
      </Badge>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            disabled={disabled || currentStatus === 'CONVERTED'}
          >
            Change Status
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Schedule Status</DialogTitle>
            <DialogDescription>
              Update the status of this schedule. Some status changes may require additional information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">New Status</Label>
              <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={!canChangeToStatus(option.value)}
                    >
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(newStatus === 'REJECTED' || newStatus === 'APPROVED' || newStatus === 'PENDING_APPROVAL') && (
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Provide a reason for ${newStatus.toLowerCase()}...`}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={loading || newStatus === currentStatus || ((newStatus === 'REJECTED' || newStatus === 'PENDING_APPROVAL') && !reason.trim())}
            >
              {loading ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatusManager; 