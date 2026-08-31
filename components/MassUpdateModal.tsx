import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";

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
      <div className="bg-surface rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-line px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">
            Mass Update Projects ({selectedProjects.length} selected)
          </h2>
          <button
            onClick={onClose}
            className="text-faint hover:text-muted"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Spinner size={48} className="mx-auto mb-4 text-bright-primary" />
            <p className="text-muted">Loading update options...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <p className="text-sm text-muted">
                Select the fields you want to update. Only the fields you modify will be applied to all selected projects.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  Status
                </label>
                <Dropdown
                  value={String(updateData.status || '')}
                  onChange={(__v: string) => handleFieldChange('status', __v)}
                  options={[
                  { value: String(""), label: "Don't change" },
                  ...(options?.status_options.map(status => ({ value: String(status), label: formatFieldName(status) })) ?? []),
                ]}
                  modal
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  Priority
                </label>
                <Dropdown
                  value={String(updateData.priority || '')}
                  onChange={(__v: string) => handleFieldChange('priority', __v)}
                  options={[
                  { value: String(""), label: "Don't change" },
                  ...(options?.priority_options.map(priority => ({ value: String(priority), label: formatFieldName(priority) })) ?? []),
                ]}
                  modal
                />
              </div>

              {/* Compliance */}
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  Compliance
                </label>
                <Dropdown
                  value={String(updateData.compliance || '')}
                  onChange={(__v: string) => handleFieldChange('compliance', __v)}
                  options={[
                  { value: String(""), label: "Don't change" },
                  ...(options?.compliance_options.map(compliance => ({ value: String(compliance), label: formatFieldName(compliance) })) ?? []),
                ]}
                  modal
                />
              </div>

              {/* Strategic Value */}
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  Strategic Value
                </label>
                <Dropdown
                  value={String(updateData.strategicValue || '')}
                  onChange={(__v: string) => handleFieldChange('strategicValue', __v)}
                  options={[
                  { value: String(""), label: "Don't change" },
                  ...(options?.strategic_value_options.map(value => ({ value: String(value), label: formatFieldName(value) })) ?? []),
                ]}
                  modal
                />
              </div>

              {/* Portfolio */}
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  Portfolio
                </label>
                <Dropdown
                  value={String(updateData.portfolio_id || '')}
                  onChange={(__v: string) => handleFieldChange('portfolio_id', __v ? parseInt(__v) : undefined)}
                  options={[
                  { value: String(""), label: "Don't change" },
                  ...(options?.portfolios.map(portfolio => ({ value: String(portfolio.portfolio_id), label: portfolio.name })) ?? []),
                ]}
                  modal
                />
              </div>

              {/* EPS Level */}
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  EPS Level
                </label>
                <Dropdown
                  value={String(updateData.eps_level_id || '')}
                  onChange={(__v: string) => handleFieldChange('eps_level_id', __v ? parseInt(__v) : undefined)}
                  options={[
                  { value: String(""), label: "Don't change" },
                  ...(options?.eps_levels.map(eps => ({ value: String(eps.eps_id), label: `${eps.name} (${eps.eps_code})` })) ?? []),
                ]}
                  modal
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={updateData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  placeholder="Don't change"
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  Client
                </label>
                <input
                  type="text"
                  value={updateData.client || ''}
                  onChange={(e) => handleFieldChange('client', e.target.value)}
                  placeholder="Don't change"
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink"
                />
              </div>

              {/* Contractor */}
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  Contractor
                </label>
                <input
                  type="text"
                  value={updateData.contractor || ''}
                  onChange={(e) => handleFieldChange('contractor', e.target.value)}
                  placeholder="Don't change"
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink"
                />
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink-3 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g., urgent, infrastructure, phase1"
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink"
                />
                <p className="text-xs text-muted mt-1">
                  Leave empty to not change tags
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                disabled={isUpdating}
                className="px-4 py-2 border border-line rounded-lg text-sm font-medium text-ink-3 hover:bg-surface-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating || Object.keys(updateData).length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg text-sm font-medium hover:bg-bright-deep disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating && <Spinner size={16} />}
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