'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  AlertTriangle,
  Activity,
  Calendar,
  DollarSign,
  FileText,
  Info,
  Layers,
  Rocket,
  Target,
  Users,
  GitBranch,
} from 'lucide-react';
import axios from 'axios';
import { ProjectSetup } from '@/types/project';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { TabRow } from '@/components/ui/tab-row';
import { FormSection, InfoGrid, StatusBadge } from '@/components/ui/form-shell';
import { humanize, projectStatusTone } from '@/lib/status-tone';
import {
  ProjectSetupRail,
  type SetupStep,
  type SetupStepStatus,
} from '@/components/projects/ProjectSetupRail';
import { ProjectSetupStepPanel } from '@/components/projects/ProjectSetupStepPanel';

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

/**
 * The setup sequence, in order. `id` keys into `ProjectSetup`, whose booleans
 * are what the API stores; everything else is presentation.
 */
const STEP_DEFS: Omit<SetupStep, 'status' | 'route'>[] = [
  {
    id: 'wbs',
    title: 'Work Breakdown Structure',
    shortLabel: 'WBS',
    description: 'Define project phases, deliverables, and work packages.',
    summary: 'Phases, deliverables and work packages are defined.',
    unlocks: 'The WBS is the spine of the plan — the schedule and budget both hang off it.',
    action: 'Create WBS',
    icon: Layers,
    estimatedTime: '30–60 min',
  },
  {
    id: 'schedule',
    title: 'Project Scheduling',
    shortLabel: 'Schedule',
    description: 'Create the timeline, milestones, and task dependencies.',
    summary: 'Timeline, milestones and dependencies are in place.',
    unlocks: 'Sequence the work packages and set the milestone dates.',
    action: 'Build Schedule',
    icon: Calendar,
    estimatedTime: '45–90 min',
  },
  {
    id: 'budget',
    title: 'Budget Planning',
    shortLabel: 'Budget',
    description: 'Allocate budget across work packages and set cost controls.',
    summary: 'Budget is allocated across work packages with cost controls set.',
    unlocks: 'Distribute the approved budget over the scheduled work.',
    action: 'Setup Budget',
    icon: DollarSign,
    estimatedTime: '30–45 min',
  },
  {
    id: 'team',
    title: 'Team & Resources',
    shortLabel: 'Team',
    description: 'Assign team members, define roles, and allocate resources.',
    summary: 'Team members are assigned and resources allocated.',
    unlocks: 'Staff the work packages and confirm resource availability.',
    action: 'Assign Team',
    icon: Users,
    estimatedTime: '20–30 min',
  },
  {
    id: 'risk',
    title: 'Risk Management',
    shortLabel: 'Risk',
    description: 'Identify, assess, and plan mitigation for project risks.',
    summary: 'Risks are registered with owners and mitigation plans.',
    unlocks: 'Log the known risks and assign an owner to each.',
    action: 'Assess Risks',
    icon: AlertTriangle,
    estimatedTime: '45–60 min',
  },
  {
    id: 'baseline',
    title: 'Project Baseline',
    shortLabel: 'Baseline',
    description: 'Freeze scope, schedule, and cost as the tracking baseline.',
    summary: 'Scope, schedule and cost are baselined for variance tracking.',
    unlocks: 'Once the plan is stable, baseline it so progress can be measured against it.',
    action: 'Compare Baseline',
    icon: Target,
    estimatedTime: '15–20 min',
  },
  {
    id: 'execution',
    title: 'Request Approvals',
    shortLabel: 'Approvals',
    description: 'Request the approvals required before execution can begin.',
    summary: 'Approvals have been requested.',
    unlocks: 'Submit the completed plan for sign-off.',
    action: 'Request Approvals',
    icon: Activity,
    estimatedTime: 'Ongoing',
  },
];

type Tab = 'pipeline' | 'overview';

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
  const [tab, setTab] = useState<Tab>('pipeline');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      <DashboardLayout
        title="Project Setup"
        backHref="/projects"
        backLabel="Back to Projects"
        onViewChange={setActiveView}
        activeView={activeView}
      >
        <div className="flex items-center justify-center min-h-96">
          <Spinner size={32} className="text-bright-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout
        title="Project Setup"
        backHref="/projects"
        backLabel="Back to Projects"
        onViewChange={setActiveView}
        activeView={activeView}
      >
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-ink mb-2">
            Project Not Found
          </h2>
          <p className="text-muted mb-6">
            The requested project could not be found or you don&apos;t have access to it.
          </p>
          <button
            onClick={() => router.push('/projects')}
            className="inline-flex h-[38px] items-center rounded-[10px] bg-bright px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-bright-deep"
          >
            Back to Projects
          </button>
        </div>
      </DashboardLayout>
    );
  }

  /*
   * A step is completed when the API says so. The first step that is not
   * completed is the current one; everything after it is pending. This mirrors
   * the previous `getStepStatus`, which walked the same `stepOrder` array.
   */
  const firstIncomplete = STEP_DEFS.findIndex(
    (def) => !setup?.[def.id as keyof ProjectSetup],
  );
  const steps: SetupStep[] = STEP_DEFS.map((def, i) => {
    const completed = Boolean(setup?.[def.id as keyof ProjectSetup]);
    const status: SetupStepStatus = completed
      ? 'completed'
      : i === firstIncomplete
        ? 'current'
        : 'pending';
    return {
      ...def,
      status,
      // The first step in the flow has no predecessor to come back from.
      route:
        def.id === 'wbs'
          ? `/projects/${projectId}/wbs?from=setup`
          : `/projects/${projectId}/${def.id === 'execution' ? 'approval' : def.id}?from=previous`,
    };
  });

  const currentIdx = firstIncomplete < 0 ? steps.length - 1 : firstIncomplete;
  const allComplete = firstIncomplete < 0;
  const completedCount = steps.filter((s) => s.status === 'completed').length;

  // Default the reviewed step to wherever the workflow currently sits.
  const activeId = selectedId ?? steps[currentIdx].id;
  const activeIdx = steps.findIndex((s) => s.id === activeId);
  const activeStep = steps[activeIdx] ?? steps[currentIdx];
  const isLocked = activeIdx > currentIdx;

  const overview: [string, React.ReactNode][] = [
    ['Project code', project.project_code],
    [
      'Status',
      <StatusBadge
        key="status"
        label={humanize(project.status)}
        tone={projectStatusTone(project.status)}
      />,
    ],
    ['Budget', `OMR ${project.budget_amount.toLocaleString()}`],
    ['Progress', `${project.progress_percentage ?? 0}%`],
    ['Start date', new Date(project.start_date).toLocaleDateString()],
    ['Planned finish', new Date(project.planned_end_date).toLocaleDateString()],
  ];

  return (
    <DashboardLayout
      title={project.name}
      subtitle="Project setup workflow"
      backHref="/projects"
      backLabel="Back to Projects"
      actions={
        <>
          <StatusBadge
            label={humanize(project.status)}
            tone={projectStatusTone(project.status)}
          />
          {allComplete && (
            <button
              type="button"
              onClick={handleExecutionStart}
              disabled={executionLoading}
              className="inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-bright px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-bright-deep disabled:opacity-60"
            >
              {executionLoading ? (
                <Spinner size={16} />
              ) : (
                <Rocket className="h-4 w-4" aria-hidden="true" />
              )}
              Start Execution
            </button>
          )}
        </>
      }
      meta={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <FileText size={14} aria-hidden="true" />
            {project.project_code}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <DollarSign size={14} aria-hidden="true" />
            OMR {project.budget_amount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} aria-hidden="true" />
            {new Date(project.start_date).toLocaleDateString()} –{' '}
            {new Date(project.planned_end_date).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers size={14} aria-hidden="true" />
            {completedCount} of {steps.length} setup steps complete
          </span>
        </div>
      }
      onViewChange={setActiveView}
      activeView={activeView}
    >
      <TabRow
        tabs={[
          {
            id: 'pipeline',
            label: 'Setup Pipeline',
            icon: <GitBranch className="h-4 w-4" />,
          },
          {
            id: 'overview',
            label: 'Overview',
            icon: <Info className="h-4 w-4" />,
          },
        ]}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === 'pipeline' ? (
        <div className="space-y-6">
          <ProjectSetupRail
            steps={steps}
            selectedId={activeId}
            onSelect={setSelectedId}
          />
          <ProjectSetupStepPanel
            step={activeStep}
            isLocked={isLocked}
            blockedBy={isLocked ? steps[currentIdx] : undefined}
          />
          {allComplete && (
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-success/30 bg-success-soft p-5">
              <div className="flex items-start gap-3">
                <Rocket
                  className="mt-0.5 h-5 w-5 shrink-0 text-success"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-[14px] font-semibold text-success">
                    Setup complete
                  </div>
                  <p className="mt-0.5 text-[13.5px] text-ink">
                    Every setup step is done. Starting execution moves the
                    project to pending approval.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExecutionStart}
                disabled={executionLoading}
                className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-[10px] bg-success px-5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {executionLoading ? <Spinner size={16} /> : null}
                Start Execution
              </button>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <FormSection title="Project">
            <InfoGrid rows={overview} />
            {project.description && (
              <div className="mt-5 border-t border-line-2 pt-4">
                <div className="mb-1 text-[13px] text-muted">Description</div>
                <p className="whitespace-pre-line text-[13.5px] text-ink">
                  {project.description}
                </p>
              </div>
            )}
          </FormSection>
          <FormSection
            title="Setup checklist"
            description="The same steps as the pipeline, as a flat list."
          >
            <ul className="divide-y divide-line-2">
              {steps.map((step) => (
                <li
                  key={step.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-[13.5px] text-ink">{step.title}</span>
                  <StatusBadge
                    label={
                      step.status === 'completed'
                        ? 'Completed'
                        : step.status === 'current'
                          ? 'In progress'
                          : 'Pending'
                    }
                    tone={
                      step.status === 'completed'
                        ? 'success'
                        : step.status === 'current'
                          ? 'brand'
                          : 'neutral'
                    }
                  />
                </li>
              ))}
            </ul>
          </FormSection>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProjectSetupPage;
