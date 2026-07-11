import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface MassUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjects: number[];
  onSuccess: () => void;
}

interface UpdateOptions {
  status_options: string[];
  priority_options: string[];
  compliance_options: string[];
  strategic_value_options: string[];
  portfolios: { portfolio_id: number; name: string }[];
  eps_levels: { eps_id: number; name: string; eps_code: string; level: number }[];
  updatable_fields: string[];
}

interface UpdateData {
  status?: string;
  priority?: string;
  compliance?: string;
  strategicValue?: string;
  portfolio_id?: number;
  eps_level_id?: number;
  location?: string;
  client?: string;
  contractor?: string;
  tags?: string[];
}

const MassUpdateModal: React.FC<MassUpdateModalProps> = ({
  isOpen,
  onClose,
  selectedProjects,
  onSuccess
}) => {
  const [updateData, setUpdateData] = useState<UpdateData>({});
  const [options, setOptions] = useState<UpdateOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUpdateOptions();
      setUpdateData({});
      setTagsInput('');
    }
  }, [isOpen]);

  const fetchUpdateOptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/projects/mass-update', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setOptions(response.data);
    } catch (error) {
      console.error('Error fetching update options:', error);
      toast.error('Failed to load update options');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Object.keys(updateData).length === 0) {
      toast.error('Please select at least one field to update');
      return;
    }

    try {
      setIsUpdating(true);
      
      // Process tags if provided
      const finalUpdateData = { ...updateData };
      if (tagsInput.trim()) {
        finalUpdateData.tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
      }

      const response = await axios.post('/api/projects/mass-update', {
        project_ids: selectedProjects,
        updates: finalUpdateData
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success(response.data.message);
      
      if (response.data.warnings && response.data.warnings.length > 0) {
        response.data.warnings.forEach((warning: string) => {
          toast.warning(warning);
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating projects:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update projects';
      toast.error(errorMessage);
      
      if (error.response?.data?.details) {
        error.response.data.details.forEach((detail: string) => {
          toast.error(detail);
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    if (value === '' || value === undefined) {
      // Remove field if empty
      const newData = { ...updateData };
      delete newData[field as keyof UpdateData];
      setUpdateData(newData);
    } else {
      setUpdateData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const formatFieldName = (field: string) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('_', ' ');
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 backdrop-blur-md bg-white/10 dark:bg-black/20 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Mass Update Projects ({selectedProjects.length} selected)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400">Loading update options...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select the fields you want to update. Only the fields you modify will be applied to all selected projects.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={updateData.status || ''}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Don't change</option>
                  {options?.status_options.map(status => (
                    <option key={status} value={status}>
                      {formatFieldName(status)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={updateData.priority || ''}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Don't change</option>
                  {options?.priority_options.map(priority => (
                    <option key={priority} value={priority}>
                      {formatFieldName(priority)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compliance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Compliance
                </label>
                <select
                  value={updateData.compliance || ''}
                  onChange={(e) => handleFieldChange('compliance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Don't change</option>
                  {options?.compliance_options.map(compliance => (
                    <option key={compliance} value={compliance}>
                      {formatFieldName(compliance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Strategic Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Strategic Value
                </label>
                <select
                  value={updateData.strategicValue || ''}
                  onChange={(e) => handleFieldChange('strategicValue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Don't change</option>
                  {options?.strategic_value_options.map(value => (
                    <option key={value} value={value}>
                      {formatFieldName(value)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Portfolio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Portfolio
                </label>
                <select
                  value={updateData.portfolio_id || ''}
                  onChange={(e) => handleFieldChange('portfolio_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Don't change</option>
                  {options?.portfolios.map(portfolio => (
                    <option key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* EPS Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  EPS Level
                </label>
                <select
                  value={updateData.eps_level_id || ''}
                  onChange={(e) => handleFieldChange('eps_level_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Don't change</option>
                  {options?.eps_levels.map(eps => (
                    <option key={eps.eps_id} value={eps.eps_id}>
                      {eps.name} ({eps.eps_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={updateData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="Don't change"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client
                </label>
                <input
                  type="text"
                  value={updateData.client || ''}
                  onChange={(e) => handleFieldChange('client', e.target.value)}
                  placeholder="Don't change"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Contractor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contractor
                </label>
                <input
                  type="text"
                  value={updateData.contractor || ''}
                  onChange={(e) => handleFieldChange('contractor', e.target.value)}
                  placeholder="Don't change"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g., urgent, infrastructure, phase1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty to not change tags
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                disabled={isUpdating}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating || Object.keys(updateData).length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating && <Loader2 className="animate-spin" size={16} />}
                <Save size={16} />
                <span>{isUpdating ? 'Updating...' : 'Update Projects'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MassUpdateModal; 