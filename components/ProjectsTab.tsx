import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Edit, FolderTree } from 'lucide-react';
import { Project } from '@/types/project';
import Link from 'next/link';

interface ProjectsTabProps {
  projects: Project[];
  activeView: string;
  projectCount?: number;
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projects,
  activeView,
  projectCount
}) => {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-info-soft text-info  ';
      case 'execution':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-success-soft text-success  ';
      case 'completed':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-accent-violet-soft text-accent-violet  ';
      case 'on_hold':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-warning-soft text-warning  ';
      case 'pending_approval':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-bright-soft text-bright  ';
      case 'approved':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-success-soft text-success  ';
      case 'rejected':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-danger-soft text-danger  ';
      default:
        return 'px-2 py-1 text-xs font-medium rounded-full bg-surface-2 text-ink-2  ';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
    switch (priority) {
      case "high":
        return `${baseClasses} bg-danger-soft text-danger  `;
      case "medium":
        return `${baseClasses} bg-warning-soft text-warning  `;
      case "low":
        return `${baseClasses} bg-success-soft text-success  `;
      default:
        return `${baseClasses} bg-surface-2 text-ink-2  `;
    }
  };

  return (
    <div className="space-y-6">
      {/* Projects Header */}
      <div className="bg-surface border border-line rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-ink">Projects</h3>
            <p className="text-sm text-muted mt-1">
              {projectCount || projects.length} projects
            </p>
          </div>
          {/* {['admin', 'project-manager'].includes(activeView) && (
            <button 
              onClick={() => router.push('/projects/new')}
              className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
            >
              <Plus size={16} />
              <span>Add Project</span>
            </button>
          )} */}
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {projects.map((project) => (
            <div 
              key={project.project_id}
              className="border border-line rounded-lg p-4 hover:border-bright transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Link href={`/projects/${project.project_id}`} className="font-semibold text-base text-primary">
                      <h4 className="text-lg font-medium text-ink hover:text-bright">{project.name}</h4>
                    </Link>
                    <span className={getStatusBadge(project.status)}>
                      {project.status}
                    </span>
                    <span className={getPriorityBadge(project.priority)}>
                      {project.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted mb-3">{project.description}</p>
                  
                  {/* Project Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-muted">Progress</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm font-medium">{project.progress_percentage}%</span>
                        <div className="flex-1 bg-surface-3 rounded-full h-2">
                          <div
                            className="bg-info h-2 rounded-full"
                            style={{ width: `${project.progress_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted">Budget</span>
                      <p className="text-sm font-medium text-ink">
                        OMR {project.budget_amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted">Actual Cost</span>
                      <p className={`text-sm font-medium ${
                        project.actual_cost > project.budget_amount ? 'text-danger' :
                        project.actual_cost < project.budget_amount ? 'text-success' : 'text-ink'
                      }`}>
                        OMR {project.actual_cost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href={`/projects/${project.project_id}`} className="p-2 text-faint hover:text-muted hover:bg-surface-2 rounded-lg transition-colors" title="View project">
                    <Eye size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {(!projects || projects.length === 0) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-bright-soft rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderTree size={32} className="text-bright" />
              </div>
              <h3 className="text-lg font-medium text-ink mb-2">
                No Projects Found
              </h3>
              <p className="text-muted mb-4">
                There are no projects to display.
              </p>
              {['admin', 'project-manager'].includes(activeView) && (
                <button 
                  onClick={() => router.push('/projects/new')}
                  className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors mx-auto"
                >
                  <Plus size={16} />
                  <span>Add Project</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsTab; 