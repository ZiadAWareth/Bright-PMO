'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  CheckCircle,
  ArrowRight,
  Clock,
  Users,
  DollarSign,
  Calendar,
  Target,
  FileText,
  BarChart3,
  Settings,
  Layers,
  TrendingUp,
  Activity,
  AlertTriangle,
  Plus,
  Eye,
  Edit,
  Share2,
  Download,
  ArrowLeft
} from 'lucide-react';
import axios from 'axios';
import { ProjectSetup } from '@/types/project';
import { toast } from 'sonner';

interface Project {
  project_id: number;
  project_code: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  planned_end_date: string;
  budget_amount: number;
  progress_percentage: number;
  created_by: number;
  eps_level_id: number;
  portfolio_id: number;
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  action: string;
  icon: any;
  route: string;
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
}

const stepOrder: { id: keyof ProjectSetup; label: string }[] = [
  { id: 'wbs', label: 'Work Breakdown Structure' },
  { id: 'schedule', label: 'Project Scheduling' },
  { id: 'budget', label: 'Budget Planning' },
  { id: 'team', label: 'Team & Resources' },
  { id: 'risk', label: 'Risk Management' },
  { id: 'baseline', label: 'Project Baseline' },
  { id: 'execution', label: 'Project Execution' },
];

const ProjectSetupPage = () => {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [activeView, setActiveView] = useState('admin');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<ProjectSetup | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Initialize token on mount (client-side only)
  useEffect(() => {
    const storedToken = localStorage?.getItem('token');
    setToken(storedToken);

    // If no token, redirect to login
    if (!storedToken) {
      router.push('/auth/login');
    }
  }, [router]);

  // Fetch data when token is available
  useEffect(() => {
    if (!token) return;

    const fetchProject = async () => {
      try {
        const response = await axios.get(`/api/projects/${projectId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        setProject(response.data);
        console.log(response.data);
      } catch (error: any) {
        console.error('Error fetching project:', error);
        // If unauthorized, clear token and redirect to login
        if (error?.response?.status === 401) {
          localStorage.removeItem('token');
          router.push('/auth/login');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchSetup = async () => {
      setSetupLoading(true);
      try {
        const res = await axios.get(`/api/projects/${projectId}/setup`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        setSetup(res.data);
      } catch (e: any) {
        console.error('Error fetching setup:', e);
        // If unauthorized, clear token and redirect to login
        if (e?.response?.status === 401) {
          localStorage.removeItem('token');
          router.push('/auth/login');
        }
        setSetup(null);
      } finally {
        setSetupLoading(false);
      }
    };

    fetchProject();
    fetchSetup();
  }, [projectId, token]);

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'project-created',
      title: 'Project Created',
      description: 'Project has been successfully created and is ready for setup',
      status: 'completed',
      action: 'View Project Details',
      icon: CheckCircle,
      route: `/projects/${projectId}`,
      estimatedTime: 'Completed',
      priority: 'high'
    },
    {
      id: 'wbs-setup',
      title: 'Work Breakdown Structure',
      description: 'Define project phases, deliverables, and work packages',
      status: 'current',
      action: 'Create WBS',
      icon: Layers,
      route: `/projects/${projectId}/wbs`,
      estimatedTime: '30-60 min',
      priority: 'high'
    },
    {
      id: 'schedule-setup',
      title: 'Project Scheduling',
      description: 'Create detailed timeline, milestones, and task dependencies',
      status: 'current',
      action: 'Build Schedule',
      icon: Calendar,
      route: `/projects/${projectId}/schedule`,
      estimatedTime: '45-90 min',
      priority: 'high'
    },
    {
      id: 'budget-setup',
      title: 'Budget Planning',
      description: 'Allocate budget across work packages and set cost controls',
      status: 'pending',
      action: 'Setup Budget',
      icon: DollarSign,
      route: `/projects/${projectId}/budget`,
      estimatedTime: '30-45 min',
      priority: 'high'
    },
    {
      id: 'team-assignment',
      title: 'Team & Resources',
      description: 'Assign team members, define roles, and allocate resources',
      status: 'pending',
      action: 'Assign Team',
      icon: Users,
      route: `/projects/${projectId}/resources`,
      estimatedTime: '20-30 min',
      priority: 'medium'
    },
    {
      id: 'risk-assessment',
      title: 'Risk Management',
      description: 'Identify, assess, and plan mitigation for project risks',
      status: 'pending',
      action: 'Assess Risks',
      icon: AlertTriangle,
      route: `/projects/${projectId}/risks`,
      estimatedTime: '45-60 min',
      priority: 'medium'
    },
    {
      id: 'baseline-creation',
      title: 'Project Baseline',
      description: 'Create baseline for scope, schedule, and cost tracking',
      status: 'pending',
      action: 'Create Baseline',
      icon: Target,
      route: `/projects/${projectId}/baselines`,
      estimatedTime: '15-20 min',
      priority: 'low'
    },
    {
      id: 'project-execution',
      title: 'Request Approvals',
      description: 'Request necessary approvals before starting project execution',
      status: 'pending',
      action: 'Request Approvals',
      icon: Activity,
      route: `/projects/${projectId}/approval`,
      estimatedTime: 'Ongoing',
      priority: 'low'
    }
  ];

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'current':
        return 'bg-blue-500 text-white';
      case 'pending':
        return 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400';
      default:
        return 'bg-gray-200 text-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Map ProjectSetup to workflow step status
  const getStepStatus = (index: number): 'completed' | 'current' | 'pending' => {
    if (!setup) return 'pending';
    const stepKey = stepOrder[index].id;
    if (setup[stepKey]) return 'completed';
    // If all previous steps are completed, this is current
    const allPrevCompleted = stepOrder.slice(0, index).every(s => setup[s.id]);
    if (allPrevCompleted) return 'current';
    return 'pending';
  };

  const handleNextStep = async (index: number) => {
    if (!setup) return;
    const nextStep = stepOrder[index + 1]?.id;
    if (!nextStep) return;
    try {
      const res = await axios.patch(
        `/api/projects/${projectId}/setup`,
        { [nextStep]: true },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setSetup(res.data);
    } catch (e) {
      // handle error (optional: show toast)
    }
  };

  const handleExecutionStart = async () => {
    if (!setup) return;
    setExecutionLoading(true);
    try {
      // Update the execution field in setup only
      const setupRes = await axios.patch(
        `/api/projects/${projectId}/setup`,
        { execution: true },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setSetup(setupRes.data);

      // Refetch project to update status display
      const projectRes = await axios.get(`/api/projects/${projectId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      setProject(projectRes.data);

      // Show success toast and route to project page
      toast.success('Project execution started! Project status updated to pending approval.');
      router.push(`/projects/${projectId}`);
    } catch (e) {
      console.error('Error starting project execution:', e);
      toast.error('Error starting project execution. Please try again.');
    } finally {
      setExecutionLoading(false);
    }
  };

  if (loading || setupLoading) {
    return (
      <DashboardLayout title="Project Setup" onViewChange={setActiveView} activeView={activeView}>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout title="Project Setup" onViewChange={setActiveView} activeView={activeView}>
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Project Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The requested project could not be found or you don't have access to it.
          </p>
          <button
            onClick={() => router.push('/projects')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Map ProjectSetup to workflow step status and merge with original details
  const originalStepDetails = [
    {
      id: 'wbs',
      title: 'Work Breakdown Structure',
      description: 'Define project phases, deliverables, and work packages',
      action: 'Create WBS',
      icon: Layers,
      route: `/projects/${projectId}/wbs?from=setup`,
      estimatedTime: '30-60 min',
      priority: 'high',
    },
    {
      id: 'schedule',
      title: 'Project Scheduling',
      description: 'Create detailed timeline, milestones, and task dependencies',
      action: 'Build Schedule',
      icon: Calendar,
      route: `/projects/${projectId}/schedule?from=previous`,
      estimatedTime: '45-90 min',
      priority: 'high',
    },
    {
      id: 'budget',
      title: 'Budget Planning',
      description: 'Allocate budget across work packages and set cost controls',
      action: 'Setup Budget',
      icon: DollarSign,
      route: `/projects/${projectId}/budget?from=previous`,
      estimatedTime: '30-45 min',
      priority: 'high',
    },
    {
      id: 'team',
      title: 'Team & Resources',
      description: 'Assign team members, define roles, and allocate resources',
      action: 'Assign Team',
      icon: Users,
      route: `/projects/${projectId}/team?from=previous`,
      estimatedTime: '20-30 min',
      priority: 'medium',
    },
    {
      id: 'risk',
      title: 'Risk Management',
      description: 'Identify, assess, and plan mitigation for project risks',
      action: 'Assess Risks',
      icon: AlertTriangle,
      route: `/projects/${projectId}/risk?from=previous`,
      estimatedTime: '45-60 min',
      priority: 'medium',
    },
    {
      id: 'baseline',
      title: 'Project Baseline',
      description: 'Compare baseline for scope, schedule, and cost tracking',
      action: 'Compare Baseline',
      icon: Target,
      route: `/projects/${projectId}/baseline?from=previous`,
      estimatedTime: '15-20 min',
      priority: 'low',
    },
    {
      id: 'execution',
      title: 'Request Approvals',
      description: 'Request necessary approvals before starting project execution',
      action: 'Request Approvals',
      icon: Activity,
      route: `/projects/${projectId}/approval?from=previous`,
      estimatedTime: 'Ongoing',
      priority: 'low',
    },
  ];

  const mergedWorkflowSteps = stepOrder.map((step, idx) => {
    const details = originalStepDetails[idx];
    let status: 'completed' | 'current' | 'pending' = getStepStatus(idx);
    return {
      ...details,
      status,
    };
  });

  return (
    <DashboardLayout title="Project Setup Workflow" onViewChange={setActiveView} activeView={activeView}>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
        <button 
          onClick={() => router.push('/projects')}
          className="hover:text-orange-600 transition-colors"
        >
          Projects
        </button>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{project.name}</span>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Setup</span>
      </div>
      
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-8 mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
            <CheckCircle className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Project Created Successfully!</h1>
            <p className="text-green-100 text-lg">
              {project.name} is now ready for setup and configuration.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6" />
              <div>
                <p className="font-medium">Project Code</p>
                <p className="text-green-100">{project.project_code}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-6 h-6" />
              <div>
                <p className="font-medium">Initial Budget</p>
                <p className="text-green-100">OMR {project.budget_amount.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6" />
              <div>
                <p className="font-medium">Start Date</p>
                <p className="text-green-100">{new Date(project.start_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Status Display */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1 rounded-full bg-white/20 text-sm font-medium">
              Status: {project.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Setup Workflow</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Follow these steps to complete your project setup for successful execution.
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {(() => {
                const nextStep = mergedWorkflowSteps.find(step => step.status === 'current');
                return nextStep ? `Next: ${nextStep.title}` : 'All steps completed';
              })()}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {mergedWorkflowSteps.map((step, index) => {
            const IconComponent = step.icon;
            const isLast = index === mergedWorkflowSteps.length - 1;
            const isCurrent = step.status === 'current';
            const isCompleted = step.status === 'completed';
            return (
              <div key={step.id} className="relative">
                <div className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* Step Number & Icon */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStepStatusColor(step.status)}`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <IconComponent className="w-6 h-6" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {step.title}
                      </h3>
                      {step.status !== 'completed' && (
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(step.priority)}`}>
                            {step.priority} priority
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {step.estimatedTime}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {step.description}
                    </p>
                  </div>

                  {/* Only show action button for the current step, show completed badge for completed steps */}
                  {isCurrent && (
                    <button
                      onClick={() => router.push(step.route)}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{step.action}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  {isCompleted && (
                    <span className="flex items-center  space-x-2 px-4 py-2 rounded-lg bg-green-100 text-green-700 font-medium">
                      Completed
                    </span>
                  )}
                </div>

                {/* Connection Line */}
                {!isLast && (
                  <div className="absolute left-6 top-16 w-px h-4 bg-gray-200 dark:bg-gray-600"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
     {/*  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Project Overview
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View complete project details, timeline, and current status.
          </p>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Project
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Project Analytics
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Access project performance metrics and analytics dashboard.
          </p>
          <button
            onClick={() => router.push('/analytics')}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View Analytics
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Share2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Collaborate
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Share project with team members and stakeholders.
          </p>
          <button
            onClick={() => router.push(`/projects/${projectId}/team`)}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Manage Team
          </button>
        </div>
      </div> */}
    </DashboardLayout>
  );
};

export default ProjectSetupPage; 