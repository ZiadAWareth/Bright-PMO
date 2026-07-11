import React, { useState, useEffect } from 'react';
import { Save, X, Plus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';


interface ParentEPS {
  eps_id: number;
  name: string;
  level: number;
}

interface EpsCreateFormProps {
  allEps: ParentEPS[];
  onClose: () => void;
  onSuccess: () => void;
  showCloseButton?: boolean;
}

const EpsCreateForm: React.FC<EpsCreateFormProps> = ({ 
  allEps = [], 
  onClose, 
  onSuccess, 
  showCloseButton = true 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 1,
    parent_eps_id: null as number | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredParentEpsList = formData.level > 1
    ? (allEps || []).filter((eps) => eps.level === formData.level - 1)
    : [];

  const validateForm = () => {
    // Validate name is not empty or whitespace-only
    if (!formData.name || !formData.name.trim()) {
      setFormError('EPS name is required and cannot be empty.');
      return false;
    }
    
    if (formData.level === 1 && formData.parent_eps_id !== null) {
      setFormError('Level 1 EPS cannot have a parent.');
      return false;
    }
    if (formData.level > 1 && (formData.parent_eps_id === null || !filteredParentEpsList.some(eps => eps.eps_id === formData.parent_eps_id))) {
      setFormError(`Please select a parent EPS of level ${formData.level - 1}.`);
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        level: Number(formData.level),
      };
      await axios.post('/api/eps', payload, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      toast.success('EPS created successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating EPS:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create EPS';
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      let updated = {
        ...prev,
        [name]: name === 'parent_eps_id' ? (value === '' ? null : parseInt(value)) :
                name === 'level' ? Number(value) : value
      };
      // If level is changed to 1, reset parent_eps_id to null
      if (name === 'level' && Number(value) === 1) {
        updated.parent_eps_id = null;
      }
      return updated;
    });
  };



  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 px-8 py-10 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Plus size={20} className="text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create EPS</h2>
        </div>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              EPS Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter EPS name"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter EPS description"
            />
          </div>

          {/* Level */}
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Level
            </label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </select>
          </div>

          {/* Parent EPS */}
          <div>
            <label htmlFor="parent_eps_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parent EPS
            </label>
            <select
              id="parent_eps_id"
              name="parent_eps_id"
              value={formData.parent_eps_id ?? ''}
              onChange={handleChange}
              disabled={formData.level === 1}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formData.level === 1 ? (
                <option value="">No Parent</option>
              ) : (
                <option value="" disabled>
                  {filteredParentEpsList.length === 0 ? 'No available parent EPS' : 'Select parent EPS'}
                </option>
              )}
              {formData.level > 1 &&
                filteredParentEpsList.map((parentEps) => (
                  <option key={parentEps.eps_id} value={parentEps.eps_id}>
                    {parentEps.name} (Level {parentEps.level})
                  </option>
                ))}
            </select>
            {formData.level === 1 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Level 1 EPS cannot have a parent.</p>
            )}
            {formError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">{formError}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            type="button"
            className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            <Save size={16} />
            {isSubmitting ? 'Creating...' : 'Create EPS'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EpsCreateForm;
