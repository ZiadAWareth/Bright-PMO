"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Award,
  Star,
  GraduationCap,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface Skill {
  id: string;
  name: string;
  category: "skill" | "language";
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  yearsExperience?: number;
}

interface ResourceFormData {
  // Basic Information
  name: string;
  type: "labor" | "equipment" | "material";
  role: string;
  department: string;
  email: string;
  phone_number: string;
  location: string;

  // Skills & Capabilities
  skills: Skill[];
  certifications: string[];
  languages: string[];

  // Financial & Capacity
  rate: number;
  capacity: number;
  availability_status: "available" | "on_leave" | "inactive";

  // Location & Assignment
  manager: string;
  costCenter: string;

  // Performance & Rating
  rating: number;

  // Metadata
  priority: "high" | "medium" | "low";
  tags: string[];

  // Material inventory fields
  unit: string;
  quantity: number;
}

interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  expiryDate: string;
  status: "active" | "expired" | "pending";
}

interface Language {
  id: string;
  name: string;
  proficiency: "basic" | "intermediate" | "fluent" | "native";
}

/** Inventory API item (for Material dropdown) */
interface InventoryItem {
  id: string;
  code: string;
  name: string;
  arabicName?: string | null;
  baseUom?: { id: string; name: string; abbreviation: string; type?: string } | null;
}

const ResourceCreatePage = () => {
  const router = useRouter();
  const [activeView, setActiveView] = useState("admin");
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ResourceFormData>({
    name: "",
    type: "labor",
    role: "",
    department: "",
    email: "",
    phone_number: "",
    location: "Muscat, Oman",
    skills: [
      {
        id: "lang_1",
        name: "Arabic",
        category: "language",
        proficiency: "advanced",
        yearsExperience: 10,
      },
      {
        id: "lang_2",
        name: "English",
        category: "language",
        proficiency: "intermediate",
        yearsExperience: 5,
      },
    ],
    certifications: [],
    languages: [],
    rate: 25.0, // Default hourly rate in OMR (Omani Rial)
    capacity: 8,
    availability_status: "available",
    manager: "",
    costCenter: "",
    rating: 3,
    priority: "medium",
    tags: [],
    unit: "",
    quantity: 0,
  });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdResource, setCreatedResource] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [nameDuplicateError, setNameDuplicateError] = useState<string>("");
  const [emailDuplicateError, setEmailDuplicateError] = useState<string>("");
  const [phoneDuplicateError, setPhoneDuplicateError] = useState<string>("");
  // Inventory (material) dropdown
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryItemsLoading, setInventoryItemsLoading] = useState(false);
  const [inventoryItemsError, setInventoryItemsError] = useState<string | null>(null);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | null>(null);
  const [materialSearchQuery, setMaterialSearchQuery] = useState("");
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);
  const materialDropdownRef = useRef<HTMLDivElement>(null);

  // Use refs for timeout IDs to avoid dependency issues
  const nameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phoneCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get role-specific steps
  const getRoleSpecificSteps = (role: string) => {
    // For material resources, only show Basic, Inventory, and Review steps
    if (formData.type === "material") {
      return [
        { id: "basic", label: "Material Info", icon: <FileText size={20} /> },
        {
          id: "capacity",
          label: "Inventory Details",
          icon: <Clock size={20} />,
        },
        { id: "review", label: "Review", icon: <Eye size={20} /> },
      ];
    }

    const baseSteps = [
      { id: "basic", label: "Basic Info", icon: <FileText size={20} /> },
      { id: "skills", label: "Skills", icon: <Award size={20} /> },
      { id: "capacity", label: "Capacity", icon: <Clock size={20} /> },
      {
        id: "financial",
        label: "Financial Details",
        icon: <DollarSign size={20} />,
      },
      {
        id: "assignment",
        label: "Assignment Details",
        icon: <Users size={20} />,
      },
      { id: "review", label: "Review", icon: <Eye size={20} /> },
    ];

    switch (role) {
      case "admin":
        return baseSteps;
      case "project-manager":
        return baseSteps;
      case "pmo":
        return baseSteps;
      default:
        return baseSteps;
    }
  };

  const steps = getRoleSpecificSteps(activeView);

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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (nameCheckTimeoutRef.current) clearTimeout(nameCheckTimeoutRef.current);
      if (emailCheckTimeoutRef.current) clearTimeout(emailCheckTimeoutRef.current);
      if (phoneCheckTimeoutRef.current) clearTimeout(phoneCheckTimeoutRef.current);
    };
  }, []);

  // When type is material, set hidden defaults for quantity (1000) and stock status (in stock) until inventory sync
  useEffect(() => {
    if (formData.type === "material") {
      setFormData((prev) => ({ ...prev, quantity: 1000, availability_status: "available" }));
    }
  }, [formData.type]);

  // Fetch inventory items when adding a material resource
  useEffect(() => {
    if (formData.type !== "material") {
      setSelectedInventoryItemId(null);
      return;
    }
    let cancelled = false;
    setInventoryItemsLoading(true);
    setInventoryItemsError(null);
    fetch("/api/inventory/items?status=ACTIVE&limit=500")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data?.data)) {
          setInventoryItems(data.data);
        } else {
          setInventoryItems([]);
          setInventoryItemsError(data?.error ?? "Failed to load inventory");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInventoryItems([]);
          setInventoryItemsError("Failed to load inventory");
        }
      })
      .finally(() => {
        if (!cancelled) setInventoryItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.type]);

  // Close material dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (materialDropdownRef.current && !materialDropdownRef.current.contains(e.target as Node)) {
        setMaterialDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const addArrayItem = (
    field: keyof ResourceFormData,
    defaultValue: any = ""
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as any[]), defaultValue],
    }));
  };

  const removeArrayItem = (field: keyof ResourceFormData, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as any[]).filter((_, i) => i !== index),
    }));
  };

  const updateArrayItem = (
    field: keyof ResourceFormData,
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

  const nextStep = () => {
    // Clear previous validation errors
    setValidationError(null);
    setMissingFields([]);

    // Check for duplicate errors before proceeding
    if (nameDuplicateError || emailDuplicateError || phoneDuplicateError) {
      toast.error("Please fix duplicate validation errors before proceeding");
      return;
    }

    // Validate current step
    const missing = validateCurrentStep();

    if (missing.length > 0) {
      setMissingFields(missing);
      setValidationError(
        `Please fill in the required fields: ${missing.join(", ")}`
      );
      scrollToTop();
      return;
    }

    // Move to next step if validation passes
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    // If going forward, validate all previous steps
    if (stepIndex > currentStep) {
      for (let i = currentStep; i < stepIndex; i++) {
        const tempStep = steps[i];
        let missing: string[] = [];

        switch (tempStep.id) {
          case "basic":
            missing = validateBasicStep();
            break;
          case "skills":
            missing = validateSkillsStep();
            break;
          case "capacity":
            missing = validateCapacityStep();
            break;
          case "financial":
            missing = validateFinancialStep();
            break;
          default:
            break;
        }

        if (missing.length > 0) {
          setMissingFields(missing);
          setValidationError(
            `Please complete step "${
              tempStep.label
            }" first. Missing: ${missing.join(", ")}`
          );
          scrollToTop();
          return;
        }
      }
    }

    // Clear validation errors and go to step
    setValidationError(null);
    setMissingFields([]);
    setCurrentStep(stepIndex);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Validate required fields
      const requiredFields = ["name", "role", "department", "location"];

      // Add email and phone only for labor resources
      if (formData.type === "labor") {
        requiredFields.push("email", "phone_number");

        // Validate email format
        if (formData.email && !validateEmail(formData.email)) {
          toast.error("Please enter a valid email address");
          setIsSubmitting(false);
          return;
        }

        // Validate phone number format
        if (formData.phone_number && !validatePhoneNumber(formData.phone_number)) {
          toast.error("Please enter a valid phone number (only digits, spaces, dashes, parentheses, and + sign allowed)");
          setIsSubmitting(false);
          return;
        }
      }

      const missingFields = requiredFields.filter(
        (field) => !formData[field as keyof ResourceFormData]
      );

      // Check if skills are provided (only for labor and equipment, not material)
      if (
        formData.type !== "material" &&
        formData.skills.filter((skill) => skill.category === "skill").length === 0
      ) {
        missingFields.push("skills");
      }

      if (missingFields.length > 0) {
        toast.error(
          `Please fill in all required fields: ${missingFields.join(", ")}`
        );
        setIsSubmitting(false);
        return;
      }

      // Get authentication token
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found. Please log in.");
        setIsSubmitting(false);
        return;
      }

      // Check for duplicates before submission
      try {
        const checkResponse = await fetch("/api/resources", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (checkResponse.ok) {
          const resourcesData = await checkResponse.json();
          const existingResources = resourcesData.allResources || [];

          // Check for duplicate name
          const duplicateName = existingResources.find(
            (r: any) => r.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
          );
          if (duplicateName) {
            toast.error(`A resource with the name "${formData.name}" already exists. Please choose a different name.`);
            setIsSubmitting(false);
            return;
          }

          // For labor resources, check for duplicate email and phone
          if (formData.type === "labor") {
            if (formData.email) {
              const duplicateEmail = existingResources.find(
                (r: any) => r.email && r.email.trim().toLowerCase() === formData.email.trim().toLowerCase() && r.type === "labor"
              );
              if (duplicateEmail) {
                toast.error(`A resource with the email "${formData.email}" already exists. Please use a different email address.`);
                setIsSubmitting(false);
                return;
              }
            }

            if (formData.phone_number) {
              // Normalize phone number for comparison
              const normalizedPhone = formData.phone_number.replace(/[\s\-\(\)\+]/g, '');
              const duplicatePhone = existingResources.find((r: any) => {
                if (!r.phone_number || r.type !== "labor") return false;
                const existingNormalized = r.phone_number.replace(/[\s\-\(\)\+]/g, '');
                return existingNormalized === normalizedPhone;
              });
              if (duplicatePhone) {
                toast.error(`A resource with the phone number "${formData.phone_number}" already exists. Please use a different phone number.`);
                setIsSubmitting(false);
                return;
              }
            }
          }
        }
      } catch (checkError) {
        console.error("Error checking for duplicates:", checkError);
        // Continue with submission if duplicate check fails (backend will catch it)
      }

      // Prepare the data for submission
      const skillsData = formData.type === "material"
        ? { Skills: [], Languages: [] } // Empty skills for materials
        : {
          Skills: formData.skills.filter((skill) => skill.category === "skill"),
          Languages: formData.skills.filter(
            (skill) => skill.category === "language"
          ),
        };

      const submitData = {
        ...formData,
        skills: skillsData, // Send as JSON object, not string
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Material: ensure hidden quantity (1000) and stock (available) are sent until inventory sync
        ...(formData.type === "material"
          ? {
              quantity: formData.quantity && formData.quantity > 0 ? formData.quantity : 1000,
              availability_status: formData.availability_status || "available",
            }
          : {}),
      };

      console.log("Submitting data:", JSON.stringify(submitData, null, 2));

      const response = await fetch("/api/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const result = await response.json();
        setCreatedResource(result);
        setShowSuccessModal(true);
        toast.success("Resource created successfully");
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        console.error("Submitted data:", submitData);
        
        // Handle duplicate errors with specific messages
        if (response.status === 409) {
          toast.error(errorData.error || "A duplicate resource already exists");
        } else {
          toast.error(
            `Error creating resource: ${errorData.error || "Unknown error"}`
          );
        }
      }
    } catch (error) {
      toast.error(
        `Error creating resource: ${
        error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDraft = async () => {
    setIsAutoSaving(true);
    try {
      // Simulate saving draft
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save to localStorage as backup
      localStorage.setItem("resourceDraft", JSON.stringify(formData));

      toast.success("Draft saved successfully!");
    } catch (error) {
      toast.error("Failed to save draft");
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Email validation function
  const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Check for duplicate name
  const checkDuplicateName = async (name: string) => {
    if (!name.trim()) {
      setNameDuplicateError("");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/resources", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const resourcesData = await response.json();
        const existingResources = resourcesData.allResources || [];
        const duplicate = existingResources.find(
          (r: any) => r.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (duplicate) {
          setNameDuplicateError(`A resource with the name "${name}" already exists`);
        } else {
          setNameDuplicateError("");
        }
      }
    } catch (error) {
      console.error("Error checking duplicate name:", error);
    }
  };

  // Check for duplicate email
  const checkDuplicateEmail = async (email: string) => {
    if (!email.trim() || formData.type !== "labor") {
      setEmailDuplicateError("");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/resources", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const resourcesData = await response.json();
        const existingResources = resourcesData.allResources || [];
        const duplicate = existingResources.find(
          (r: any) => r.email && r.email.trim().toLowerCase() === email.trim().toLowerCase() && r.type === "labor"
        );
        if (duplicate) {
          setEmailDuplicateError(`A resource with the email "${email}" already exists`);
        } else {
          setEmailDuplicateError("");
        }
      }
    } catch (error) {
      console.error("Error checking duplicate email:", error);
    }
  };

  // Check for duplicate phone number
  const checkDuplicatePhone = async (phone: string) => {
    if (!phone.trim() || formData.type !== "labor") {
      setPhoneDuplicateError("");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/resources", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const resourcesData = await response.json();
        const existingResources = resourcesData.allResources || [];
        // Normalize phone number for comparison
        const normalizedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
        const duplicate = existingResources.find((r: any) => {
          if (!r.phone_number || r.type !== "labor") return false;
          const existingNormalized = r.phone_number.replace(/[\s\-\(\)\+]/g, '');
          return existingNormalized === normalizedPhone;
        });
        if (duplicate) {
          setPhoneDuplicateError(`A resource with the phone number "${phone}" already exists`);
        } else {
          setPhoneDuplicateError("");
        }
      }
    } catch (error) {
      console.error("Error checking duplicate phone:", error);
    }
  };

  // Handle email change with validation and duplicate checking
  const handleEmailChange = (email: string) => {
    setFormData((prev) => ({ ...prev, email }));
    if (email.trim()) {
      validateEmail(email);
    } else {
      setEmailError("");
    }

    // Clear previous timeout
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }
    
    // Set new timeout for debounced checking
    emailCheckTimeoutRef.current = setTimeout(() => {
      checkDuplicateEmail(email);
    }, 500); // Wait 500ms after user stops typing
  };

  // Convert Arabic numerals to English numerals
  const convertArabicToEnglish = (text: string): string => {
    const arabicToEnglish: { [key: string]: string } = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    return text.split('').map(char => arabicToEnglish[char] || char).join('');
  };

  // Validate phone number - only digits, spaces, dashes, parentheses, and + sign
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return false;
    // Remove spaces, dashes, parentheses, and + for validation
    const digitsOnly = phone.replace(/[\s\-\(\)\+]/g, '');
    // Check if remaining characters are all digits (English or Arabic)
    if (!/^[\d٠١٢٣٤٥٦٧٨٩]+$/.test(digitsOnly)) {
      setPhoneError("Phone number can only contain digits, spaces, dashes, parentheses, and + sign");
      return false;
    }
    // Convert Arabic numerals to English for length check
    const englishDigits = convertArabicToEnglish(digitsOnly);
    // Check minimum length (at least 7 digits for a valid phone number)
    if (englishDigits.length < 7) {
      setPhoneError("Phone number must contain at least 7 digits");
      return false;
    }
    setPhoneError("");
    return true;
  };

  // Handle phone number change with validation and input filtering
  const handlePhoneChange = (phone: string) => {
    // First convert Arabic numerals to English
    let converted = convertArabicToEnglish(phone);
    // Filter out invalid characters - only allow digits, spaces, dashes, parentheses, and + sign
    const filtered = converted.replace(/[^\d\s\-\(\)\+]/g, '');
    setFormData((prev) => ({ ...prev, phone_number: filtered }));
    if (filtered.trim()) {
      validatePhoneNumber(filtered);
    } else {
      setPhoneError("");
    }

    // Clear previous timeout
    if (phoneCheckTimeoutRef.current) {
      clearTimeout(phoneCheckTimeoutRef.current);
    }
    
    // Set new timeout for debounced checking
    phoneCheckTimeoutRef.current = setTimeout(() => {
      checkDuplicatePhone(filtered);
    }, 500); // Wait 500ms after user stops typing
  };

  // Handle name change with duplicate checking
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name }));
    
    // Clear previous timeout
    if (nameCheckTimeoutRef.current) {
      clearTimeout(nameCheckTimeoutRef.current);
    }
    
    // Set new timeout for debounced checking
    nameCheckTimeoutRef.current = setTimeout(() => {
      checkDuplicateName(name);
    }, 500); // Wait 500ms after user stops typing
  };

  // Step validation functions
  const validateBasicStep = () => {
    // For material, skip role/department and only require name and location
    if (formData.type === "material") {
      const missing: string[] = [];
      if (!formData.name.trim()) missing.push("name");
      if (!formData.location.trim()) missing.push("location");
      return missing;
    }
    const requiredFields = ["name", "type", "role", "department"];

    // Add email and phone only for labor resources
    if (formData.type === "labor") {
      requiredFields.push("email", "phone_number");

      // Validate email format for labor
      if (formData.email && !validateEmail(formData.email)) {
        return ["email (invalid format)"];
      }

      // Validate phone number format for labor
      if (formData.phone_number && !validatePhoneNumber(formData.phone_number)) {
        return ["phone_number (invalid format)"];
      }
    }

    const missing = requiredFields.filter(
      (field) =>
        !formData[field as keyof ResourceFormData] ||
        (typeof formData[field as keyof ResourceFormData] === "string" &&
          (formData[field as keyof ResourceFormData] as string).trim() === "")
    );
    return missing;
  };

  const validateSkillsStep = () => {
    // Skip skills validation for material resources
    if (formData.type === "material") {
      return [];
    }

    const missing: string[] = [];
    const skillsCount = formData.skills.filter(
      (skill) => skill.category === "skill"
    ).length;
    const languagesCount = formData.skills.filter(
      (skill) => skill.category === "language"
    ).length;

    if (skillsCount === 0) {
      missing.push("technical skills");
    }
    if (languagesCount === 0) {
      missing.push("languages");
    }
    return missing;
  };

  const computeStockStatus = (qty: number): "available" | "on_leave" | "inactive" => {
    if (qty < 10) return "available";
    if (qty < 12) return "on_leave";
    return "inactive";
  };

  // Auto-update availability_status for materials when quantity changes (disabled until inventory sync; quantity/stock are hidden and fixed)
  useEffect(() => {
    if (formData.type !== "material") return;
    // When quantity/stock are hidden we keep availability_status "available"; skip auto-update until inventory sync
  }, [formData.quantity, formData.type]);

  const validateCapacityStep = () => {
    // For material: unit and rate required; quantity/stock are hidden and default to 1000 / In Stock
    if (formData.type === "material") {
      const missing: string[] = [];
      if (!formData.unit.trim()) missing.push("unit");
      if (!formData.rate || formData.rate <= 0) missing.push("rate");
      return missing;
    }
    const missing: string[] = [];
    if (!formData.capacity || formData.capacity <= 0) {
      missing.push("capacity");
    }
    if (!formData.availability_status) {
      missing.push("availability status");
    }
    return missing;
  };

  const validateFinancialStep = () => {
    const missing: string[] = [];
    if (!formData.rate || formData.rate <= 0) {
      missing.push(formData.type === "material" ? "cost per kg" : "hourly rate");
    }
    return missing;
  };

  const validateCurrentStep = () => {
    const step = steps[currentStep];
    let missing: string[] = [];

    switch (step.id) {
      case "basic":
        missing = validateBasicStep();
        break;
      case "skills":
        missing = validateSkillsStep();
        break;
      case "capacity":
        missing = validateCapacityStep();
        break;
      case "financial":
        missing = validateFinancialStep();
        break;
      default:
        break;
    }

    return missing;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Error styling helper functions
  const getLabelErrorClass = (fieldName: string) => {
    const hasError = missingFields.includes(fieldName);
    return `block text-sm font-medium mb-2 ${
      hasError
        ? "text-red-700 dark:text-red-400"
        : "text-gray-700 dark:text-gray-300"
    }`;
  };

  const getFieldErrorClass = (fieldName: string) => {
    const hasError = missingFields.includes(fieldName);
    return `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white ${
      hasError
        ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
        : "border-gray-300 dark:border-slate-600"
    }`;
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case "basic":
        if (formData.type === "material") {
          const handleInventoryItemSelect = (item: InventoryItem) => {
            setSelectedInventoryItemId(item.id);
            setFormData((prev) => ({
              ...prev,
              name: item.name,
              unit: item.baseUom?.abbreviation ?? "",
            }));
            setMaterialSearchQuery(item.name);
            setMaterialDropdownOpen(false);
            checkDuplicateName(item.name);
          };
          const q = materialSearchQuery.trim().toLowerCase();
          const filteredItems = q
            ? inventoryItems.filter(
                (item) =>
                  (item.name && item.name.toLowerCase().includes(q)) ||
                  (item.arabicName && item.arabicName.toLowerCase().includes(q)) ||
                  (item.code && item.code.toLowerCase().includes(q))
              )
            : inventoryItems;
          const displayItems = filteredItems.slice(0, 100);
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Material Information
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Search or select the material from inventory.
                </p>
              </div>
              <div>
                <label className={getLabelErrorClass("type")}>Resource Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as any,
                    }))
                  }
                  className={getFieldErrorClass("type")}
                >
                  <option value="labor">Labor</option>
                  <option value="equipment">Equipment</option>
                  <option value="material">Material</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div ref={materialDropdownRef} className="relative">
                  <label className={getLabelErrorClass("name")}>
                    Material Name *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={materialSearchQuery}
                      onChange={(e) => {
                        setMaterialSearchQuery(e.target.value);
                        setMaterialDropdownOpen(true);
                        if (!e.target.value.trim()) {
                          setSelectedInventoryItemId(null);
                          setFormData((prev) => ({ ...prev, name: "", unit: "" }));
                          setNameDuplicateError("");
                        }
                      }}
                      onFocus={() => setMaterialDropdownOpen(true)}
                      disabled={inventoryItemsLoading}
                      placeholder={
                        inventoryItemsLoading
                          ? "Loading inventory..."
                          : inventoryItemsError
                          ? inventoryItemsError
                          : "Search by name, code, or Arabic name..."
                      }
                      className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white ${
                        nameDuplicateError || missingFields.includes("name")
                          ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                    />
                  </div>
                  {materialDropdownOpen && !inventoryItemsLoading && !inventoryItemsError && (
                    <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-lg py-1">
                      {displayItems.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          No materials match your search.
                        </li>
                      ) : (
                        displayItems.map((item) => (
                          <li
                            key={item.id}
                            role="option"
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 dark:hover:bg-slate-600 text-gray-900 dark:text-gray-100"
                            onClick={() => handleInventoryItemSelect(item)}
                          >
                            {item.name}
                            {item.arabicName ? ` (${item.arabicName})` : ""}
                            {item.code ? ` — ${item.code}` : ""}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                  {nameDuplicateError && (
                    <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {nameDuplicateError}
                    </div>
                  )}
                  {selectedInventoryItemId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Unit is pre-filled from inventory. Set cost per unit in the next step.
                    </p>
                  )}
                </div>
                <div>
                  <label className={getLabelErrorClass("location")}>
                    Location *
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    className={getFieldErrorClass("location")}
                  >
                    <optgroup label="Egypt">
                      <option value="Cairo, Egypt">Cairo, Egypt</option>
                      <option value="Giza, Egypt">Giza, Egypt</option>
                    </optgroup>
                    <optgroup label="Oman">
                      <option value="Muscat, Oman">Muscat, Oman</option>
                      <option value="Salalah, Oman">Salalah, Oman</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Basic Information
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Enter the basic details for the new resource.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={getLabelErrorClass("name")}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white ${
                    nameDuplicateError || missingFields.includes("name")
                      ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-300 dark:border-slate-600"
                  }`}
                  placeholder="Enter full name"
                />
                {nameDuplicateError && (
                  <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {nameDuplicateError}
                  </div>
                )}
              </div>

              <div>
                <label className={getLabelErrorClass("type")}>
                  Resource Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as any,
                    }))
                  }
                  className={getFieldErrorClass("type")}
                >
                  <option value="labor">Labor</option>
                  <option value="equipment">Equipment</option>
                  <option value="material">Material</option>
                </select>
              </div>

              <div>
                <label className={getLabelErrorClass("role")}>
                  Role/Position *
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className={getFieldErrorClass("role")}
                  placeholder="e.g., Senior Developer, Project Manager"
                />
              </div>

              <div>
                <label className={getLabelErrorClass("department")}>
                  Department *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                  className={getFieldErrorClass("department")}
                  placeholder="e.g., Oil & Gas, Construction, IT, Finance"
                />
              </div>

              {/* Only show email and phone for labor resources */}
              {formData.type === "labor" && (
                <>
                  <div>
                    <label className={getLabelErrorClass("email")}>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white ${
                        emailError || missingFields.includes("email")
                          ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                      placeholder="email@example.com"
                    />
                    {emailError && (
                      <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {emailError}
                      </div>
                    )}
                    {emailDuplicateError && (
                      <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {emailDuplicateError}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={getLabelErrorClass("phone_number")}>
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      value={formData.phone_number}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white ${
                        phoneError || missingFields.includes("phone_number")
                          ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                      placeholder="+968 xxxx xxxx"
                    />
                    {phoneError && (
                      <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {phoneError}
                      </div>
                    )}
                    {phoneDuplicateError && (
                      <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {phoneDuplicateError}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* <div>
                <label className={getLabelErrorClass("location")}>
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className={getFieldErrorClass("location")}
                  placeholder="e.g., Muscat, Oman"
                />
              </div> */}
            </div>
          </div>
        );

      case "skills":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Skills & Capabilities
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Define the skills, certifications, and capabilities of this
                resource.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Skills & Expertise
                </label>
                <SkillsEditor
                  skills={formData.skills}
                  onChange={(skills: Skill[]) =>
                    setFormData((prev) => ({ ...prev, skills }))
                  }
                />
              </div>
            </div>
          </div>
        );

      case "capacity":
        if (formData.type === "material") {
          const unitLabel = formData.unit ? formData.unit : "unit";
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Inventory Details
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Unit and cost per unit from inventory (read-only until inventory sync).
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={getLabelErrorClass("unit")}>
                    Unit
                  </label>
                  <p className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-800 dark:text-white border-gray-300 dark:border-slate-600">
                    {formData.unit || "—"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    From inventory when you selected a material.
                  </p>
                </div>
                <div>
                  <label className={getLabelErrorClass("rate")}>
                    Cost per {unitLabel} (OMR)
                  </label>
                  <p className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-800 dark:text-white border-gray-300 dark:border-slate-600">
                    {formData.rate != null && formData.rate > 0 ? formData.rate : "—"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    From inventory when available; otherwise default is used until sync.
                  </p>
                </div>
              </div>
              {/* Quantity (1000) and Stock Status (In Stock) are hidden until inventory sync; values sent on submit */}
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {(formData.type as string) === "material" ? "Inventory & Capacity" : "Capacity & Availability"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {(formData.type as string) === "material" 
                  ? "Set the material inventory capacity and current stock status."
                  : "Set the resource's capacity and current availability status."
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={getLabelErrorClass("capacity")}>
                  {(formData.type as string) === "material" ? "Capacity (kg) *" : "Daily Capacity (hours) *"}
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      capacity: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={getFieldErrorClass("capacity")}
                  placeholder={(formData.type as string) === "material" ? "1000" : "40"}
                  min="0"
                />
                {(formData.type as string) === "material" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum inventory capacity in kilograms
                  </p>
                )}
              </div>

              <div>
                <label className={getLabelErrorClass("availability_status")}>
                  {(formData.type as string) === "material" ? "Stock Status *" : "Availability Status *"}
                </label>
                <select
                  value={formData.availability_status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      availability_status: e.target.value as any,
                    }))
                  }
                  className={getFieldErrorClass("availability_status")}
                >
                  {(formData.type as string) === "material" ? (
                    <>
                      <option value="available">In Stock</option>
                      <option value="on_leave">Low Stock</option>
                      <option value="inactive">Out of Stock</option>
                    </>
                  ) : (
                    <>
                      <option value="available">Available</option>
                      <option value="on_leave">On Leave</option>
                      <option value="inactive">Inactive</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        );

      case "financial":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Financial Details
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {(formData.type as string) === "material" 
                  ? "Set the material's cost per kilogram and cost center information."
                  : "Set the resource's rate and cost center information."
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {" "}
              <div>
                <label className={getLabelErrorClass("rate")}>
                  {(formData.type as string) === "material" ? "Cost per kg (OMR) *" : "Hourly Rate (OMR) *"}
                </label>
                <input
                  type="number"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={getFieldErrorClass("rate")}
                  placeholder={(formData.type as string) === "material" ? "5.50" : "25.00"}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(formData.type as string) === "material" 
                    ? "Cost per kilogram in Omani Rial"
                    : "Standard rates: Junior (15-25 OMR), Mid (25-40 OMR), Senior (40+ OMR)"
                  }
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cost Center
                </label>{" "}
                <input
                  type="text"
                  value={formData.costCenter}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      costCenter: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  placeholder="e.g., OG-001, CONS-002, IT-003"
                />
              </div>
            </div>
          </div>
        );

      case "assignment":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Assignment Details
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Set the resource's location, manager, and performance
                information.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>{" "}
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  placeholder="e.g., Muscat, Oman"
                />
              </div>

              {/* <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Manager
                                </label>
                                <input
                                    type="text"
                                    value={formData.manager}
                                    onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                                    placeholder="Manager name"
                                />
                            </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Performance Rating
                </label>
                <input
                  type="number"
                  value={formData.rating}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rating: parseInt(e.target.value) || 3,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  placeholder="3"
                  min="1"
                  max="5"
                />
              </div>
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Review Resource Details
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Review all the information before creating the resource.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Basic Information
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Name:
                      </span>{" "}
                      {formData.name}
                    </p>
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Type:
                      </span>{" "}
                      {formData.type}
                    </p>
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Role:
                      </span>{" "}
                      {formData.role}
                    </p>
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Department:
                      </span>{" "}
                      {formData.department}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Capacity & Availability
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Capacity:
                      </span>{" "}
                      {formData.capacity} {formData.type === "material" ? (formData.unit || "kg") : "hours/week"}
                    </p>
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Status:
                      </span>{" "}
                      {formData.type === "material" 
                        ? (formData.availability_status === "available" ? "In Stock" : 
                           formData.availability_status === "on_leave" ? "Low Stock" : "Out of Stock")
                        : formData.availability_status
                      }
                    </p>
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        {formData.type === "material" ? "Cost:" : "Rate:"}
                      </span>{" "}
                      OMR {formData.rate}/{formData.type === "material" ? (formData.unit || "kg") : "hour"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {formData.type === "material" ? "Material Details" : "Skills & Languages"}
                </h4>
                {formData.type === "material" ? (
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Type:
                      </span>{" "}
                      Material Resource
                    </p>
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Description:
                      </span>{" "}
                      {formData.role}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Skills:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {formData.skills.filter(
                          (skill) => skill.category === "skill"
                        ).length > 0 ? (
                          formData.skills
                            .filter((skill) => skill.category === "skill")
                            .map((skill) => (
                              <span
                                key={skill.id}
                                className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs"
                              >
                                {skill.name} ({skill.proficiency})
                              </span>
                            ))
                        ) : (
                          <span className="text-gray-500 italic">
                            None specified
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Languages:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {formData.skills.filter(
                          (skill) => skill.category === "language"
                        ).length > 0 ? (
                          formData.skills
                            .filter((skill) => skill.category === "language")
                            .map((skill) => (
                              <span
                                key={skill.id}
                                className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs"
                              >
                                {skill.name} ({skill.proficiency})
                              </span>
                            ))
                        ) : (
                          <span className="text-gray-500 italic">
                            None specified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Information - Only for labor and equipment */}
              <div className="space-y-1 text-sm">
                {formData.type !== "material" && (
                  <>
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Email:
                      </span>{" "}
                      {formData.email}
                    </p>
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">
                        Phone:
                      </span>{" "}
                      {formData.phone_number}
                    </p>
                  </>
                )}
                <p>
                  <span className="text-gray-600 dark:text-gray-400">
                    Location:
                  </span>{" "}
                  {formData.location}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Step not found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              This step is not available for your current role.
            </p>
          </div>
        );
    }
  };

  // Recalculate steps when resource type changes
  useEffect(() => {
    // Reset to first step when type changes to avoid being stuck on invalid steps
    if (currentStep > 0) {
      setCurrentStep(0);
    }
    // Clear validation errors when type changes
    setValidationError(null);
    setMissingFields([]);
  }, [formData.type]);

  // Automatically assign role/department for materials
  useEffect(() => {
    if (formData.type === "material") {
      setFormData(prev => ({
        ...prev,
        role: "Construction",
        department: "Construction",
      }));
    }
  }, [formData.type]);

  return (
    <>
      <DashboardLayout
        title="Add New Resource"
        onViewChange={setActiveView}
        activeView={activeView}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/resources")}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft size={16} />
              <span>Back to Resources</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {isAutoSaving && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                <span>Saving...</span>
              </div>
            )}
            {/* <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Eye size={16} />
              <span>Preview</span>
            </button> */}
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  Required Fields Missing
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {validationError}
                </p>
                {missingFields.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missingFields.map((field, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setValidationError(null);
                  setMissingFields([]);
                }}
                className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center cursor-pointer"
                onClick={() => goToStep(index)}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    index < currentStep
                      ? "bg-green-500 text-white"
                      : index === currentStep
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {index < currentStep ? <Check size={20} /> : step.icon}
                </div>
                <div className="ml-3 hidden md:block">
                  <p
                    className={`text-sm font-medium ${
                      index <= currentStep
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-px mx-4 ${
                      index < currentStep
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

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
            {/* <button
              onClick={saveDraft}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Save size={16} />
              <span>Save Draft</span>
            </button> */}

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
                    <span>Create Resource</span>
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
      </DashboardLayout>{" "}
      {/* Success Modal */}
      {showSuccessModal && createdResource && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop with blur effect */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSuccessModal(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-slate-700">
            {/* Close button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle
                  size={32}
                  className="text-green-600 dark:text-green-400"
                />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Resource Created Successfully!
              </h3>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your resource has been created and is ready for assignment.
              </p>

              {/* Resource Details */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Resource ID:
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {createdResource?.id || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Name:
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {createdResource?.name || formData.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Role:
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {createdResource?.role || formData.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status:
                  </span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400 capitalize">
                    {(
                      createdResource?.availability_status ||
                      formData.availability_status
                    ).replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push("/resources");
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
                >
                  View All Resources
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    // Reset form for new resource
                    setFormData({
                      name: "",
                      type: "labor",
                      role: "",
                      department: "",
                      email: "",
                      phone_number: "",
                      location: "Muscat, Oman",
                      skills: [
                        {
                          id: "lang_1",
                          name: "Arabic",
                          category: "language",
                          proficiency: "advanced",
                          yearsExperience: 10,
                        },
                        {
                          id: "lang_2",
                          name: "English",
                          category: "language",
                          proficiency: "intermediate",
                          yearsExperience: 5,
                        },
                      ],
                      certifications: [],
                      languages: ["Arabic", "English"],
                      rate: 25.0,
                      capacity: 40,
                      availability_status: "available",
                      manager: "",
                      costCenter: "",
                      rating: 3,
                      priority: "medium",
                      tags: [],
                      unit: "",
                      quantity: 0,
                    });
                    setCurrentStep(0);
                  }}
                  className="flex-1 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors font-medium"
                >
                  Add Another
                </button>{" "}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Skills Editor Component
interface SkillsEditorProps {
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
}

const SkillsEditor: React.FC<SkillsEditorProps> = ({ skills, onChange }) => {
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<
    "skill" | "language"
  >("skill");
  const [newSkillProficiency, setNewSkillProficiency] = useState<
    "beginner" | "intermediate" | "advanced" | "expert"
  >("intermediate");
  const [newSkillYears, setNewSkillYears] = useState<number>(1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Popular skills suggestions categorized by domain
  const skillSuggestions = {
    "Technical Skills": [
      "JavaScript",
      "Python",
      "Java",
      "C#",
      "React",
      "Node.js",
      "SQL",
      "AWS",
      "Docker",
      "Kubernetes",
    ],
    "Project Management": [
      "Agile/Scrum",
      "Project Planning",
      "Risk Management",
      "Stakeholder Management",
      "Budget Management",
    ],
    Engineering: [
      "AutoCAD",
      "SolidWorks",
      "MATLAB",
      "Civil Engineering",
      "Mechanical Engineering",
      "Electrical Engineering",
    ],
    "Oil & Gas": [
      "Drilling Operations",
      "Well Testing",
      "Reservoir Engineering",
      "Process Safety",
      "HSE Management",
    ],
    Construction: [
      "Construction Management",
      "Quality Control",
      "Site Supervision",
      "Safety Management",
      "Contract Administration",
    ],
    Business: [
      "Financial Analysis",
      "Data Analysis",
      "Business Strategy",
      "Marketing",
      "Sales",
      "Customer Service",
    ],
    Languages: [
      "Arabic",
      "English",
      "French",
      "German",
      "Spanish",
      "Hindi",
      "Urdu",
      "Mandarin",
      "Japanese",
      "Russian",
    ],
  };

  const addSkill = () => {
    if (newSkillName.trim()) {
      const newSkill: Skill = {
        id: Date.now().toString(),
        name: newSkillName.trim(),
        category: newSkillCategory,
        proficiency: newSkillProficiency,
        yearsExperience: newSkillYears,
      };
      onChange([...skills, newSkill]);
      setNewSkillName("");
      setNewSkillCategory("skill");
      setNewSkillProficiency("intermediate");
      setNewSkillYears(1);
    }
  };

  const removeSkill = (id: string) => {
    onChange(skills.filter((skill) => skill.id !== id));
  };

  const updateSkill = (id: string, updates: Partial<Skill>) => {
    onChange(
      skills.map((skill) =>
        skill.id === id ? { ...skill, ...updates } : skill
      )
    );
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case "beginner":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "intermediate":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "advanced":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "expert":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Skills Section */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
          Technical & Professional Skills *
        </h4>
        {skills.filter((skill) => skill.category === "skill").length > 0 ? (
          <div className="space-y-2">
            {skills
              .filter((skill) => skill.category === "skill")
              .map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {skill.name}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getProficiencyColor(
                        skill.proficiency
                      )}`}
                    >
                      {skill.proficiency}
                    </span>
                    {skill.yearsExperience && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {skill.yearsExperience} year
                        {skill.yearsExperience !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm italic mb-4">
            No skills added yet.
          </p>
        )}
      </div>

      {/* Languages Section */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
          Languages *
        </h4>
        {skills.filter((skill) => skill.category === "language").length > 0 ? (
          <div className="space-y-2">
            {skills
              .filter((skill) => skill.category === "language")
              .map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {skill.name}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getProficiencyColor(
                        skill.proficiency
                      )}`}
                    >
                      {skill.proficiency}
                    </span>
                    {skill.yearsExperience && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {skill.yearsExperience} year
                        {skill.yearsExperience !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm italic mb-4">
            No languages added yet.
          </p>
        )}
      </div>

      {/* Add New Skill/Language */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Add New Skill or Language
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <select
              value={newSkillCategory}
              onChange={(e) =>
                setNewSkillCategory(e.target.value as "skill" | "language")
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            >
              <option value="skill">Skill</option>
              <option value="language">Language</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addSkill()}
              placeholder={
                newSkillCategory === "language"
                  ? "Enter language name (e.g., Arabic, English)"
                  : "Enter skill name (e.g., JavaScript, Project Management)"
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <select
              value={newSkillProficiency}
              onChange={(e) => setNewSkillProficiency(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0"
              max="50"
              value={newSkillYears}
              onChange={(e) => setNewSkillYears(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              placeholder="Years"
            />
            <button
              type="button"
              onClick={addSkill}
              disabled={!newSkillName.trim()}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Toggle Suggestions Button */}
        <button
          type="button"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center space-x-1 mt-2"
        >
          <BookOpen className="h-4 w-4" />
          <span>{showSuggestions ? "Hide" : "Show"} Skill Suggestions</span>
        </button>

        {/* Skill Suggestions */}
        {showSuggestions && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg shadow-md">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Suggested Skills:
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(skillSuggestions).map(([category, skills]) => (
                <div key={category}>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    {category}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => {
                          setNewSkillName(skill);
                          setNewSkillCategory(
                            category === "Languages" ? "language" : "skill"
                          );
                          setShowSuggestions(false);
                        }}
                        className="px-3 py-1 bg-gray-200 dark:bg-slate-600 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {skills.filter((skill) => skill.category === "skill").length === 0 &&
        skills.filter((skill) => skill.category === "language").length ===
          0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm italic">
            No skills or languages added yet. Add technical skills and languages
            with their proficiency levels.
          </p>
        )}
    </div>
  );
};

export default ResourceCreatePage;
