"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Target,
  Shield,
  AlertTriangle,
  Building,
  Briefcase,
  Settings,
  Upload,
  Eye,
  Plus,
  Minus,
  Info,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Globe,
  Layers,
  BarChart3,
  TrendingUp,
  BookOpen,
  Zap,
  Trash2,
  X,
  UserPlus,
} from "lucide-react";
import { ProjectType } from "@/types/project";
import axios from "axios";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { SearchableDropdown } from "@/components/form/SearchableDropdown";

interface ProjectFormData {
  // Basic Information
  name: string;
  description: string;
  longDescription: string;
  projectCode: string;
  client: string;
  location: string;

  // Strategic Information
  objectives: string[];
  successCriteria: string[];
  businessJustification: string;
  expectedROI: number;
  strategicValue: "high" | "medium" | "low";
  marketImpact: string;

  // Structure & Portfolio
  portfolio: number;
  epsLevel: number;
  methodology: string;
  // template: string;

  // Timeline & Budget
  startDate: string;
  mustFinishByDate: string;
  calendarType: "5-day" | "6-day" | "7-day" | "custom";
  customOffDays: string[];
  estimatedDuration: number; // in working days
  estimatedBudget: number;
  fundingSources: string[];

  // Team & Stakeholders
  projectManager: string;
  projectManagerId?: number; // Store the actual user ID
  teamMembers: TeamMember[];
  stakeholders: Stakeholder[];

  // Risk & Quality
  initialRisks: Risk[];
  qualityStandards: string[];
  complianceRequirements: string[];

  // Technical
  technicalRequirements: string[];
  technologyStack: string[];
  deliverables: string[];

  // Governance
  approvalWorkflow: string;
  governanceGates: string[];
  reportingFrequency: string;

  // Documents
  attachments: File[];

  // Metadata
  priority: "high" | "medium" | "low";
  department: string;
  category: string;
  tags: string[];

  type: ProjectType | "";
  size: number | "";
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  responsibility: string;
}

interface Stakeholder {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  influence: "high" | "medium" | "low";
  interest: "high" | "medium" | "low";
}

interface Risk {
  id: string;
  title: string;
  description: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
}

// interface Template {
//   id: string;
//   name: string;
//   description: string;
//   category: string;
//   complexity: "simple" | "standard" | "complex";
//   estimatedDuration: string;
//   requiredRoles: string[];
// }

interface Portfolio {
  portfolio_id: number;
  name: string;
}

interface EpsLevel {
  eps_id: number;
  name: string;
}

const ProjectCreatePage = () => {
  const router = useRouter();
  const [activeView, setActiveView] = useState("admin");
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    longDescription: "",
    projectCode: "",
    client: "",
    location: "",
    objectives: [""],
    successCriteria: [""],
    businessJustification: "",
    expectedROI: 0,
    strategicValue: "medium",
    marketImpact: "",
    portfolio: 0,
    epsLevel: 0,
    methodology: "",
    // template: "",
    startDate: "",
    mustFinishByDate: "",
    calendarType: "5-day",
    customOffDays: [],
    estimatedDuration: 0,
    estimatedBudget: 0,
    fundingSources: [""],
    projectManager: "",
    projectManagerId: undefined,
    teamMembers: [],
    stakeholders: [],
    initialRisks: [],
    qualityStandards: [""],
    complianceRequirements: [""],
    technicalRequirements: [""],
    technologyStack: [""],
    deliverables: [""],
    approvalWorkflow: "",
    governanceGates: [""],
    reportingFrequency: "",
    attachments: [],
    priority: "medium",
    department: "",
    category: "",
    tags: [],
    type: "",
    size: "",
  });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [epsLevels, setEpsLevels] = useState<EpsLevel[]>([]);
  const [availableUsers, setAvailableUsers] = useState<
    Array<{
      user_id: number;
      email: string;
      username: string;
      account: { first_name: string; last_name: string };
      role: { name: string; role_id: number };
    }>
  >([]);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showPMSelection, setShowPMSelection] = useState(false);
  const pmDropdownRef = useRef<HTMLDivElement>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLocation, setUploadLocation] = useState<{
    type: "project" | "wbs" | "task";
    id?: string;
  }>({ type: "project" });
  const [uploadDescription, setUploadDescription] = useState("");
  const [showDeleteDocumentModal, setShowDeleteDocumentModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const validationMessageRef = useRef<HTMLDivElement>(null);
  const { departments, loading: departmentsLoading } = useDepartments();
  const { employees, loading: employeesLoading } = useEmployees({ limit: 200 });
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
  const [pmSearchTerm, setPmSearchTerm] = useState("");
  const [pmSource, setPmSource] = useState<"pmo" | "hr">("pmo");
  const [pmoSearchTerm, setPmoSearchTerm] = useState("");
  const [pmEnsuringUser, setPmEnsuringUser] = useState(false);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const departmentDropdownRef = useRef<HTMLDivElement>(null);

  const filteredDepartments = useMemo(() => {
    if (!departmentSearchTerm.trim()) return departments;
    const term = departmentSearchTerm.toLowerCase();
    return departments.filter(
      (d: any) =>
        (d?.name ?? d?.label ?? "").toString().toLowerCase().includes(term)
    );
  }, [departments, departmentSearchTerm]);

  const selectedDepartmentName =
    formData.department &&
    (departments.find(
      (d: any) =>
        (d?.name ?? d?.id ?? d?.unit_id) === formData.department
    ) as any)?.name;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        departmentDropdownRef.current &&
        !departmentDropdownRef.current.contains(event.target as Node)
      ) {
        setDepartmentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getEmployeeFullName = (emp: any) =>
    [emp?.first_name, emp?.last_name].filter(Boolean).join(" ") ||
    [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") ||
    emp?.name ||
    "Unknown";

  const filteredEmployees = useMemo(() => {
    if (!pmSearchTerm.trim()) return employees;
    const term = pmSearchTerm.toLowerCase();
    return employees.filter((emp: any) => {
      const name = getEmployeeFullName(emp);
      const email = (emp?.email ?? "").toLowerCase();
      const position = (emp?.position_title ?? "").toLowerCase();
      return name.toLowerCase().includes(term) || email.includes(term) || position.includes(term);
    });
  }, [employees, pmSearchTerm]);

  // Helper function to calculate working days between two dates (inclusive)
  const calculateWorkingDays = (startDate: string, endDate: string, calendarType: "5-day" | "6-day" | "7-day" | "custom", customOffDays: string[] = []): number => {
    if (!startDate || !endDate) return 0;
    
    // Parse dates at midnight local time to avoid timezone issues
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    if (end < start) return 0;
    
    let workingDays = 0;
    const currentDate = new Date(start);
    
    // Count working days including both start and end dates
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
      
      if (calendarType === "7-day") {
        // All days are working days
        workingDays++;
      } else if (calendarType === "6-day") {
        // Friday is off (day 5)
        if (dayOfWeek !== 5) {
          workingDays++;
        }
      } else {
        // 5-day week: Friday (5) and Saturday (6) are off
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
          workingDays++;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  // Helper function to calculate end date from start date and duration
  const calculateEndDate = (startDate: string, duration: number, calendarType: "5-day" | "6-day" | "7-day" | "custom", customOffDays: string[] = []): string => {
    if (!startDate || duration <= 0) return "";
    
    // Parse date at midnight local time to avoid timezone issues
    const start = new Date(startDate + 'T00:00:00');
    
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let offDays: string[] = [];
    
    if (calendarType === "custom") {
      offDays = customOffDays;
    } else if (calendarType === "5-day") {
      offDays = ["Friday", "Saturday"];
    } else if (calendarType === "6-day") {
      offDays = ["Friday"];
    }
    
    let workingDaysAdded = 0;
    const currentDate = new Date(start);
    
    while (workingDaysAdded < duration) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayName = dayNames[currentDate.getDay()];
      
      if (!offDays.includes(dayName)) {
        workingDaysAdded++;
      }
    }
    
    return currentDate.toISOString().split('T')[0];
  };

  // Helper function to format currency with commas
  const formatCurrencyInput = (value: string): string => {
    // Remove all non-digit characters
    const numbersOnly = value.replace(/\D/g, '');
    // Add commas
    return numbersOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Helper function to parse currency string to number
  const parseCurrencyInput = (value: string): number => {
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  // Portfolio mapping (you can adjust these IDs based on your database)
  // const portfolioMapping: Record<string, number> = {
  //     "Real Estate Development": 1,
  //     Infrastructure: 2,
  //     "Commercial Development": 3,
  //     "Mixed Development": 4,
  //     "Technology & Innovation": 5,
  // };

  const methodologies = [
    "Waterfall",
    "Agile/Scrum",
    "Hybrid",
    "PMI Standard",
    "PRINCE2",
    "Custom",
  ];

  // const templates: Template[] = [
  //   {
  //     id: "construction",
  //     name: "Construction Project",
  //     description: "Standard construction project with regulatory compliance",
  //     category: "Construction",
  //     complexity: "complex",
  //     estimatedDuration: "12-24 months",
  //     requiredRoles: ["Project Manager", "Site Engineer", "Quality Inspector"],
  //   },
  //   {
  //     id: "infrastructure",
  //     name: "Infrastructure Development",
  //     description: "Large-scale infrastructure project template",
  //     category: "Infrastructure",
  //     complexity: "complex",
  //     estimatedDuration: "18-36 months",
  //     requiredRoles: [
  //       "Program Manager",
  //       "Technical Lead",
  //       "Stakeholder Manager",
  //     ],
  //   },
  //   {
  //     id: "software",
  //     name: "Software Development",
  //     description: "Agile software development project",
  //     category: "Technology",
  //     complexity: "standard",
  //     estimatedDuration: "3-12 months",
  //     requiredRoles: ["Product Manager", "Tech Lead", "Scrum Master"],
  //   },
  //   {
  //     id: "research",
  //     name: "Research & Development",
  //     description: "R&D project with iterative approach",
  //     category: "Research",
  //     complexity: "simple",
  //     estimatedDuration: "6-18 months",
  //     requiredRoles: ["Research Lead", "Technical Specialist"],
  //   },
  // ];

  // Get role-specific steps
  const getRoleSpecificSteps = (role: string) => {
    const baseSteps = [
      { id: "basic", label: "Basic Info", icon: <FileText size={20} /> },
      { id: "team", label: "Team", icon: <Users size={20} /> },
      { id: "review", label: "Review", icon: <Eye size={20} /> },
    ];

    switch (role) {
      case "admin":
        return [
          // {
          //   id: "template",
          //   label: "Template",
          //   icon: <BookOpen size={20} />,
          // },
          {
            id: "basic",
            label: "Basic Info",
            icon: <FileText size={20} />,
          },
          {
            id: "structure",
            label: "Structure",
            icon: <Layers size={20} />,
          },
          { id: "team", label: "Team", icon: <Users size={20} /> },
          {
            id: "governance",
            label: "Governance",
            icon: <Shield size={20} />,
          },
          {
            id: "documents",
            label: "Documents",
            icon: <Upload size={20} />,
          },
          { id: "review", label: "Review", icon: <Eye size={20} /> },
        ];

      case "project-manager":
        return [
          {
            id: "template",
            label: "Template",
            icon: <BookOpen size={20} />,
          },
          {
            id: "basic",
            label: "Project Info",
            icon: <FileText size={20} />,
          },
          {
            id: "objectives",
            label: "Objectives",
            icon: <Target size={20} />,
          },
          {
            id: "team",
            label: "Team Building",
            icon: <Users size={20} />,
          },
          {
            id: "risk",
            label: "Risks",
            icon: <AlertTriangle size={20} />,
          },
          { id: "review", label: "Review", icon: <Eye size={20} /> },
        ];

      case "pmo":
        return [
          {
            id: "template",
            label: "Template",
            icon: <BookOpen size={20} />,
          },
          {
            id: "governance",
            label: "Governance",
            icon: <Shield size={20} />,
          },
          {
            id: "basic",
            label: "Project Info",
            icon: <FileText size={20} />,
          },
          {
            id: "alignment",
            label: "Alignment",
            icon: <Target size={20} />,
          },
          {
            id: "compliance",
            label: "Compliance",
            icon: <CheckCircle size={20} />,
          },
          {
            id: "approval",
            label: "Approval Flow",
            icon: <Settings size={20} />,
          },
          {
            id: "quality",
            label: "Quality Gates",
            icon: <Shield size={20} />,
          },
          { id: "review", label: "Review", icon: <Eye size={20} /> },
        ];

      case "technical":
        return [
          {
            id: "template",
            label: "Template",
            icon: <BookOpen size={20} />,
          },
          {
            id: "basic",
            label: "Project Info",
            icon: <FileText size={20} />,
          },
          {
            id: "technical",
            label: "Technical",
            icon: <Zap size={20} />,
          },
          {
            id: "deliverables",
            label: "Deliverables",
            icon: <CheckCircle size={20} />,
          },
          { id: "review", label: "Review", icon: <Eye size={20} /> },
        ];

      case "executive":
        return [
          {
            id: "strategic",
            label: "Strategic",
            icon: <TrendingUp size={20} />,
          },
          {
            id: "business",
            label: "Business Case",
            icon: <BarChart3 size={20} />,
          },
          {
            id: "resources",
            label: "Resources",
            icon: <Users size={20} />,
          },
          {
            id: "delegation",
            label: "Delegation",
            icon: <User size={20} />,
          },
          { id: "review", label: "Review", icon: <Eye size={20} /> },
        ];

      default:
        return baseSteps;
    }
  };

  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (formData.name) {
        setIsAutoSaving(true);
        // Simulate auto-save
        setTimeout(() => setIsAutoSaving(false), 1000);
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [formData]);

  // Helper function to validate and sanitize project size input
  const handleSizeChange = (value: string) => {
    // Allow empty string
    if (value === "") {
      setFormData((prev) => ({ ...prev, size: "" }));
      return;
    }

    // Parse the number
    const numValue = parseFloat(value);

    // Check if it's a valid number and non-negative
    if (!isNaN(numValue) && numValue >= 0) {
      // Round to 2 decimal places to avoid floating point issues
      const roundedValue = Math.round(numValue * 100) / 100;
      setFormData((prev) => ({ ...prev, size: roundedValue }));
    }
    // If invalid or negative, don't update the state (keep previous valid value)
  };

  // Generate project code
  const generateProjectCode = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `PRJ-${timestamp.toString().slice(-6)}-${random}`;
  };

  // Add/Remove functions for arrays
  const addArrayItem = (
    field: keyof ProjectFormData,
    defaultValue: any = ""
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as any[]), defaultValue],
    }));
  };

  const removeArrayItem = (field: keyof ProjectFormData, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as any[]).filter((_, i) => i !== index),
    }));
  };

  const updateArrayItem = (
    field: keyof ProjectFormData,
    index: number,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as any[]).map((item, i) =>
        i === index ? value : item
      ),
    }));
  };

  // Add user from database to team
  const addUserToTeam = (user: any) => {
    const newMember: TeamMember = {
      id: `user_${user.user_id}`,
      name: `${user.account.first_name} ${user.account.last_name}`,
      email: user.email,
      role: user.role.name,
      department: user.account.department || "",
      responsibility: "",
    };

    // Check if user is already added
    const isAlreadyAdded = formData.teamMembers.some(
      (member) => member.email === user.email
    );

    if (!isAlreadyAdded) {
      setFormData((prev) => ({
        ...prev,
        teamMembers: [...prev.teamMembers, newMember],
      }));
    }
  };

  // Assign project manager from database
  const assignProjectManager = (user: any) => {
    const fullName = `${user.account.first_name} ${user.account.last_name}`;

    // Create team member object for the PM
    const pmAsMember: TeamMember = {
      id: user.user_id.toString(),
      name: fullName,
      email: user.email,
      role: user.role.name,
      department: user.account.department || "",
      responsibility: "Project Manager - Team Lead",
    };

    setFormData((prev) => {
      // Remove any existing PM from team members (including previous PM)
      const filteredTeamMembers = prev.teamMembers.filter((member) => {
        // Remove if it's the current user being selected
        if (member.email === user.email) return false;

        // Remove if it's the previous PM (check by responsibility or if it was added as PM)
        if (member.responsibility === "Project Manager - Team Lead")
          return false;

        // Remove if the member matches the previous PM email/name
        if (
          prev.projectManager &&
          (member.name === prev.projectManager ||
            member.email === prev.projectManager)
        )
          return false;

        return true;
      });

      return {
        ...prev,
        projectManager: fullName,
        projectManagerId: user.user_id,
        // Add new PM as team lead
        teamMembers: [pmAsMember, ...filteredTeamMembers],
      };
    });
    setShowPMSelection(false);
  };

  const assignProjectManagerFromEmployee = async (emp: any) => {
    setPmEnsuringUser(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to assign a project manager from HR.");
        return;
      }
      const res = await fetch("/api/users/from-hr-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idp_user_id: emp?._id ?? emp?.id,
          email: emp?.email,
          first_name: emp?.first_name ?? emp?.firstName,
          last_name: emp?.last_name ?? emp?.lastName,
          department: emp?.department ?? "General",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to create PMO user from HR");
      }
      const user = await res.json();
      assignProjectManager({
        user_id: user.user_id,
        email: user.email,
        account: {
          first_name: user.account?.first_name ?? emp?.first_name ?? emp?.firstName,
          last_name: user.account?.last_name ?? emp?.last_name ?? emp?.lastName,
          department: user.account?.department ?? emp?.department ?? "",
        },
        role: { name: user.role?.name ?? "PJM" },
      });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to add project manager from HR.");
    } finally {
      setPmEnsuringUser(false);
      setShowPMSelection(false);
      setPmSearchTerm("");
    }
  };

  // Filter users based on search query - show all users if no search query
  const filteredUsers =
    userSearchQuery.trim() === ""
      ? availableUsers
      : availableUsers.filter((user) => {
          const fullName =
            `${user.account.first_name} ${user.account.last_name}`.toLowerCase();
          const email = user.email.toLowerCase();
          const role = user.role.name.toLowerCase();
          const searchLower = userSearchQuery.toLowerCase();

          return (
            fullName.includes(searchLower) ||
            email.includes(searchLower) ||
            role.includes(searchLower)
          );
        });

  // Filter users for Project Manager selection - PMO or PJM role
  const projectManagerUsers = availableUsers.filter(
    (user) => user.role?.name === "PJM" || user.role?.name === "PMO"
  );

  const filteredPmoUsers = useMemo(() => {
    if (!pmoSearchTerm.trim()) return projectManagerUsers;
    const term = pmoSearchTerm.toLowerCase();
    return projectManagerUsers.filter((user: any) => {
      const name = `${user.account?.first_name ?? ""} ${user.account?.last_name ?? ""}`.toLowerCase();
      const email = (user.email ?? "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [projectManagerUsers, pmoSearchTerm]);

  const handleFileSelect = (
    files: FileList | null,
    inputElement?: HTMLInputElement
  ) => {
    if (files && files.length > 0) {
      setUploadFiles((prev) => [...prev, ...Array.from(files)]);
      setShowUploadModal(true);
    }
  };

  // Validation functions for each step - ALL database fields are now required
  const validateStep = (
    stepId: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (stepId) {
      // case "template":
      //   if (!formData.template) {
      //     errors.push("Project template is required");
      //   }
      //   break;

      case "basic":
        if (!formData.name || !formData.name.trim()) {
          errors.push("Project name is required");
        }
        if (!formData.description || !formData.description.trim()) {
          errors.push("Project description is required");
        }
        if (!formData.client || !formData.client.trim()) {
          errors.push("Client is required");
        }
        if (!formData.location || !formData.location.trim()) {
          errors.push("Location is required");
        }
        if (!formData.startDate) {
          errors.push("Start date is required");
        }
        if (!formData.mustFinishByDate) {
          errors.push("Must finish by date (deadline) is required");
        }
        // Validate must finish by date against start date
        if (formData.startDate && formData.mustFinishByDate) {
          const startDate = new Date(formData.startDate);
          const mustFinishBy = new Date(formData.mustFinishByDate);
          if (mustFinishBy <= startDate) {
            errors.push("Must finish by date must be after start date");
          }
        }
        if (!formData.estimatedBudget || formData.estimatedBudget <= 0) {
          errors.push("Valid budget amount is required");
        }
        if (!formData.priority) {
          errors.push("Priority is required");
        }
        // Validate project size if provided
        if (formData.size !== "" && formData.size !== null) {
          const sizeValue = Number(formData.size);
          if (isNaN(sizeValue) || sizeValue < 0) {
            errors.push("Project size must be a positive number");
          }
        }
        break;

      case "structure":
        if (!formData.portfolio) {
          errors.push("Portfolio assignment is required");
        }
        if (!formData.epsLevel) {
          errors.push("EPS Level is required");
        }
        if (!formData.methodology) {
          errors.push("Methodology is required");
        }
        if (!formData.department || !formData.department.trim()) {
          errors.push("Department is required");
        }
        break;

      case "strategic":
        if (!formData.businessJustification)
          errors.push("Business justification is required");
        if (!formData.expectedROI && formData.expectedROI !== 0)
          errors.push("Expected ROI is required");
        if (!formData.strategicValue)
          errors.push("Strategic value is required");
        if (!formData.marketImpact) errors.push("Market impact is required");
        break;

      case "objectives":
        const validObjectives = formData.objectives.filter(
          (obj) => obj.trim() !== ""
        );
        const validCriteria = formData.successCriteria.filter(
          (criteria) => criteria.trim() !== ""
        );
        if (validObjectives.length === 0)
          errors.push("At least one project objective is required");
        if (validCriteria.length === 0)
          errors.push("At least one success criteria is required");
        break;

      case "team":
        if (!formData.projectManager || !formData.projectManager.trim()) {
          errors.push("Project manager is required");
        }
        // Check if team members have required fields
        const incompleteMembers = formData.teamMembers.filter(
          (member) =>
            !member.name || !member.name.trim() ||
            !member.email || !member.email.trim() ||
            !member.role || !member.role.trim() ||
            !member.department || !member.department.trim() ||
            !member.responsibility || !member.responsibility.trim()
        );
        if (incompleteMembers.length > 0) {
          errors.push(
            `${incompleteMembers.length} team member(s) have incomplete information (all fields required)`
          );
        }
        break;

      case "business":
        if (!formData.businessJustification)
          errors.push("Business justification is required");
        if (!formData.estimatedBudget || formData.estimatedBudget <= 0) {
          errors.push("Valid budget amount is required");
        }
        if (!formData.expectedROI && formData.expectedROI !== 0)
          errors.push("Expected ROI is required");
        if (!formData.marketImpact) errors.push("Market impact is required");
        break;

      case "technical":
        const validTechReqs = formData.technicalRequirements.filter(
          (req) => req.trim() !== ""
        );
        const validTechStack = formData.technologyStack.filter(
          (tech) => tech.trim() !== ""
        );
        if (validTechReqs.length === 0) {
          errors.push("At least one technical requirement is required");
        }
        if (validTechStack.length === 0) {
          errors.push("At least one technology in stack is required");
        }
        break;

      case "deliverables":
        const validDeliverables = formData.deliverables.filter(
          (del) => del.trim() !== ""
        );
        if (validDeliverables.length === 0) {
          errors.push("At least one deliverable is required");
        }
        break;

      case "governance":
        if (!formData.methodology) errors.push("Methodology is required");
        if (!formData.reportingFrequency)
          errors.push("Reporting frequency is required");
        const validGovGates = formData.governanceGates.filter(
          (gate) => gate.trim() !== ""
        );
        if (validGovGates.length === 0) {
          errors.push("At least one governance gate is required");
        }
        break;

      case "alignment":
        if (!formData.businessJustification)
          errors.push("Business justification is required");
        if (!formData.strategicValue)
          errors.push("Strategic value is required");
        break;

      case "compliance":
        const validQualityStandards = formData.qualityStandards.filter(
          (std) => std.trim() !== ""
        );
        const validComplianceReqs = formData.complianceRequirements.filter(
          (req) => req.trim() !== ""
        );
        if (validQualityStandards.length === 0) {
          errors.push("At least one quality standard is required");
        }
        if (validComplianceReqs.length === 0) {
          errors.push("At least one compliance requirement is required");
        }
        break;

      case "approval":
        if (!formData.approvalWorkflow)
          errors.push("Approval workflow is required");
        break;

      case "quality":
        const validQualityStandards2 = formData.qualityStandards.filter(
          (std) => std.trim() !== ""
        );
        if (validQualityStandards2.length === 0) {
          errors.push("At least one quality standard is required");
        }
        break;

      case "resources":
        if (!formData.estimatedBudget || formData.estimatedBudget <= 0) {
          errors.push("Valid budget amount is required");
        }
        break;

      case "delegation":
        if (!formData.projectManager)
          errors.push("Project manager assignment is required");
        break;

      // Review step - validate all critical fields for submission
      case "review":
        const reviewErrors = [];
        if (!formData.name) reviewErrors.push("Project name");
        if (!formData.description) reviewErrors.push("Project description");
        if (!formData.portfolio) reviewErrors.push("Portfolio assignment");
        if (!formData.epsLevel) reviewErrors.push("EPS Level");
        if (!formData.startDate) reviewErrors.push("Start date");
        if (!formData.mustFinishByDate) reviewErrors.push("Must finish by date");
        if (!formData.estimatedBudget || formData.estimatedBudget <= 0)
          reviewErrors.push("Valid budget amount");

        if (reviewErrors.length > 0) {
          errors.push(`Missing critical fields: ${reviewErrors.join(", ")}`);
        }
        break;

      default:
        break;
    }

    return { isValid: errors.length === 0, errors };
  };

  // Check if user can proceed to next step (for step navigation blocking)
  const canProceedToNextStep = () => {
    const steps = getRoleSpecificSteps(activeView);
    const currentStepData = steps[currentStep];
    const validation = validateStep(currentStepData.id);
    return validation.isValid;
  };

  // Navigation functions
  const nextStep = () => {
    const steps = getRoleSpecificSteps(activeView);
    const currentStepData = steps[currentStep];
    const validation = validateStep(currentStepData.id);

    // Always show validation errors when Next button is pressed
    setShowValidationErrors(true);

    if (!validation.isValid) {
      // Set validation message to show on page
      setValidationMessage(validation.errors);

      // Scroll to validation message after it renders
      setTimeout(() => {
        if (validationMessageRef.current) {
          console.log("Scrolling to validation message");
          validationMessageRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 200);

      return; // Don't proceed to next step
    }

    // Only proceed if validation passes
    setShowValidationErrors(false);
    setValidationMessage([]);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    // Reset validation errors when going back
    setShowValidationErrors(false);
    setValidationMessage([]);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    // Only allow going to previous steps or current step
    if (stepIndex <= currentStep) {
      // Reset validation errors when navigating to accessible steps
      setShowValidationErrors(false);
      setValidationMessage([]);
      setCurrentStep(stepIndex);
      return;
    }

    // Block access to future steps - show validation message
    setValidationMessage([
      `You must complete the current step before proceeding to ${
        getRoleSpecificSteps(activeView)[stepIndex].label
      }.`,
    ]);

    // Scroll to validation message
    setTimeout(() => {
      if (validationMessageRef.current) {
        console.log("Scrolling to validation message from goToStep");
        validationMessageRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }, 200);
  };

  // Form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      // Validate required fields
      if (
        !formData.name ||
        !formData.portfolio ||
        !formData.epsLevel ||
        !formData.startDate
      ) {
        alert(
          "Please fill in all required fields: Project Name, Portfolio, EPS Level, and Start Date"
        );
        setIsSubmitting(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        alert("Authentication token not found. Please log in.");
        setIsSubmitting(false);
        return;
      }

      // First, create the project
      const apiData = {
        name: formData.name,
        description: formData.description,
        client: formData.client,
        location: formData.location,
        start_date: formData.startDate,
        must_finish_by_date: formData.mustFinishByDate,
        budget_amount: formData.estimatedBudget,
        expected_roi: formData.expectedROI,
        eps_level_id: formData.epsLevel,
        portfolio_id: formData.portfolio,
        project_manager: formData.projectManager,
        project_manager_id: formData.projectManagerId,
        calendarType: formData.calendarType,
        customOffDays: formData.customOffDays,
        team_members: formData.teamMembers.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          department: member.department,
          responsibility: member.responsibility,
        })),
        objectives: formData.objectives.filter((obj) => obj.trim() !== ""),
        success_criteria: formData.successCriteria.filter(
          (criteria) => criteria.trim() !== ""
        ),
        business_justification: formData.businessJustification,
        strategic_value: formData.strategicValue,
        market_impact: formData.marketImpact,
        methodology: formData.methodology,
        type: formData.type,
        size: formData.size === "" ? null : formData.size,
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const result = await response.json();
      const projectId = result.project.project_id;

      // Then, upload files if any
      if (uploadFiles.length > 0) {
        console.log(
          `Uploading ${uploadFiles.length} files to project ${projectId}`
        );

        for (const file of uploadFiles) {
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append(
              "description",
              `Uploaded during project creation: ${file.name}`
            );
            // Upload to project level - no WBS ID needed
            formData.append("project_id", projectId.toString());

            const uploadResponse = await axios.post(
              "/api/documents/uploadFile",
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "multipart/form-data",
                },
              }
            );

            if (uploadResponse.status === 200) {
              console.log(`Successfully uploaded file ${file.name}`);
            }
          } catch (error) {
            console.warn(`Failed to upload file ${file.name}:`, error);

            // Fallback: create document record without file upload
            try {
              const documentData = {
                name: file.name,
                description: `Uploaded during project creation: ${file.name}`,
                file_path: `/uploads/projects/${projectId}/${file.name}`,
                file_type: file.type,
                size: file.size,
                uploaded_by: 1,
                project_id: projectId,
              };

              const docResponse = await fetch(
                `/api/projects/${projectId}/documents`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(documentData),
                }
              );

              if (docResponse.ok) {
                console.log(`Created document record for ${file.name}`);
              }
            } catch (fallbackError) {
              console.warn(
                `Failed to create document record for ${file.name}:`,
                fallbackError
              );
            }
          }
        }
      }

      // Set the created project data and show success modal
      setCreatedProject(result.project);
      setShowSuccessModal(true);
    } catch (error) {
      alert(
        `Error creating project: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch portfolios, EPS levels, and users from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          alert("Authentication token not found. Please log in.");
          return;
        }

        // Fetch available users
        const usersResponse = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setAvailableUsers(usersData);
        }

        // Fetch portfolios and EPS levels
        const [portfoliosResponse, epsLevelsResponse] = await Promise.all([
          fetch("/api/portfolios", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/eps", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (portfoliosResponse.ok) {
          const portfoliosData = await portfoliosResponse.json();
          setPortfolios(portfoliosData);
        }
        if (epsLevelsResponse.ok) {
          const epsData = await epsLevelsResponse.json();
          setEpsLevels(epsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to fetch data");
      }
    };

    fetchData();
  }, []);

  // Close PM dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pmDropdownRef.current &&
        !pmDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPMSelection(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const steps = getRoleSpecificSteps(activeView);
  const currentStepData = steps[currentStep];

  // Render step content
  const renderStepContent = () => {
    switch (currentStepData?.id) {
      // case "template":
      //   return (
      //     <div className="space-y-6">
      //       <div>
      //         <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
      //           Choose Project Template
      //         </h3>
      //         <p className="text-gray-600 dark:text-gray-400 mb-6">
      //           Select a template that best matches your project type to get
      //           pre-configured settings and workflows.
      //         </p>
      //       </div>

      //       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      //         {templates
      //           .filter((template) => {
      //             // Filter templates based on role
      //             if (activeView === "technical") {
      //               return ["software", "research"].includes(template.id);
      //             }
      //             if (activeView === "executive") {
      //               return template.complexity !== "simple";
      //             }
      //             return true;
      //           })
      //           .map((template) => (
      //             <div
      //               key={template.id}
      //               className={`border rounded-lg p-6 cursor-pointer transition-all ${
      //                 formData.template === template.id
      //                   ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
      //                   : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
      //               }`}
      //               onClick={() =>
      //                 setFormData((prev) => ({
      //                   ...prev,
      //                   template: template.id,
      //                 }))
      //               }
      //             >
      //               <div className="flex items-start justify-between mb-3">
      //                 <h4 className="font-medium text-gray-900 dark:text-gray-100">
      //                   {template.name}
      //                 </h4>
      //                 <span
      //                   className={`px-2 py-1 rounded-md text-xs font-medium ${
      //                     template.complexity === "complex"
      //                       ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      //                       : template.complexity === "standard"
      //                       ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      //                       : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      //                   }`}
      //                 >
      //                   {template.complexity}
      //                 </span>
      //               </div>
      //               <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
      //                 {template.description}
      //               </p>
      //               <div className="space-y-2 text-xs text-gray-500">
      //                 <div>Duration: {template.estimatedDuration}</div>
      //                 <div>Category: {template.category}</div>
      //                 <div>
      //                   Required Roles: {template.requiredRoles.join(", ")}
      //                 </div>
      //               </div>
      //             </div>
      //           ))}
      //       </div>

      //       <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      //         <div className="flex items-start space-x-3">
      //           <Info
      //             size={20}
      //             className="text-blue-600 mt-0.5 flex-shrink-0"
      //           />
      //           <div>
      //             <h4 className="font-medium text-blue-900 dark:text-blue-100">
      //               Custom Project
      //             </h4>
      //             <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
      //               Don't see a suitable template? You can create a custom
      //               project and configure all settings manually.
      //             </p>
      //             <button
      //               onClick={() =>
      //                 setFormData((prev) => ({
      //                   ...prev,
      //                   template: "custom",
      //                 }))
      //               }
      //               className={`mt-3 px-4 py-2 rounded-lg text-sm transition-colors ${
      //                 formData.template === "custom"
      //                   ? "bg-blue-600 text-white"
      //                   : "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700"
      //               }`}
      //             >
      //               Create Custom Project
      //             </button>
      //           </div>
      //         </div>
      //       </div>
      //     </div>
      //   );

      case "basic":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Basic Project Information
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Provide the essential information about your project.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }));
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: "" }));
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 ${
                    fieldErrors.name
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-slate-600 focus:ring-orange-500"
                  }`}
                  placeholder="Enter project name"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Project Code - Commented out as requested */}
              {/* 
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Project Code
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={formData.projectCode}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                projectCode: e.target.value,
                                            }))
                                        }
                                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="Auto-generated or manual"
                                    />
                                    {activeView === "admin" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    projectCode:
                                                        generateProjectCode(),
                                                }))
                                            }
                                            className="px-4 py-3 bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors"
                                        >
                                            Generate
                                        </button>
                                    )}
                                </div>
                            </div>
                            */}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client *
                </label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      client: e.target.value,
                    }));
                    if (fieldErrors.client) {
                      setFieldErrors((prev) => ({ ...prev, client: "" }));
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 ${
                    fieldErrors.client
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-slate-600 focus:ring-orange-500"
                  }`}
                  placeholder="Client name"
                />
                {fieldErrors.client && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.client}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }));
                    if (fieldErrors.location) {
                      setFieldErrors((prev) => ({ ...prev, location: "" }));
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 ${
                    fieldErrors.location
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-slate-600 focus:ring-orange-500"
                  }`}
                  placeholder="Project location"
                />
                {fieldErrors.location && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.location}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority *
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value as "high" | "medium" | "low",
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Working Days Calendar *
                </label>
                <select
                  value={formData.calendarType}
                  onChange={(e) => {
                    const newCalendarType = e.target.value as "5-day" | "6-day" | "7-day" | "custom";
                    setFormData((prev) => {
                      const updated = {
                        ...prev,
                        calendarType: newCalendarType,
                      };
                      // Recalculate duration if start date and mustFinishByDate exist
                      if (updated.startDate && updated.mustFinishByDate) {
                        updated.estimatedDuration = calculateWorkingDays(updated.startDate, updated.mustFinishByDate, newCalendarType, updated.customOffDays);
                      }
                      return updated;
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="5-day">5-Day Week (Fri-Sat Off)</option>
                  <option value="6-day">6-Day Week (Fri Off)</option>
                  <option value="7-day">7-Day Week (No Days Off)</option>
                  <option value="custom">Custom Off Days</option>
                </select>
                {formData.calendarType === "custom" ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Select your non-working days:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                        <label key={day} className="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                          <input
                            type="checkbox"
                            checked={formData.customOffDays.includes(day)}
                            onChange={(e) => {
                              setFormData((prev) => {
                                const updated = {
                                  ...prev,
                                  customOffDays: e.target.checked
                                    ? [...prev.customOffDays, day]
                                    : prev.customOffDays.filter((d) => d !== day),
                                };
                                // Recalculate duration if dates exist
                                if (updated.startDate && updated.mustFinishByDate) {
                                  updated.estimatedDuration = calculateWorkingDays(updated.startDate, updated.mustFinishByDate, "custom", updated.customOffDays);
                                }
                                return updated;
                              });
                            }}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {formData.customOffDays.length === 0
                        ? "All days are working days"
                        : `Non-working days: ${formData.customOffDays.join(", ")}`}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formData.calendarType === "5-day" && "Friday and Saturday are non-working days"}
                    {formData.calendarType === "6-day" && "Friday is a non-working day"}
                    {formData.calendarType === "7-day" && "All days are working days"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setFormData((prev) => {
                      const updated = {
                        ...prev,
                        startDate: newStartDate,
                      };
                      // Recalculate duration if mustFinishByDate exists
                      if (updated.mustFinishByDate) {
                        updated.estimatedDuration = calculateWorkingDays(newStartDate, updated.mustFinishByDate, updated.calendarType, updated.customOffDays);
                      }
                      return updated;
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Duration (Working Days)
                </label>
                <div className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100">
                  {formData.estimatedDuration > 0 ? (
                    <span className="flex items-center space-x-2">
                      <span className="font-semibold">{formData.estimatedDuration}</span>
                      <span>working days</span>
                      <span className="text-xs text-gray-500">
                        ({formData.calendarType} calendar)
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-500">Enter start date and deadline</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Automatically calculated from start date and deadline
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Must Finish By (Deadline) *
                </label>
                <input
                  type="date"
                  value={formData.mustFinishByDate}
                  onChange={(e) => {
                    const newMustFinishBy = e.target.value;
                    setFormData((prev) => {
                      const updated = {
                        ...prev,
                        mustFinishByDate: newMustFinishBy,
                      };
                      // Auto-calculate duration if start date is set
                      if (updated.startDate) {
                        updated.estimatedDuration = calculateWorkingDays(
                          updated.startDate, 
                          newMustFinishBy, 
                          updated.calendarType, 
                          updated.customOffDays
                        );
                      }
                      return updated;
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {formData.startDate && formData.mustFinishByDate && (
                  <div className="mt-1">
                    {new Date(formData.mustFinishByDate) > new Date(formData.startDate) ? (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        ✓ {formData.estimatedDuration} working days available for project completion
                      </p>
                    ) : (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        ⚠️ Deadline must be after start date
                      </p>
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Project deadline imposed by client or management
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Budget (OMR) *
                </label>
                <input
                  type="text"
                  value={formData.estimatedBudget ? formatCurrencyInput(formData.estimatedBudget.toString()) : ""}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      estimatedBudget: parseCurrencyInput(formatted),
                    }));
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                />
                {formData.estimatedBudget > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    OMR {formData.estimatedBudget.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }));
                    if (fieldErrors.description) {
                      setFieldErrors((prev) => ({ ...prev, description: "" }));
                    }
                  }}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 ${
                    fieldErrors.description
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-slate-600 focus:ring-orange-500"
                  }`}
                  placeholder="Brief project description"
                />
                {fieldErrors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.description}
                  </p>
                )}
              </div>

              {/* Detailed Description - Commented out as requested */}
              {/*
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Detailed Description *
                                </label>
                                <textarea
                                    value={formData.longDescription}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            longDescription: e.target.value,
                                        }))
                                    }
                                    rows={5}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Detailed project description, scope, and background"
                                />
                            </div>
                            */}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as ProjectType,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select type</option>
                  {Object.values(ProjectType).map((type) => (
                    <option key={type} value={type}>
                      {type
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Size (m²)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.size}
                  onChange={(e) => handleSizeChange(e.target.value)}
                  onKeyDown={(e) => {
                    // Prevent minus key, plus key, and 'e' (scientific notation)
                    if (
                      e.key === "-" ||
                      e.key === "+" ||
                      e.key === "e" ||
                      e.key === "E"
                    ) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    // Prevent pasting negative values
                    const paste = e.clipboardData.getData("text");
                    if (
                      paste.includes("-") ||
                      isNaN(Number(paste)) ||
                      Number(paste) < 0
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter size in m² (positive numbers only)"
                />
              </div>
            </div>
          </div>
        );

      case "strategic":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Strategic Information
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Define the strategic context and business value of this project.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Justification *
                </label>
                <textarea
                  value={formData.businessJustification}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      businessJustification: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Why is this project strategically important?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected ROI (%) *
                </label>
                <input
                  type="number"
                  value={formData.expectedROI}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expectedROI: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Strategic Value *
                </label>
                <select
                  value={formData.strategicValue}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      strategicValue: e.target.value as
                        | "high"
                        | "medium"
                        | "low",
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="low">Low Strategic Value</option>
                  <option value="medium">Medium Strategic Value</option>
                  <option value="high">High Strategic Value</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Market Impact *
                </label>
                <textarea
                  value={formData.marketImpact}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      marketImpact: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Expected impact on market position and competitiveness"
                />
              </div>
            </div>
          </div>
        );

      case "structure":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Project Structure
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Configure the organizational structure and methodology for this
                project.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Portfolio Assignment *
                </label>
                <select
                  value={formData.portfolio}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      portfolio: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Portfolio</option>
                  {portfolios.map((portfolio: Portfolio) => (
                    <option
                      key={portfolio.portfolio_id}
                      value={portfolio.portfolio_id}
                    >
                      {portfolio.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  EPS Level *
                </label>
                <select
                  value={formData.epsLevel}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      epsLevel: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select EPS Level</option>
                  {epsLevels.map((level: EpsLevel) => (
                    <option key={level.eps_id} value={level.eps_id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Methodology *
                </label>
                <select
                  value={formData.methodology}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      methodology: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Methodology</option>
                  {methodologies.map((methodology) => (
                    <option key={methodology} value={methodology}>
                      {methodology}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={departmentDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department *
                </label>
                <SearchableDropdown
                  value={formData.department}
                  searchTerm={departmentSearchTerm}
                  showDropdown={departmentDropdownOpen}
                  filteredItems={filteredDepartments}
                  displayValue={
                    departmentSearchTerm !== ""
                      ? departmentSearchTerm
                      : selectedDepartmentName ?? formData.department ?? ""
                  }
                  onSearchChange={(value) => {
                    setDepartmentSearchTerm(value);
                    setDepartmentDropdownOpen(true);
                  }}
                  onFocus={() => setDepartmentDropdownOpen(true)}
                  onSelect={(d: any) => {
                    setFormData((prev) => ({
                      ...prev,
                      department: d?.name ?? d?.id ?? d?.unit_id ?? "",
                    }));
                    setDepartmentDropdownOpen(false);
                    setDepartmentSearchTerm("");
                  }}
                  onClear={() => {
                    setFormData((prev) => ({ ...prev, department: "" }));
                    setDepartmentSearchTerm("");
                    setDepartmentDropdownOpen(true);
                  }}
                  renderItem={(d: any) =>
                    d?.name ?? d?.label ?? String(d?.id ?? d?.unit_id ?? "")
                  }
                  getItemKey={(d: any) =>
                    d?.id ?? d?.unit_id ?? d?.name ?? ""
                  }
                  placeholder={
                    departmentsLoading
                      ? "Loading departments..."
                      : "Search or select department"
                  }
                  disabled={departmentsLoading}
                  className="w-full px-4 py-3 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
        );

      case "objectives":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Project Objectives & Success Criteria
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Define clear objectives and measurable success criteria for your
                project.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Project Objectives
                </label>
                {formData.objectives.map((objective, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) =>
                        updateArrayItem("objectives", index, e.target.value)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder={`Objective ${index + 1}`}
                    />
                    {formData.objectives.length > 1 && (
                      <button
                        onClick={() => removeArrayItem("objectives", index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem("objectives", "")}
                  className="flex items-center space-x-2 px-3 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Objective</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Success Criteria
                </label>
                {formData.successCriteria.map((criteria, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={criteria}
                      onChange={(e) =>
                        updateArrayItem(
                          "successCriteria",
                          index,
                          e.target.value
                        )
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder={`Success criteria ${index + 1}`}
                    />
                    {formData.successCriteria.length > 1 && (
                      <button
                        onClick={() =>
                          removeArrayItem("successCriteria", index)
                        }
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem("successCriteria", "")}
                  className="flex items-center space-x-2 px-3 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Success Criteria</span>
                </button>
              </div>
            </div>
          </div>
        );

      case "team":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Team Building
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Define team structure and assign key roles for your project.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Manager {activeView !== "admin" && "*"}
                </label>
                <div className="relative" ref={pmDropdownRef}>
                  <div className="flex">
                    <input
                      type="text"
                      value={formData.projectManager}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          projectManager: e.target.value,
                        }))
                      }
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-l-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder={
                        activeView === "admin"
                          ? "Type name or select from database"
                          : "Request project manager (auto-assigned if empty)"
                      }
                      disabled={activeView === "executive"}
                    />
                    {activeView !== "executive" && (
                      <button
                        type="button"
                        onClick={() => setShowPMSelection(!showPMSelection)}
                        className="px-3 py-3 bg-orange-600 text-white border border-orange-600 rounded-r-lg hover:bg-orange-700 transition-colors"
                        title="Select from database"
                      >
                        <Users size={18} />
                      </button>
                    )}
                  </div>

                  {/* PM Selection Dropdown – From PMO (PMO/PJM users) or From HR (employees) */}
                  {showPMSelection && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-80 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex gap-1 mb-2">
                          <button
                            type="button"
                            onClick={() => setPmSource("pmo")}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              pmSource === "pmo"
                                ? "bg-orange-600 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            From PMO
                          </button>
                          <button
                            type="button"
                            onClick={() => setPmSource("hr")}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              pmSource === "hr"
                                ? "bg-orange-600 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            From HR
                          </button>
                        </div>
                        {pmSource === "pmo" ? (
                          <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={pmoSearchTerm}
                            onChange={(e) => setPmoSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder="Search by name, email, or position..."
                            value={pmSearchTerm}
                            onChange={(e) => setPmSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        )}
                      </div>
                      {pmSource === "pmo" ? (
                        filteredPmoUsers.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                            {pmoSearchTerm.trim()
                              ? "No PMO/PJM users match your search."
                              : availableUsers.length === 0
                              ? "Loading users..."
                              : "No PMO or PJM users available."}
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto">
                            {filteredPmoUsers.map((user: any) => (
                              <button
                                key={user.user_id}
                                type="button"
                                onClick={() => assignProjectManager(user)}
                                className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                              >
                                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                                  {user.account?.first_name?.charAt(0) ?? ""}
                                  {user.account?.last_name?.charAt(0) ?? ""}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {user.account?.first_name} {user.account?.last_name}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {user.email} • {user.role?.name ?? ""}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )
                      ) : pmEnsuringUser ? (
                        <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                          Creating PMO user...
                        </div>
                      ) : employeesLoading ? (
                        <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                          Loading employees...
                        </div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                          {pmSearchTerm.trim()
                            ? "No employees match your search."
                            : "No employees available."}
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto">
                          {filteredEmployees.map((emp: any) => {
                            const fullName = getEmployeeFullName(emp);
                            const initials = fullName.split(" ").map((s: string) => s.charAt(0)).join("").slice(0, 2).toUpperCase();
                            const subline = [emp?.email, emp?.position_title].filter(Boolean).join(" • ") || "—";
                            return (
                              <button
                                key={emp?._id ?? emp?.id ?? fullName}
                                type="button"
                                onClick={() => assignProjectManagerFromEmployee(emp)}
                                className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                              >
                                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                                  {initials || "?"}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {fullName}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {subline}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* <div className="flex items-end">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Team Size
                  </label>
                  <div className="flex items-center space-x-2 px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700">
                    <Users size={16} className="text-gray-500" />
                    <span className="text-gray-900 dark:text-gray-100">
                      {formData.teamMembers.length} member
                      {formData.teamMembers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div> */}
            </div>

            <div>
              {/* Add Member Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Team Members
                    </h4>
                    {formData.teamMembers.length > 0 && (
                      <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs font-medium rounded-full">
                        {formData.teamMembers.length} added
                      </span>
                    )}
                  </div>
                  {/* <button
                    type="button"
                    onClick={() => setShowUserSelection(!showUserSelection)}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <UserPlus className="mr-2" size={20} />
                    Add Team Members
                  </button> */}
                </div>

                {/* User Selection Panel */}
                {showUserSelection && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
                        Select Users from Database
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowUserSelection(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search users by name, email, or role..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    {/* Users List */}
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {filteredUsers.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                          {userSearchQuery.trim() !== ""
                            ? "No users found matching your search."
                            : availableUsers.length === 0
                            ? "Loading users..."
                            : "No users available."}
                        </p>
                      ) : (
                        filteredUsers.map((user) => {
                          const isAdded = formData.teamMembers.some(
                            (member) => member.email === user.email
                          );
                          return (
                            <div
                              key={user.user_id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                isAdded
                                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {user.account.first_name.charAt(0)}
                                    {user.account.last_name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {user.account.first_name}{" "}
                                      {user.account.last_name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {user.email} • {user.role.name}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => addUserToTeam(user)}
                                disabled={isAdded}
                                className={`px-3 py-1 rounded text-sm transition-colors ${
                                  isAdded
                                    ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                              >
                                {isAdded ? "Added" : "Add"}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Team Members List */}
              <div className="mt-8 space-y-4">
                {formData.teamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                          <User size={16} className="text-orange-600" />
                        </div>
                        <h5 className="font-medium text-gray-900 dark:text-gray-100">
                          Team Member #{index + 1}
                        </h5>
                      </div>
                      <button
                        onClick={() => removeArrayItem("teamMembers", index)}
                        className="flex items-center space-x-1 px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                        <span className="text-sm">Remove</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) =>
                            updateArrayItem("teamMembers", index, {
                              ...member,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) =>
                            updateArrayItem("teamMembers", index, {
                              ...member,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                          placeholder="email@company.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Role/Position *
                        </label>
                        {member.responsibility === "Project Manager - Team Lead" ? (
                          // Project Manager role is read-only
                          <div className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-slate-700/50 flex items-center justify-between">
                            <span>{member.role}</span>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                              Auto-assigned
                            </span>
                          </div>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              updateArrayItem("teamMembers", index, {
                                ...member,
                                role: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                          >
                            <option value="">Select role</option>
                            <option value="Developer">Developer</option>
                            <option value="Designer">Designer</option>
                            <option value="Business Analyst">
                              Business Analyst
                            </option>
                            <option value="QA Engineer">QA Engineer</option>
                            <option value="DevOps Engineer">
                              DevOps Engineer
                            </option>
                            <option value="Technical Lead">Technical Lead</option>
                            <option value="Scrum Master">Scrum Master</option>
                            <option value="Product Owner">Product Owner</option>
                            <option value="Architect">Architect</option>
                            <option value="Consultant">Consultant</option>
                            <option value="Other">Other</option>
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Department *
                        </label>
                        <select
                          value={member.department}
                          onChange={(e) =>
                            updateArrayItem("teamMembers", index, {
                              ...member,
                              department: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                        >
                          <option value="">Select department</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Design">Design</option>
                          <option value="Product">Product</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Sales">Sales</option>
                          <option value="Operations">Operations</option>
                          <option value="Finance">Finance</option>
                          <option value="HR">Human Resources</option>
                          <option value="IT">Information Technology</option>
                          <option value="Legal">Legal</option>
                          <option value="External">External Consultant</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Key Responsibilities *
                        </label>
                        <textarea
                          value={member.responsibility}
                          onChange={(e) =>
                            updateArrayItem("teamMembers", index, {
                              ...member,
                              responsibility: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors resize-none"
                          placeholder="Describe key responsibilities and tasks"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Member progress indicator */}
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Completion:</span>
                        <div className="flex items-center space-x-2">
                          {[member.name, member.email, member.role].filter(
                            Boolean
                          ).length === 3 ? (
                            <>
                              <CheckCircle
                                size={14}
                                className="text-green-500"
                              />
                              <span className="text-green-600 font-medium">
                                Complete
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock size={14} className="text-orange-500" />
                              <span className="text-orange-600">
                                {
                                  [
                                    member.name,
                                    member.email,
                                    member.role,
                                  ].filter(Boolean).length
                                }
                                /3 required fields
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* {formData.teamMembers.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                    <Users size={48} className="mx-auto text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No team members yet
                    </h4>
                    <p className="text-gray-500 mb-4">
                      Start building your project team by adding members
                    </p>
                    <button
                      onClick={() =>
                        addArrayItem("teamMembers", {
                          id: Date.now().toString(),
                          name: "",
                          email: "",
                          role: "",
                          department: "",
                          responsibility: "",
                        })
                      }
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Plus size={16} />
                      <span>Add First Member</span>
                    </button>
                  </div>
                )} */}
              </div>
            </div>
          </div>
        );

      case "business":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Business Case
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Develop the business justification and financial projections for
                this project.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Justification *
                </label>
                <textarea
                  value={formData.businessJustification}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      businessJustification: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Explain the business need and expected benefits..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Budget (OMR)
                </label>
                <input
                  type="number"
                  value={formData.estimatedBudget}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      estimatedBudget: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected ROI (%)
                </label>
                <input
                  type="number"
                  value={formData.expectedROI}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expectedROI: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Market Impact
                </label>
                <textarea
                  value={formData.marketImpact}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      marketImpact: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Expected impact on market position and competitive advantage..."
                />
              </div>
            </div>
          </div>
        );

      case "technical":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Technical Requirements
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Define technical specifications and technology requirements.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Technical Requirements
                </label>
                {formData.technicalRequirements.map((requirement, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={requirement}
                      onChange={(e) =>
                        updateArrayItem(
                          "technicalRequirements",
                          index,
                          e.target.value
                        )
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder={`Technical requirement ${index + 1}`}
                    />
                    {formData.technicalRequirements.length > 1 && (
                      <button
                        onClick={() =>
                          removeArrayItem("technicalRequirements", index)
                        }
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem("technicalRequirements", "")}
                  className="flex items-center space-x-2 px-3 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Requirement</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Technology Stack
                </label>
                {formData.technologyStack.map((tech, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={tech}
                      onChange={(e) =>
                        updateArrayItem(
                          "technologyStack",
                          index,
                          e.target.value
                        )
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder={`Technology ${index + 1}`}
                    />
                    {formData.technologyStack.length > 1 && (
                      <button
                        onClick={() =>
                          removeArrayItem("technologyStack", index)
                        }
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem("technologyStack", "")}
                  className="flex items-center space-x-2 px-3 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Technology</span>
                </button>
              </div>
            </div>
          </div>
        );

      case "deliverables":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Project Deliverables
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Define the key deliverables and outputs for this project.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Deliverables
              </label>
              {formData.deliverables.map((deliverable, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={deliverable}
                    onChange={(e) =>
                      updateArrayItem("deliverables", index, e.target.value)
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={`Deliverable ${index + 1}`}
                  />
                  {formData.deliverables.length > 1 && (
                    <button
                      onClick={() => removeArrayItem("deliverables", index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addArrayItem("deliverables", "")}
                className="flex items-center space-x-2 px-3 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
              >
                <Plus size={16} />
                <span>Add Deliverable</span>
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info
                  size={20}
                  className="text-blue-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Auto-Routing
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Technical projects are automatically routed to PMO for
                    approval and compliance review before activation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "governance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Governance Framework
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Configure governance structure and compliance requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Methodology *
                </label>
                <select
                  value={formData.methodology}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      methodology: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Methodology</option>
                  {methodologies.map((methodology) => (
                    <option key={methodology} value={methodology}>
                      {methodology}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reporting Frequency
                </label>
                <select
                  value={formData.reportingFrequency}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reportingFrequency: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Reporting Frequency</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Governance Gates
              </label>
              {formData.governanceGates.map((gate, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={gate}
                    onChange={(e) =>
                      updateArrayItem("governanceGates", index, e.target.value)
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={`Governance gate ${index + 1}`}
                  />
                  {formData.governanceGates.length > 1 && (
                    <button
                      onClick={() => removeArrayItem("governanceGates", index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addArrayItem("governanceGates", "")}
                className="flex items-center space-x-2 px-3 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
              >
                <Plus size={16} />
                <span>Add Governance Gate</span>
              </button>
            </div>
          </div>
        );

      case "documents":
        return (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Project Documents
              </h3>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
                  <Upload size={16} />
                  <span>Upload Document</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => handleFileSelect(e.target.files, e.target)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Information Banner */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    Documents will be uploaded automatically when you complete and submit the project creation.
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    You can add multiple files now and they will all be uploaded to the project after you click "Create Project" in the final review step.
                  </p>
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-3">
              {uploadFiles.length > 0 ? (
                uploadFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {file.name}
                          </h4>
                          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs rounded-full">
                            Project Level
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <span>{file.name}</span>
                          <span>•</span>
                          <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              Will be uploaded on project creation
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setUploadFiles((prev) =>
                            prev.filter((_, i) => i !== index)
                          );
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Documents Yet
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Upload your first document to get started. Supported formats
                    include PDF, DOC, XLS, PPT, and images.
                  </p>
                  <label className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
                    <Upload size={20} />
                    <span>Upload Your First Document</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                      onChange={(e) =>
                        handleFileSelect(e.target.files, e.target)
                      }
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        );

      case "review":
        // Helper functions for formatting
        const formatDate = (dateStr: string) => {
          if (!dateStr) return "Not specified";
          const date = new Date(dateStr);
          return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        };
        const formatCurrency = (amount: number) => {
          if (!amount || isNaN(amount)) return "Not specified";
          return `OMR ${amount.toLocaleString()}`;
        };
        const portfolioName =
          portfolios.find((p) => p.portfolio_id === formData.portfolio)?.name ||
          "Not specified";
        const epsName =
          epsLevels.find((e) => e.eps_id === formData.epsLevel)?.name ||
          "Not specified";
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Review & Submit
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Review your project details before submission.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Project Name
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formData.name || "Not specified"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Portfolio
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {portfolioName}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    EPS Level
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">{epsName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Start Date
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatDate(formData.startDate)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Must Finish By (Deadline)
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatDate(formData.mustFinishByDate)}
                  </p>
                  {formData.startDate && formData.mustFinishByDate && (
                    <div className="mt-1">
                      {new Date(formData.mustFinishByDate) > new Date(formData.startDate) ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                          ✓ {formData.estimatedDuration} working days available
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                          ⚠️ Invalid deadline
                        </span>
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    End date will be calculated from tasks when added
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Estimated Budget
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatCurrency(formData.estimatedBudget)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Priority
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formData.priority}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Description
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formData.description || "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            {/* Documents Summary */}
            {uploadFiles.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                  <FileText size={20} className="text-orange-600" />
                  <span>Documents to Upload ({uploadFiles.length})</span>
                </h4>
                <div className="space-y-2">
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText size={16} className="text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                        Pending upload
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info
                  size={20}
                  className="text-blue-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Next Steps
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {activeView === "executive"
                      ? "Once submitted, this project will be assigned to a project manager for detailed planning."
                      : activeView === "technical"
                      ? "Your project will be routed to PMO for approval before activation."
                      : "The project will be created and you can begin detailed planning immediately."}
                    {uploadFiles.length > 0 && (
                      <span className="block mt-2 font-medium">
                        📎 {uploadFiles.length} document{uploadFiles.length !== 1 ? 's' : ''} will be automatically uploaded to the project.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings size={32} className="text-orange-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {currentStepData?.label} Configuration
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              This step's content will be implemented here.
            </p>
          </div>
        );
    }
  };

  return (
    <ProtectedRoute>
      
      <DashboardLayout
        title=""
        onViewChange={setActiveView}
        activeView={activeView}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Create New Project
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {activeView === "admin"
                  ? "Complete project setup with all configuration options"
                  : activeView === "project-manager"
                  ? "Standard project creation with business focus"
                  : activeView === "pmo"
                  ? "Governance-focused creation with compliance emphasis"
                  : activeView === "technical"
                  ? "Technical project setup with limited options"
                  : "Strategic project initiation for high-level initiatives"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAutoSaving && (
              <div className="flex items-center space-x-2 text-green-600">
                <Clock size={16} />
                <span className="text-sm">Auto-saving...</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6 overflow-hidden">
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center justify-between min-w-max w-full">
              {steps.map((step, index) => {
                const validation = validateStep(step.id);
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                // Only show errors if validation errors are enabled AND it's current step or step has been attempted
                const hasErrors =
                  showValidationErrors &&
                  index <= currentStep &&
                  !validation.isValid;
                // Only allow access to completed steps or current step
                const isAccessible =
                  index < currentStep || index === currentStep;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center ${
                      isAccessible
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-60"
                    }`}
                    onClick={() => isAccessible && goToStep(index)}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : hasErrors
                          ? "bg-red-500 text-white"
                          : isCurrent
                          ? "bg-orange-500 text-white"
                          : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={20} />
                      ) : hasErrors ? (
                        <X size={20} />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div className="ml-3">
                      <p
                        className={`text-sm font-medium ${
                          isAccessible
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      {hasErrors && (
                        <p className="text-xs text-red-500">
                          {validation.errors.length} error
                          {validation.errors.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-px mx-4 min-w-[2rem] ${
                          isCompleted
                            ? "bg-green-500"
                            : "bg-gray-200 dark:bg-slate-700"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Validation Message - Show above step content */}
        {validationMessage.length > 0 && (
          <div
            ref={validationMessageRef}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle
                size={20}
                className="text-red-600 mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                  {validationMessage.length === 1 &&
                  validationMessage[0].includes("must complete")
                    ? "Navigation Blocked"
                    : "Required Fields Missing"}
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {validationMessage.map((error, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setValidationMessage([])}
                className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300 transition-colors"
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-3">
            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Create Project</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <span>Next</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </DashboardLayout>

      {/* Success Modal - Using Portal to render at document root */}
      {showSuccessModal &&
        createdProject &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-[9999]"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <div
              className="rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl"
              style={{
                backgroundColor:
                  typeof window !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "rgba(30, 41, 59, 0.95)"
                    : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border:
                  typeof window !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "1px solid rgba(148, 163, 184, 0.2)"
                    : "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="text-center">
                {/* Success Icon */}
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle
                    size={32}
                    className="text-green-600 dark:text-green-400"
                  />
                </div>

                {/* Success Message */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Project Created Successfully!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your project has been created and is ready for setup.
                </p>

                {/* Project Details */}
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 mb-6 text-left">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Project ID:
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {createdProject.project_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Name:
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {createdProject.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Budget:
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        OMR{" "}
                        {createdProject.budget_amount?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Status:
                      </span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        Planning
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      router.push(
                        `/projects/${createdProject.project_id}/setup`
                      );
                    }}
                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    Continue to Setup
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      router.push("/projects");
                    }}
                    className="flex-1 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
                  >
                    View All Projects
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ProtectedRoute>
  );
};

export default ProjectCreatePage;
