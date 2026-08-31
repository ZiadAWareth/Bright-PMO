"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FormSection, InfoGrid, StatusBadge } from "@/components/ui/form-shell";
import { riskLevelTone, riskStatusTone } from "@/lib/status-tone";
import {
  ArrowLeft,
  Edit,
  BarChart3,
  FolderTree,
  Trash2,
  X,
  Save,
  Plus,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import ProjectsTab from "@/components/ProjectsTab";
import { Project } from "@/types/project";
import AssignMitigationModal from "@/components/AssignMitigationModal";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Dropdown } from "@/components/ui/dropdown";
import { TabRow } from "@/components/ui/tab-row";

interface Risk {
  risk_id: number;
  project_id: number;
  name: string;
  description: string;
  category: string;
  identified_date: string;
  impact: string;
  probability: string;
  riskLevel: string;
  status: string;
  owner_id: number;
  approvalStatus: string;
  currentStatus: string;
  riskScore: number;
  mitigations: RiskMitigation[];
}

interface User {
  user_id: number;
  account: {
    first_name: string;
    last_name: string;
    email: string;
  };
  email: string;
  role?: { name?: string };
}

interface RiskMitigation {
  mitigation_id: number;
  risk_id: number;
  description: string;
  action_plan: string;
  start_date: string;
  due_date: string;
  status: string;
  responsible_id: number;
  assigned_to: number;
}

interface TaskOption {
  task_id: number;
  name: string;
}

const probabilityWeight = (prob: string) => {
  switch (prob.toLowerCase()) {
    case "high":
      return 1;
    case "medium":
      return 0.5;
    case "low":
      return 0.2;
    default:
      return 0.5;
  }
};

const getSeverity = (impact: string, probability: string, score: number) => {
  if (score >= 7 || (impact === "high" && probability === "high"))
    return "Critical";
  if (score >= 4 || impact === "medium" || probability === "medium")
    return "Moderate";
  return "Low";
};

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  risk: Risk;
  users: User[];
  projects: Project[];
}

const MitigationsTab = ({
  mitigations = [],
  onAdd,
  onEdit,
  onDelete,
}: {
  mitigations?: RiskMitigation[];
  onAdd: () => void;
  onEdit: (mit: RiskMitigation) => void;
  onDelete: (mit: RiskMitigation) => void;
}) => (
  <div className="space-y-6">
    <div className="bg-surface border border-line rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-ink">
            Mitigation Plans
          </h3>
          <p className="text-sm text-muted mt-1">
            {mitigations.length} mitigations
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
        >
          <Plus size={16} />
          <span>Add Mitigation</span>
        </button>
      </div>
      <div className="space-y-4">
        {mitigations.map((mit) => (
          <div
            key={mit.mitigation_id}
            className="border border-line rounded-lg p-4 flex justify-between items-start hover:border-bright transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="text-lg font-medium text-ink">
                  {mit.description}
                </h4>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-info-soft text-info">
                  {mit.status}
                </span>
              </div>
              <p className="text-sm text-muted mb-2">
                {mit.action_plan}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted">
                <div>
                  Start:{" "}
                  {mit.start_date
                    ? new Date(mit.start_date).toISOString().split("T")[0]
                    : "-"}
                </div>
                <div>
                  Due:{" "}
                  {mit.due_date
                    ? new Date(mit.due_date).toISOString().split("T")[0]
                    : "-"}
                </div>
                <div>Assigned: {mit.assigned_to}</div>
                <div>Responsible: {mit.responsible_id}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 ml-4">
              <button
                onClick={() => onEdit(mit)}
                className="p-2 text-faint hover:text-muted hover:bg-surface-2 rounded-lg transition-colors"
                title="Edit Mitigation"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => onDelete(mit)}
                className="p-2 text-faint hover:text-danger hover:bg-danger-soft rounded-lg transition-colors"
                title="Delete Mitigation"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {(!mitigations || mitigations.length === 0) && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-bright-soft rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderTree size={32} className="text-bright" />
            </div>
            <h3 className="text-lg font-medium text-ink mb-2">
              No Mitigation Plans Found
            </h3>
            <p className="text-muted mb-4">
              There are no mitigation plans to display.
            </p>
            <button
              onClick={onAdd}
              className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors mx-auto"
            >
              <Plus size={16} />
              <span>Add Mitigation</span>
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

const RiskDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const confirm = useConfirm();
  const [risk, setRisk] = useState<Risk | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [riskId, setRiskId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMitigationModalOpen, setIsMitigationModalOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [mitigationToEdit, setMitigationToEdit] =
    useState<RiskMitigation | null>(null);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setRiskId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!riskId) return;
    setLoading(true);
    axios
      .get(`/api/risks/${riskId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setRisk(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [riskId]);

  useEffect(() => {
    axios
      .get("/api/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) =>
        setUsers(
          res.data.map((u: any) => ({
            ...u,
            email: u.account?.email || u.email || "",
          }))
        )
      )
      .catch(() => {});
    axios
      .get("/api/projects", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => setProjects(res.data))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!risk || !risk.project_id) return;
    // Fetch tasks for the project - same as working implementation
    axios
      .get(`/api/projects/${risk.project_id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((projectRes) => {
        setTasks(projectRes.data.tasks || []);
      })
      .catch(() => setTasks([]));
  }, [risk]);

  const getOwnerName = (owner_id: number) => {
    const user = users.find((u) => u.user_id === owner_id);
    return user
      ? `${user.account.first_name} ${user.account.last_name}`
      : "Unknown";
  };
  const getProjectName = (project_id: number) => {
    const project = projects.find((p) => p.project_id === project_id);
    return project ? project.name : "Unknown";
  };

  const handleEditClick = () => {
    router.push(`/risk/${riskId}/edit`);
  };

  const handleDeleteClick = async () => {
    if (!risk) return;
    const ok = await confirm({
      title: "Delete risk?",
      message: `${risk.name} and its mitigation plans will be removed permanently.`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/api/risks/${risk.risk_id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Risk deleted successfully");
      router.push("/risk");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete risk");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddMitigation = () => {
    setMitigationToEdit(null);
    setIsMitigationModalOpen(true);
  };

  const handleEditMitigation = (mit: RiskMitigation) => {
    setMitigationToEdit(mit);
    setIsMitigationModalOpen(true);
  };

  const handleDeleteMitigation = async (mit: RiskMitigation) => {
    const ok = await confirm({
      title: "Delete mitigation plan?",
      message: `"${mit.description}" will be removed permanently.`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await axios.delete(
        `/api/riskMitigations/${mit.mitigation_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Mitigation plan deleted");
      // Refresh risk data
      if (riskId) {
        const res = await axios.get(`/api/risks/${riskId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setRisk(res.data);
      }
    } catch (err) {
      toast.error("Failed to delete mitigation");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <Spinner size={48} className="text-bright-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!risk) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-ink mb-2">
            Risk not found
          </h3>
          <p className="text-muted mb-4">
            The risk you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Quantitative analysis
  const severity = getSeverity(risk.impact, risk.probability, risk.riskScore);
  const exposure = (
    risk.riskScore * probabilityWeight(risk.probability)
  ).toFixed(2);

  const identificationRows: [string, React.ReactNode][] = [
    ["Project", getProjectName(risk.project_id)],
    ["Owner", getOwnerName(risk.owner_id)],
    ["Category", <StatusBadge key="category" label={risk.category} tone="info" />],
    [
      "Identified",
      new Date(risk.identified_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    ],
    [
      "Current Status",
      <StatusBadge
        key="current"
        label={risk.currentStatus}
        tone={riskStatusTone(risk.currentStatus)}
      />,
    ],
    [
      "Approval Status",
      <StatusBadge
        key="approval"
        label={risk.approvalStatus}
        tone={risk.approvalStatus === "Approved for Mitigation" ? "success" : "warning"}
      />,
    ],
  ];

  const assessmentRows: [string, React.ReactNode][] = [
    [
      "Impact",
      <StatusBadge key="impact" label={risk.impact} tone={riskLevelTone(risk.impact)} />,
    ],
    [
      "Probability",
      <StatusBadge
        key="probability"
        label={risk.probability}
        tone={riskLevelTone(risk.probability)}
      />,
    ],
    ["Score", <span key="score" className="tabular-nums">{risk.riskScore}</span>],
    [
      "Severity",
      <StatusBadge key="severity" label={severity} tone={riskLevelTone(severity)} />,
    ],
    ["Risk Exposure", <span key="exposure" className="tabular-nums">{exposure}</span>],
    ["Mitigations", <span key="mitigations" className="tabular-nums">{risk.mitigations?.length ?? 0}</span>],
  ];

  // Tabs (Overview, Projects, Mitigations)
  const riskTabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { id: "projects", label: "Projects", icon: <FolderTree size={16} /> },
    {
      id: "mitigations",
      label: "Mitigations",
      icon: <FolderTree size={16} />,
    },
  ];

  return (
    <DashboardLayout
      title={risk.name}
      subtitle={risk.description}
      backHref="/risk"
      backLabel="Back to Risks"
      actions={
        <>
          <button
            onClick={handleEditClick}
            className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-line px-4 text-[13.5px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Edit size={16} aria-hidden="true" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleDeleteClick}
            className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-line px-4 text-[13.5px] font-semibold text-muted transition-colors hover:bg-danger-soft hover:border-danger hover:text-danger"
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>Delete</span>
          </button>
        </>
      }
    >
      <TabRow tabs={riskTabs} value={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <FormSection title="Risk Information">
              <InfoGrid rows={identificationRows} />
            </FormSection>

            <FormSection
              title="Assessment"
              description="Impact and probability drive the score; severity and exposure are derived from it."
            >
              <InfoGrid rows={assessmentRows} />
            </FormSection>

            {risk.description && (
              <FormSection title="Description">
                <p className="whitespace-pre-line text-[13.5px] text-ink">
                  {risk.description}
                </p>
              </FormSection>
            )}
          </div>
        )}
        {activeTab === "projects" && risk && (
          <ProjectsTab
            projects={(() => {
              const project = projects.find(
                (p) => p.project_id === risk.project_id
              );
              return project ? [project] : [];
            })()}
            activeView={"admin"}
            projectCount={1}
          />
        )}
        {activeTab === "mitigations" && risk && (
          <MitigationsTab
            mitigations={risk.mitigations ?? []}
            onAdd={handleAddMitigation}
            onEdit={handleEditMitigation}
            onDelete={handleDeleteMitigation}
          />
        )}
      </div>



      {/* Assign Mitigation Modal */}
      <AssignMitigationModal
        isOpen={isMitigationModalOpen}
        onClose={() => setIsMitigationModalOpen(false)}
        onSuccess={async () => {
          setIsMitigationModalOpen(false);
          setMitigationToEdit(null);
          // Refresh risk data
          if (riskId) {
            const res = await axios.get(`/api/risks/${riskId}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            });
            setRisk(res.data);
          }
        }}
        riskId={risk?.risk_id || 0}
        users={users}
        tasks={tasks}
        mitigation={mitigationToEdit || undefined}
      />

    </DashboardLayout>
  );
};

export default RiskDetailPage;
