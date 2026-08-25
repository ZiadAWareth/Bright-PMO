"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ProjectsTab from "@/components/ProjectsTab";
import { Project } from "@/types/project";
import AssignMitigationModal from "@/components/AssignMitigationModal";
import ConfirmationModal from "@/components/ui/confirmation-modal";

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

const EditModal = ({
  isOpen,
  onClose,
  onSuccess,
  risk,
  users,
  projects,
}: EditModalProps) => {
  const [editForm, setEditForm] = useState<Partial<Risk>>(risk);
  const [isEditing, setIsEditing] = useState(false);
  const approvalStatusOptions = ["Pending", "Approved for Mitigation"];
  const statusOptions = ["Open", "Mitigation in Progress", "Closed"];
  useEffect(() => {
    setEditForm(risk);
  }, [risk]);

  const calculateRiskScore = (impact: string, probability: string): number => {
    const impactValue = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
    const probabilityValue =
      probability === "high" ? 3 : probability === "medium" ? 2 : 1;
    return impactValue * probabilityValue;
  };

  const calculateRiskLevel = (score: number): string => {
    if (score >= 7) return "high";
    if (score >= 4) return "medium";
    return "low";
  };
  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "approvalStatus") {
        return {
          ...updated,
          approvalStatus: value,
          currentStatus:
            value === "Approved for Mitigation"
              ? prev.currentStatus || "Open"
              : "Open",
        };
      }
      return updated;
    });
  };
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!editForm.name || !editForm.name.trim()) {
      toast.error("Risk name is required");
      return;
    }
    
    if (!editForm.category || !editForm.category.trim()) {
      toast.error("Category is required");
      return;
    }
    
    setIsEditing(true);
    try {
      // Calculate final values
      const finalImpact = editForm.impact ?? risk.impact;
      const finalProbability = editForm.probability ?? risk.probability;
      const finalRiskScore = calculateRiskScore(finalImpact, finalProbability);
      const finalRiskLevel = calculateRiskLevel(finalRiskScore);

      await axios.patch(
        `/api/risks/${risk.risk_id}`,
        {
          project_id: editForm.project_id ?? risk.project_id,
          name: editForm.name.trim(),
          description: editForm.description ?? risk.description,
          identified_date: editForm.identified_date ?? risk.identified_date,
          impact: finalImpact,
          probability: finalProbability,
          status: editForm.status ?? risk.status,
          owner_id: editForm.owner_id ?? risk.owner_id,
          approvalStatus: editForm.approvalStatus ?? risk.approvalStatus,
          currentStatus: editForm.currentStatus ?? risk.currentStatus,
          riskScore: Number(finalRiskScore),
          riskLevel: finalRiskLevel,
          category: editForm.category ?? risk.category,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Risk updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update risk");
    } finally {
      setIsEditing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Edit size={20} className="text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Edit Risk</h2>
          </div>
          {/* <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
                <X size={20} />
            </button> */}
        </div>
        {/* Form */}
        <form onSubmit={handleEditSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Risk Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                value={editForm.name || ""}
                onChange={handleEditChange}
                required
                autoFocus={false}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter risk name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                id="category"
                name="category"
                value={editForm.category || ""}
                onChange={handleEditChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter category"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={editForm.description || ""}
              onChange={handleEditChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Describe the risk"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Impact
              </label>
              <select
                id="impact"
                name="impact"
                value={editForm.impact || "medium"}
                onChange={handleEditChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probability
              </label>
              <select
                id="probability"
                name="probability"
                value={editForm.probability || "medium"}
                onChange={handleEditChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approval Status
              </label>
              <select
                id="approvalStatus"
                name="approvalStatus"
                value={editForm.approvalStatus || ""}
                onChange={handleEditChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {approvalStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Status
              </label>
              <select
                id="currentStatus"
                name="currentStatus"
                value={editForm.currentStatus || "Open"}
                onChange={handleEditChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={editForm.approvalStatus !== "Approved for Mitigation"}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {editForm.approvalStatus !== "Approved for Mitigation" && (
                <span className="text-xs text-gray-500">
                  Current Status can only be changed after approval.
                </span>
              )}
            </div>{" "}
          </div>

          {/* Calculated Risk Score Display */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Calculated Risk Score:
              </span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {calculateRiskScore(
                  editForm.impact || risk.impact,
                  editForm.probability || risk.probability
                )}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Based on Impact × Probability (High=3, Medium=2, Low=1)
            </p>
          </div>
          {/* Actions */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              className="px-4 py-2 rounded-md text-gray-700 font-medium hover:bg-gray-100"
              onClick={onClose}
              disabled={isEditing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-md bg-orange-500 text-white font-semibold hover:bg-orange-600 flex items-center gap-2 disabled:opacity-60"
              disabled={isEditing}
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

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
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mitigation Plans
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {mitigations.length} mitigations
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus size={16} />
          <span>Add Mitigation</span>
        </button>
      </div>
      <div className="space-y-4">
        {mitigations.map((mit) => (
          <div
            key={mit.mitigation_id}
            className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 flex justify-between items-start hover:border-orange-500 dark:hover:border-orange-500 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {mit.description}
                </h4>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {mit.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {mit.action_plan}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
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
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Edit Mitigation"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => onDelete(mit)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:text-red-400 dark:hover:bg-red-900 rounded-lg transition-colors"
                title="Delete Mitigation"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {(!mitigations || mitigations.length === 0) && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderTree size={32} className="text-orange-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Mitigation Plans Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              There are no mitigation plans to display.
            </p>
            <button
              onClick={onAdd}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors mx-auto"
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
  const [risk, setRisk] = useState<Risk | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [riskId, setRiskId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMitigationModalOpen, setIsMitigationModalOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [mitigationToDelete, setMitigationToDelete] =
    useState<RiskMitigation | null>(null);
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
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    // Refresh risk data
    if (riskId) {
      axios
        .get(`/api/risks/${riskId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        .then((res) => {
          setRisk(res.data);
          toast.success("Risk updated successfully");
        })
        .catch(() => {});
    }
  };

  const handleDeleteClick = () => setIsDeleteModalOpen(true);
  const handleDeleteConfirm = async () => {
    if (!risk) return;
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
      setIsDeleteModalOpen(false);
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
    setMitigationToDelete(mit);
  };

  const confirmDeleteMitigation = async () => {
    if (!mitigationToDelete) return;
    try {
      await axios.delete(
        `/api/riskMitigations/${mitigationToDelete.mitigation_id}`,
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
    } finally {
      setMitigationToDelete(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!risk) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Risk not found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The risk you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
    <DashboardLayout>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
        <button
          onClick={() => router.push("/risk")}
          className="hover:text-orange-600 transition-colors"
        >
          Risks
        </button>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{risk.name}</span>
      </div>

      {/* Risk Header */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {risk.name}
              </h1>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {risk.category}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                {getProjectName(risk.project_id)}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              {risk.description}
            </p>{" "}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Project
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {getProjectName(risk.project_id)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Owner
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {getOwnerName(risk.owner_id)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Severity
              </span>
              <span className="text-lg font-bold text-orange-600">
                {severity}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Risk Exposure
              </span>
              <span className="text-lg font-bold text-blue-600">
                {exposure}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Action Buttons (bottom right) */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Category: {risk.category}
            </span>
            <span className="text-sm text-gray-500">
              Identified:{" "}
              {new Date(risk.identified_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="text-sm text-gray-500">
              • Owner: {getOwnerName(risk.owner_id)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEditClick}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-colors bg-orange-600 text-white hover:bg-orange-700"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-colors bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mb-6">
        <div className="flex items-center space-x-1 p-1 overflow-x-auto whitespace-nowrap">
          {riskTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-orange-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Risk Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Risk Details */}
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Risk Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {risk.category}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Impact
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {risk.impact}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Probability
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {risk.probability}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Score
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {risk.riskScore}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Status
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {risk.currentStatus}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Approval Status
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {risk.approvalStatus}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {risk.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Quick Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Severity
                    </span>
                    <span className="text-sm font-medium text-orange-600">
                      {severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Risk Exposure
                    </span>
                    <span className="text-sm font-medium text-blue-600">
                      {exposure}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        risk={risk}
        users={users}
        projects={projects}
      />

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen && !!risk}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Risk"
        message={`Are you sure you want to delete ${risk?.name}? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        type="danger"
      />

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

      <ConfirmationModal
        isOpen={!!mitigationToDelete}
        onClose={() => setMitigationToDelete(null)}
        onConfirm={confirmDeleteMitigation}
        title="Delete Mitigation"
        message={`Are you sure you want to delete '${mitigationToDelete?.description}'? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </DashboardLayout>
  );
};

export default RiskDetailPage;
