import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Trash2, Archive, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { ProjectWithRelations } from '@/types/project';
import { Spinner } from "@/components/ui/spinner";

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
        return `${baseClasses} bg-info-soft text-info  `;
      case "execution":
        return `${baseClasses} bg-success-soft text-success  `;
      case "completed":
        return `${baseClasses} bg-accent-violet-soft text-accent-violet  `;
      case "on_hold":
        return `${baseClasses} bg-surface-2 text-ink-2  `;
      case "at_risk":
        return `${baseClasses} bg-warning-soft text-warning  `;
      case "delayed":
        return `${baseClasses} bg-danger-soft text-danger  `;
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
      <div className="bg-surface rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div className="flex items-center space-x-3">
            <Archive className="h-6 w-6 text-muted" />
            <h2 className="text-xl font-semibold text-ink">
              Archived Projects ({archivedProjects.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-faint hover:text-muted"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Actions */}
        <div className="p-6 border-b border-line">
          <div className="flex items-center justify-between space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-faint" />
              <input
                type="text"
                placeholder="Search archived projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-line rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-bright"
              />
            </div>

            {/* Action Buttons */}
            {selectedProjects.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRestore(selectedProjects)}
                  disabled={isRestoring}
                  className="flex items-center space-x-2 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRestoring && <Spinner size={14} />}
                  <RotateCcw size={14} />
                  <span>Restore ({selectedProjects.length})</span>
                </button>
                <button
                  onClick={() => handlePermanentDelete(selectedProjects)}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 px-3 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting && <Spinner size={14} />}
                  <Trash2 size={14} />
                  <span>Delete Permanently</span>
                </button>
              </div>
            )}
          </div>

          {/* Selection Info */}
          {selectedProjects.length > 0 && (
            <div className="mt-3 text-sm text-muted">
              {selectedProjects.length} project(s) selected
              <button
                onClick={() => setSelectedProjects([])}
                className="ml-2 text-bright hover:text-bright-deep"
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
                <Spinner size={48} className="mx-auto mb-4 text-bright-primary" />
                <p className="text-muted">Loading archived projects...</p>
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Archive className="mx-auto mb-4 text-faint" size={48} />
                <h3 className="text-lg font-medium text-ink mb-2">
                  {searchQuery ? 'No matching archived projects' : 'No archived projects'}
                </h3>
                <p className="text-muted">
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
                    className="w-4 h-4 text-bright bg-surface-2 border-line rounded focus:ring-bright focus:ring-2"
                  />
                  <span className="text-sm text-ink-3">Select all</span>
                </label>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.project_id}
                    className={`relative border rounded-lg p-4 transition-all ${
                      selectedProjects.includes(project.project_id)
                        ? 'border-bright bg-bright-soft'
                        : 'border-line hover:border-line '
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
                      className="absolute top-3 right-3 w-4 h-4 text-bright bg-surface-2 border-line rounded focus:ring-bright focus:ring-2"
                    />

                    {/* Project Info */}
                    <div className="pr-8">
                      <div className="mb-2">
                        <h3 className="text-sm font-semibold text-ink truncate pr-2 mb-2">
                          {project.name}
                        </h3>
                        <span className={getStatusBadge(project.status)}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted mb-2">
                        {project.project_code}
                      </p>
                      
                      <p className="text-xs text-muted mb-3 line-clamp-2">
                        {project.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted">Manager:</span>
                          <p className="text-ink truncate">
                            {project.creator.account.first_name} {project.creator.account.last_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted">Budget:</span>
                          <p className="text-ink">
                            {formatCurrency(project.budget_amount)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted">Start Date:</span>
                          <p className="text-ink">
                            {formatDate(project.start_date)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted">Progress:</span>
                          <p className="text-ink">
                            {project.progress_percentage}%
                          </p>
                        </div>
                      </div>

                      {/* Individual Action Buttons */}
                      <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-line">
                        <button
                          onClick={() => handleRestore([project.project_id])}
                          disabled={isRestoring}
                          className="flex items-center space-x-1 px-2 py-1 text-xs text-success hover:text-success disabled:opacity-50"
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => handlePermanentDelete([project.project_id])}
                          disabled={isDeleting}
                          className="flex items-center space-x-1 px-2 py-1 text-xs text-danger hover:text-danger disabled:opacity-50"
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
        <div className="p-6 border-t border-line">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted">
              {filteredProjects.length} of {archivedProjects.length} archived projects
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-line rounded-lg text-sm font-medium text-ink-3 hover:bg-surface-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-danger-soft p-2 rounded-full">
                <Trash2 className="w-6 h-6 text-danger" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  Permanently Delete Projects
                </h3>
                <p className="text-sm text-muted">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <p className="text-ink-3 mb-6">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-danger">
                {projectsToDelete.length} project{projectsToDelete.length !== 1 ? 's' : ''}
              </span>
              ? This will remove all project data, tasks, and associated information permanently.
            </p>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={cancelPermanentDelete}
                disabled={isDeleting}
                className="px-4 py-2 border border-line rounded-lg text-sm font-medium text-ink-3 hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmPermanentDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isDeleting && <Spinner size={16} />}
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