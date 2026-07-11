"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Calendar, Users, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "@/lib/axios";

interface Schedule {
  schedule_id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'analyzing' | 'feasible' | 'infeasible' | 'approved' | 'rejected' | 'converted';
  priority: 'low' | 'medium' | 'high';
  estimated_budget: number;
  target_completion_date: string;
  notes: string;
}

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleId: number | null;
  onSuccess: () => void;
}

const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  isOpen,
  onClose,
  scheduleId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Schedule>({
    schedule_id: 0,
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "draft",
    priority: "medium",
    estimated_budget: 0,
    target_completion_date: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen && scheduleId) {
      fetchSchedule();
    }
  }, [isOpen, scheduleId]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await axios.get(`/api/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const schedule = response.data.schedule;
      setFormData({
        schedule_id: schedule.schedule_id,
        name: schedule.name,
        description: schedule.description || "",
        start_date: schedule.start_date.split('T')[0], // Convert to date input format
        end_date: schedule.end_date.split('T')[0],
        status: schedule.status,
        priority: schedule.priority,
        estimated_budget: schedule.total_budget || 0,
        target_completion_date: schedule.target_completion_date ? schedule.target_completion_date.split('T')[0] : "",
        notes: schedule.notes || "",
      });
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Schedule, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Schedule name is required");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return false;
    }
    if (!formData.start_date) {
      toast.error("Start date is required");
      return false;
    }
    if (!formData.end_date) {
      toast.error("End date is required");
      return false;
    }
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast.error("End date must be after start date");
      return false;
    }
    if (formData.estimated_budget < 0) {
      toast.error("Budget cannot be negative");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      await axios.put(`/api/schedules/${scheduleId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Schedule updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to update schedule:", error);
      const errorMessage = error.response?.data?.message || "Failed to update schedule";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Edit Schedule
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Update the project schedule details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar size={20} />
                    Basic Information
                  </CardTitle>
                  <CardDescription>
                    Define the core details of your project schedule
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Schedule Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter schedule name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Describe the project schedule"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Start Date *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange("start_date", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">End Date *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange("end_date", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="target_completion_date">Target Completion Date</Label>
                      <Input
                        id="target_completion_date"
                        type="date"
                        value={formData.target_completion_date}
                        onChange={(e) => handleInputChange("target_completion_date", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={formData.priority} 
                        onValueChange={(value: 'low' | 'medium' | 'high') => 
                          handleInputChange("priority", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget & Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign size={20} />
                      Budget Information
                    </CardTitle>
                    <CardDescription>
                      Set the estimated budget for this schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="estimated_budget">Estimated Budget</Label>
                      <Input
                        id="estimated_budget"
                        type="number"
                        value={formData.estimated_budget}
                        onChange={(e) => handleInputChange("estimated_budget", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle size={20} />
                      Additional Notes
                    </CardTitle>
                    <CardDescription>
                      Add any additional notes or comments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Add any additional notes..."
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditScheduleModal; 