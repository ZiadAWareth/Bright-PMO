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
        return 'px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'execution':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'on_hold':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending_approval':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'approved':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
    switch (priority) {
      case "high":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case "medium":
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case "low":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Projects Header */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Projects</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {projectCount || projects.length} projects
            </p>
          </div>
          {/* {['admin', 'project-manager'].includes(activeView) && (
            <button 
              onClick={() => router.push('/projects/create')}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
              className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-orange-500 dark:hover:border-orange-500 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Link href={`/projects/${project.project_id}`} className="font-semibold text-base text-primary">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 hover:text-orange-500 dark:hover:text-orange-500">{project.name}</h4>
                    </Link>
                    <span className={getStatusBadge(project.status)}>
                      {project.status}
                    </span>
                    <span className={getPriorityBadge(project.priority)}>
                      {project.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{project.description}</p>
                  
                  {/* Project Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Progress</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm font-medium">{project.progress_percentage}%</span>
                        <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${project.progress_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Budget</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        OMR {project.budget_amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Actual Cost</span>
                      <p className={`text-sm font-medium ${
                        project.actual_cost > project.budget_amount ? 'text-red-600' :
                        project.actual_cost < project.budget_amount ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        OMR {project.actual_cost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href={`/projects/${project.project_id}`} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="View project">
                    <Eye size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {(!projects || projects.length === 0) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderTree size={32} className="text-orange-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Projects Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                There are no projects to display.
              </p>
              {['admin', 'project-manager'].includes(activeView) && (
                <button 
                  onClick={() => router.push('/projects/create')}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors mx-auto"
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