import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Trash2, Archive, Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { ProjectWithRelations } from '@/types/project';

interface ArchivedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void; // Callback to refresh main projects list
}

const ArchivedProjectsModal: React.FC<ArchivedProjectsModalProps> = ({
  isOpen,
  onClose,
  onRestore
}) => {
  const [archivedProjects, setArchivedProjects] = useState<ProjectWithRelations[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [projectsToDelete, setProjectsToDelete] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchArchivedProjects();
      setSearchQuery('');
      setSelectedProjects([]);
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter projects based on search query
    if (searchQuery.trim() === '') {
      setFilteredProjects(archivedProjects);
    } else {
      const filtered = archivedProjects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${project.creator.account.first_name} ${project.creator.account.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, archivedProjects]);

  const fetchArchivedProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch archived projects by modifying the main projects API call
      const response = await axios.get('/api/projects', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        params: {
          include_archived: 'true',
          archived_only: 'true'
        }
      });
      
      setArchivedProjects(response.data);
    } catch (error) {
      console.error('Error fetching archived projects:', error);
      toast.error('Failed to load archived projects');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (projectIds: number[]) => {
    try {
      setIsRestoring(true);
      
      const response = await axios.put('/api/projects/archive', {
        project_ids: projectIds
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success(response.data.message);
      
      // Remove restored projects from the list
      setArchivedProjects(prev => 
        prev.filter(project => !projectIds.includes(project.project_id))
      );
      setSelectedProjects([]);
      
      // Notify parent to refresh main projects list
      onRestore();
      
    } catch (error: any) {
      console.error('Error restoring projects:', error);
      const errorMessage = error.response?.data?.error || 'Failed to restore projects';
      toast.error(errorMessage);
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePermanentDelete = async (projectIds: number[]) => {
    setProjectsToDelete(projectIds);
    setShowDeleteConfirmModal(true);
  };

  const confirmPermanentDelete = async () => {
    try {
      setIsDeleting(true);
      setShowDeleteConfirmModal(false);
      
      // Call delete API for each project
      const deletePromises = projectsToDelete.map(id =>
        axios.delete(`/api/projects/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
      );

      await Promise.all(deletePromises);
      
      toast.success(`Successfully deleted ${projectsToDelete.length} project(s) permanently`);
      
      // Remove deleted projects from the list
      setArchivedProjects(prev => 
        prev.filter(project => !projectsToDelete.includes(project.project_id))
      );
      setSelectedProjects([]);
      setProjectsToDelete([]);
      
    } catch (error: any) {
      console.error('Error deleting projects:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete projects';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelPermanentDelete = () => {
    setShowDeleteConfirmModal(false);
    setProjectsToDelete([]);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
    switch (status) {
      case "planning":
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case "execution":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case "completed":
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`;
      case "on_hold":
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
      case "at_risk":
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case "delayed":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      default:
        return baseClasses;
    }
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
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <Archive className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Archived Projects ({archivedProjects.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Actions */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search archived projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Action Buttons */}
            {selectedProjects.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRestore(selectedProjects)}
                  disabled={isRestoring}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRestoring && <Loader2 className="animate-spin" size={14} />}
                  <RotateCcw size={14} />
                  <span>Restore ({selectedProjects.length})</span>
                </button>
                <button
                  onClick={() => handlePermanentDelete(selectedProjects)}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting && <Loader2 className="animate-spin" size={14} />}
                  <Trash2 size={14} />
                  <span>Delete Permanently</span>
                </button>
              </div>
            )}
          </div>

          {/* Selection Info */}
          {selectedProjects.length > 0 && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {selectedProjects.length} project(s) selected
              <button
                onClick={() => setSelectedProjects([])}
                className="ml-2 text-orange-600 hover:text-orange-700 dark:text-orange-400"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="animate-spin mx-auto mb-4" size={48} />
                <p className="text-gray-600 dark:text-gray-400">Loading archived projects...</p>
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Archive className="mx-auto mb-4 text-gray-400" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {searchQuery ? 'No matching archived projects' : 'No archived projects'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Archived projects will appear here.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Select All */}
              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedProjects.length === filteredProjects.length && filteredProjects.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProjects(filteredProjects.map(p => p.project_id));
                      } else {
                        setSelectedProjects([]);
                      }
                    }}
                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Select all</span>
                </label>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.project_id}
                    className={`relative border rounded-lg p-4 transition-all ${
                      selectedProjects.includes(project.project_id)
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Checkbox - positioned in top right corner */}
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.project_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjects(prev => [...prev, project.project_id]);
                        } else {
                          setSelectedProjects(prev => prev.filter(id => id !== project.project_id));
                        }
                      }}
                      className="absolute top-3 right-3 w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                    />

                    {/* Project Info */}
                    <div className="pr-8">
                      <div className="mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate pr-2 mb-2">
                          {project.name}
                        </h3>
                        <span className={getStatusBadge(project.status)}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {project.project_code}
                      </p>
                      
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {project.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Manager:</span>
                          <p className="text-gray-900 dark:text-gray-100 truncate">
                            {project.creator.account.first_name} {project.creator.account.last_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Budget:</span>
                          <p className="text-gray-900 dark:text-gray-100">
                            {formatCurrency(project.budget_amount)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
                          <p className="text-gray-900 dark:text-gray-100">
                            {formatDate(project.start_date)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Progress:</span>
                          <p className="text-gray-900 dark:text-gray-100">
                            {project.progress_percentage}%
                          </p>
                        </div>
                      </div>

                      {/* Individual Action Buttons */}
                      <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                        <button
                          onClick={() => handleRestore([project.project_id])}
                          disabled={isRestoring}
                          className="flex items-center space-x-1 px-2 py-1 text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handlePermanentDelete([project.project_id])}
                          disabled={isDeleting}
                          className="flex items-center space-x-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredProjects.length} of {archivedProjects.length} archived projects
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-white/20 dark:border-slate-700/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Permanently Delete Projects
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-red-600 dark:text-red-400">
                {projectsToDelete.length} project{projectsToDelete.length !== 1 ? 's' : ''}
              </span>
              ? This will remove all project data, tasks, and associated information permanently.
            </p>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={cancelPermanentDelete}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmPermanentDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivedProjectsModal; 