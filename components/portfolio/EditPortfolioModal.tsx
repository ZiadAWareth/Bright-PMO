import React, { useState, useEffect } from 'react';
import { X, Edit, CheckCircle, AlertCircle, Plus, Minus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { PortfolioStatus, PortfolioPriority } from '@prisma/client';
import { PortfolioWithRelations } from '@/types/portfolio';

interface EditPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: PortfolioWithRelations | null;
  onSuccess: () => void;
}

export default function EditPortfolioModal({ isOpen, onClose, portfolio, onSuccess }: EditPortfolioModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as PortfolioStatus,
    priority: 'medium' as PortfolioPriority,
    strategic_objective: '',
    budget_capacity: '',
    tags: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  // Reset form data to original portfolio values
  const resetFormData = () => {
    if (portfolio) {
      setFormData({
        name: portfolio.name,
        description: portfolio.description || '',
        status: portfolio.status,
        priority: portfolio.priority,
        strategic_objective: portfolio.strategic_objective || '',
        budget_capacity: (portfolio as any).budget_capacity ? String((portfolio as any).budget_capacity) : '',
        tags: portfolio.tags && portfolio.tags.length > 0 ? [...portfolio.tags] : ['']
      });
    }
  };

  // Reset form when modal opens or portfolio changes
  useEffect(() => {
    if (isOpen && portfolio) {
      setFormData({
        name: portfolio.name,
        description: portfolio.description || '',
        status: portfolio.status,
        priority: portfolio.priority,
        strategic_objective: portfolio.strategic_objective || '',
        budget_capacity: (portfolio as any).budget_capacity ? String((portfolio as any).budget_capacity) : '',
        tags: portfolio.tags && portfolio.tags.length > 0 ? [...portfolio.tags] : ['']
      });
    }
  }, [isOpen, portfolio]);

  const addTag = () => {
    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, '']
    }));
  };

  const removeTag = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const updateTag = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.map((tag, i) => (i === index ? value : tag))
    }));
  };

  if (!isOpen || !portfolio) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Authentication token not found. Please log in.", {
          icon: <AlertCircle className="text-red-500" />,
          className: 'glass-error'
        });
        setIsSubmitting(false);
        return;
      }

      const response = await axios.put(`/api/portfolios/${portfolio.portfolio_id}`, {
        ...formData,
        description: formData.description || null,
        strategic_objective: formData.strategic_objective || null,
        budget_capacity: formData.budget_capacity ? parseFloat(formData.budget_capacity) : 0,
        tags: formData.tags.filter((tag) => tag.trim() !== '')
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        toast.success("Portfolio updated successfully", {
          icon: <CheckCircle className="text-green-500" />,
          className: 'glass-success'
        });
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error updating portfolio:', error);
      toast.error(`Error updating portfolio: ${error instanceof Error ? error.message : "Unknown error"}`, {
        icon: <AlertCircle className="text-red-500" />,
        className: 'glass-error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetFormData(); // Reset form data before closing
    onClose();
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
      handleClose();
    }
    setMouseDownOnBackdrop(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-transparent backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Edit size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Portfolio</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <form 
            id="edit-portfolio-form"
            onSubmit={handleSubmit} 
            className="space-y-6"
          >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Portfolio Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="strategic_objective" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Strategic Objective
            </label>
            <textarea
              id="strategic_objective"
              value={formData.strategic_objective}
              onChange={(e) => setFormData({ ...formData, strategic_objective: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PortfolioStatus })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as PortfolioPriority })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="budget_capacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Budget Capacity (OMR)
            </label>
            <input
              type="number"
              id="budget_capacity"
              min="0"
              step="0.01"
              value={formData.budget_capacity}
              onChange={(e) => setFormData({ ...formData, budget_capacity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter budget capacity (e.g., 1000000)"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Total budget capacity allocated to this portfolio
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            {formData.tags.map((tag, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => updateTag(index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                  placeholder={`Tag ${index + 1}`}
                />
                {formData.tags.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTag}
              className="flex items-center space-x-2 px-3 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span>Add Tag</span>
            </button>
          </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="flex justify-end space-x-4 p-6 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-portfolio-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 