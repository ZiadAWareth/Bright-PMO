'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, CheckCircle, AlertCircle, Building, DollarSign, Calendar, Target } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { ProjectWithRelations } from '@/types/project';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWithRelations | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  description: string;
  priority: string;
  compliance: string;
  strategicValue: string;
  location: string;
  client: string;
  contractor: string;
  budget_amount: string;
  start_date: string;
  planned_end_date: string;
  portfolio_id: number;
}

interface Portfolio {
  portfolio_id: number;
  name: string;
}

export default function EditProjectModal({ isOpen, onClose, project, onSuccess }: EditProjectModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    priority: 'medium',
    compliance: 'pending',
    strategicValue: 'medium',
    location: '',
    client: '',
    contractor: '',
    budget_amount: '',
    start_date: '',
    planned_end_date: '',
    portfolio_id: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string>('');
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  // Fetch portfolios when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchPortfolios = async () => {
        setLoadingPortfolios(true);
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          
          const response = await axios.get('/api/portfolios', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setPortfolios(response.data || []);
        } catch (error) {
          console.error('Error fetching portfolios:', error);
          toast.error('Failed to load portfolios', {
            icon: <AlertCircle className="text-red-500" />,
          });
        } finally {
          setLoadingPortfolios(false);
        }
      };
      fetchPortfolios();
    }
  }, [isOpen]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        priority: project.priority,
        compliance: project.compliance,
        strategicValue: project.strategicValue,
        location: project.location || '',
        client: project.client || '',
        contractor: project.contractor || '',
        budget_amount: project.budget_amount.toString(),
        start_date: new Date(project.start_date).toISOString().split('T')[0],
        planned_end_date: project.planned_end_date ? new Date(project.planned_end_date).toISOString().split('T')[0] : '',
        portfolio_id: project.portfolio_id || 0
      });
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const validateDates = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Reset time to compare dates only
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (end < start) {
        setDateError('End date cannot be before start date');
        return false;
      }
      if (end.getTime() === start.getTime()) {
        setDateError('End date cannot be the same as start date');
        return false;
      }
    }
    setDateError('');
    return true;
  };

  const handleStartDateChange = (value: string) => {
    setFormData({ ...formData, start_date: value });
    validateDates(value, formData.planned_end_date);
  };

  const handleEndDateChange = (value: string) => {
    setFormData({ ...formData, planned_end_date: value });
    validateDates(formData.start_date, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate dates before submission
    if (!validateDates(formData.start_date, formData.planned_end_date)) {
      toast.error('Please fix the date validation errors', {
        icon: <AlertCircle className="text-red-500" />,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Authentication token not found. Please log in.", {
          icon: <AlertCircle className="text-red-500" />,
        });
        setIsSubmitting(false);
        return;
      }

      const response = await axios.put(`/api/projects/${project.project_id}`, {
        ...formData,
        budget_amount: parseFloat(formData.budget_amount),
        description: formData.description || null,
        portfolio_id: formData.portfolio_id || project.portfolio_id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        toast.success("Project updated successfully", {
          icon: <CheckCircle className="text-green-500" />,
        });
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Error updating project:', error);
      const errorMessage = error.response?.data?.error || error.message || "Unknown error";
      toast.error(`Error updating project: ${errorMessage}`, {
        icon: <AlertCircle className="text-red-500" />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMouseDownOnBackdrop(true);
    } else {
      setMouseDownOnBackdrop(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop) {
      onClose();
    }
    setMouseDownOnBackdrop(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-slate-700/20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Edit size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label htmlFor="strategicValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Strategic Value
                </label>
                <select
                  id="strategicValue"
                  value={formData.strategicValue}
                  onChange={(e) => setFormData({ ...formData, strategicValue: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label htmlFor="compliance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Compliance Status
                </label>
                <select
                  id="compliance"
                  value={formData.compliance}
                  onChange={(e) => setFormData({ ...formData, compliance: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                >
                  <option value="compliant">Compliant</option>
                  <option value="non_compliant">Non Compliant</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Project Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="client" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client
                </label>
                <input
                  type="text"
                  id="client"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="contractor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contractor
                </label>
                <input
                  type="text"
                  id="contractor"
                  value={formData.contractor}
                  onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="budget_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Amount (OMR)
                </label>
                <input
                  type="number"
                  id="budget_amount"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label htmlFor="portfolio_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Portfolio
                </label>
                <select
                  id="portfolio_id"
                  value={formData.portfolio_id}
                  onChange={(e) => setFormData({ ...formData, portfolio_id: parseInt(e.target.value) })}
                  disabled={loadingPortfolios}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="0">Select Portfolio</option>
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
                {formData.portfolio_id !== (project?.portfolio_id || 0) && formData.portfolio_id > 0 && (
                  <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Changing portfolio will affect budget tracking and reporting. Stakeholders will be notified.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={formData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white ${
                    dateError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="planned_end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Planned End Date
                </label>
                <input
                  type="date"
                  id="planned_end_date"
                  value={formData.planned_end_date}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white ${
                    dateError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
            </div>
            {dateError && (
              <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mr-1" />
                {dateError}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!dateError}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              )}
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
