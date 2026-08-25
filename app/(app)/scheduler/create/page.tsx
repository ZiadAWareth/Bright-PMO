"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { ArrowLeft, Save, Calendar, Users, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "@/lib/axios";

interface CreateScheduleForm {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimated_budget: string;
  notes: string;
  portfolio_id?: number;
  eps_level_id?: number;
}

const CreateSchedulePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateScheduleForm>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    priority: "MEDIUM",
    estimated_budget: "",
    notes: "",
    portfolio_id: undefined,
    eps_level_id: undefined,
  });

  const [portfolios, setPortfolios] = useState<Array<{ portfolio_id: number; name: string }>>([]);
  const [epsLevels, setEpsLevels] = useState<Array<{ eps_id: number; name: string; level: number }>>([]);
  const [loadingData, setLoadingData] = useState(true);

  const handleInputChange = (field: keyof CreateScheduleForm, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch portfolios and EPS levels on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/auth/login");
          return;
        }

        // Fetch portfolios
        const portfoliosResponse = await axios.get("/api/portfolios", {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Portfolios response:", portfoliosResponse.data);
        setPortfolios(portfoliosResponse.data || []);

        // Fetch EPS levels
        const epsResponse = await axios.get("/api/eps", {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("EPS response:", epsResponse.data);
        setEpsLevels(epsResponse.data || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load portfolios and EPS levels");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [router]);

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
    if (parseFloat(formData.estimated_budget) < 0) {
      toast.error("Budget cannot be negative");
      return false;
    }
    if (!formData.portfolio_id) {
      toast.error("Portfolio is required");
      return false;
    }
    if (!formData.eps_level_id) {
      toast.error("EPS Level is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await axios.post("/api/schedules", {
        ...formData,
        estimated_budget: parseFloat(formData.estimated_budget) || 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Schedule created successfully!");
      router.push(`/scheduler/${response.data.schedule.schedule_id}`);
    } catch (error: any) {
      console.error("Failed to create schedule:", error);
      const errorMessage = error.response?.data?.message || "Failed to create schedule";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout title="Create Schedule">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Schedule</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Set up a new project schedule for simulation and analysis
              </p>
            </div>
          </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
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
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Schedule Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter schedule name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange("start_date", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="portfolio">Portfolio *</Label>
                    <Select 
                      value={formData.portfolio_id?.toString() || ""} 
                      onValueChange={(value) => 
                        handleInputChange("portfolio_id", value ? parseInt(value) : undefined)
                      }
                      disabled={loadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        {portfolios.map((portfolio) => (
                          <SelectItem key={portfolio.portfolio_id} value={portfolio.portfolio_id.toString()}>
                            {portfolio.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eps">EPS Level *</Label>
                    <Select 
                      value={formData.eps_level_id?.toString() || ""} 
                      onValueChange={(value) => 
                        handleInputChange("eps_level_id", value ? parseInt(value) : undefined)
                      }
                      disabled={loadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select EPS level" />
                      </SelectTrigger>
                      <SelectContent>
                        {epsLevels.map((eps) => (
                          <SelectItem key={eps.eps_id} value={eps.eps_id.toString()}>
                            {eps.name} (Level {eps.level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => 
                      handleInputChange("priority", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Budget Information */}
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
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="estimated_budget">Estimated Budget</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                      OMR
                    </span>
                    <Input
                      id="estimated_budget"
                      type="text"
                      value={formData.estimated_budget ? parseFloat(formData.estimated_budget).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/,/g, '');
                        if (rawValue === '' || !isNaN(Number(rawValue))) {
                          handleInputChange("estimated_budget", rawValue);
                        }
                      }}
                      placeholder="0"
                      className="pl-16 text-lg font-semibold"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter the estimated budget in Omani Rial (OMR)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>
                  Any additional information about this schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Add any additional notes or requirements..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="text-sm font-medium">
                    {formData.start_date && formData.end_date 
                      ? `${Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24))} days`
                      : "Not set"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Priority:</span>
                  <span className="text-sm font-medium capitalize">{formData.priority.toLowerCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Budget:</span>
                  <span className="text-sm font-medium">
                    ${formData.estimated_budget ? parseFloat(formData.estimated_budget).toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Portfolio:</span>
                  <span className="text-sm font-medium">
                    {formData.portfolio_id 
                      ? portfolios.find(p => p.portfolio_id === formData.portfolio_id)?.name || "Unknown"
                      : "Not assigned"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">EPS Level:</span>
                  <span className="text-sm font-medium">
                    {formData.eps_level_id 
                      ? epsLevels.find(e => e.eps_id === formData.eps_level_id)?.name || "Unknown"
                      : "Not assigned"
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium">Create WBS Structure</p>
                    <p className="text-xs text-gray-600">Define work breakdown structure</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium">Add Tasks</p>
                    <p className="text-xs text-gray-600">Create detailed task list</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium">Assign Resources</p>
                    <p className="text-xs text-gray-600">Allocate team members</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium">Run Analysis</p>
                    <p className="text-xs text-gray-600">Check feasibility and conflicts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save size={16} />
                )}
                Create Schedule
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default CreateSchedulePage; 