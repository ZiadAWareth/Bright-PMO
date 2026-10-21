import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from "@/components/ui/modal";
import { notConnected } from "@/lib/not-connected";
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
  // notConnected: the allowed values for each field would be loaded here.
  const [options] = useState<UpdateOptions | null>(null);
  const loading = false;
  const isUpdating = false;
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUpdateData({});
      setTagsInput('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Object.keys(updateData).length === 0) {
      toast.error('Please select at least one field to update');
      return;
    }


    notConnected('Updating projects');
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

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Mass Update Projects (${selectedProjects.length} selected)`}
      maxWidthClass="max-w-4xl"
    >

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
    </Modal>
  );
};

export default MassUpdateModal; 