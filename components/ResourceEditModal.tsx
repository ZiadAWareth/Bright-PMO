"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Building,
  DollarSign,
  Clock,
  Award,
  Mail,
  Plus,
  X,
  Edit2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

interface Skill {
  name: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  category: string;
  verified: boolean;
  yearsExperience: number;
}

interface Resource {
  resource_id: number;
  name: string;
  type: "labor" | "equipment" | "material";
  role: string;
  skills: any;
  rate: number;
  capacity: number;
  availability_status: string;
  department: string;
  email?: string;
  phone_number?: string;
  location?: string;
  created_at: string;
  updated_at: string;
  rating?: number; // Optional field for performance rating
}

interface ResourceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: number | null;
  onSuccess: () => void;
}

const ResourceEditModal: React.FC<ResourceEditModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resource, setResource] = useState<Resource | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(
    null
  );
  const [phoneError, setPhoneError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [skillForm, setSkillForm] = useState<Skill>({
    name: "",
    level: "intermediate",
    category: "",
    verified: false,
    yearsExperience: 1,
  });

  const [formData, setFormData] = useState<{
    name: string;
    type: "labor" | "equipment" | "material";
    role: string;
    rate: number;
    capacity: number;
    availability_status: string;
    department: string;
    email: string;
    phone_number: string;
    location: string;
    rating: number;
    unit: string;
    quantity: number;
  }>({
    name: "",
    type: "labor",
    role: "",
    rate: 0,
    capacity: 40,
    availability_status: "available",
    department: "",
    email: "",
    phone_number: "",
    location: "",
    rating: 0,
    unit: "",
    quantity: 0,
  });

  // Predefined skill categories and levels for better UX
  const skillCategories = [
    "Project Management",
    "Civil Engineering",
    "Structural Engineering",
    "Architecture",
    "Construction Management",
    "Equipment Operation",
    "Safety Management",
    "Quality Control",
    "Cost Estimation",
    "language",
    "Other",
  ];

  const skillLevels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "expert", label: "Expert" },
  ];

  useEffect(() => {
    if (isOpen && resourceId) {
      fetchResource();
    }
  }, [isOpen, resourceId]);

  // Handle resource type changes - clear skills for materials
  useEffect(() => {
    if (formData.type === "material") {
      setSkills([]);
    }
  }, [formData.type]);

  const fetchResource = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/resources/${resourceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setResource(data);

        // Parse skills from JSON (skip for materials)
        let parsedSkills: Skill[] = [];
        if (data.type !== "material") {
          try {
            if (typeof data.skills === "string") {
              const skillsObj = JSON.parse(data.skills);
              // Handle new format with Skills and Languages arrays
              if (skillsObj.Skills && Array.isArray(skillsObj.Skills)) {
                parsedSkills = [...skillsObj.Skills];
              }
              if (skillsObj.Languages && Array.isArray(skillsObj.Languages)) {
                // Convert languages to skills format
                const languageSkills = skillsObj.Languages.map((lang: any) => ({
                  name: lang.name,
                  level: lang.proficiency || "intermediate",
                  category: "language",
                  verified: false,
                  yearsExperience: lang.yearsExperience || 1,
                }));
                parsedSkills = [...parsedSkills, ...languageSkills];
              }
            } else if (typeof data.skills === "object" && data.skills !== null) {
              // Handle direct object format
              if (data.skills.Skills && Array.isArray(data.skills.Skills)) {
                parsedSkills = [...data.skills.Skills];
              }
              if (data.skills.Languages && Array.isArray(data.skills.Languages)) {
                // Convert languages to skills format
                const languageSkills = data.skills.Languages.map((lang: any) => ({
                  name: lang.name,
                  level: lang.proficiency || "intermediate",
                  category: "language",
                  verified: false,
                  yearsExperience: lang.yearsExperience || 1,
                }));
                parsedSkills = [...parsedSkills, ...languageSkills];
              }
            } else if (Array.isArray(data.skills)) {
              // Handle legacy array format
              parsedSkills = data.skills;
            }
          } catch (e) {
            console.warn("Failed to parse skills:", e);
            parsedSkills = [];
          }
        }
        setSkills(parsedSkills);

        setFormData({
          name: data.name || "",
          type: data.type || "labor",
          role: data.role || "",
          rate: data.rate || 0,
          capacity: data.capacity || 40,
          availability_status: data.availability_status || "available",
          department: data.department || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          location: data.location || "",
          rating: data.rating ?? 0,
          unit: data.unit || "",
          quantity: data.quantity || 0,
        });
      } else {
        toast.error("Resource not found");
        onClose();
      }
    } catch (error) {
      console.error("Error fetching resource:", error);
      toast.error("Failed to fetch resource");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Validate email if it's a labor resource
      if (formData.type === "labor" && formData.email) {
        if (!validateEmail(formData.email)) {
          toast.error("Please enter a valid email address");
          setIsSaving(false);
          return;
        }
      }

      // Validate phone number if it's a labor resource
      if (formData.type === "labor" && formData.phone_number) {
        if (!validatePhoneNumber(formData.phone_number)) {
          toast.error("Please enter a valid phone number (only digits, spaces, dashes, parentheses, and + sign allowed)");
          setIsSaving(false);
          return;
        }
      }

      // Convert skills back to the new format
      const skillsData = formData.type === "material" 
        ? { Skills: [], Languages: [] } // Empty skills for materials
        : {
            Skills: skills.filter((skill) => skill.category !== "language"),
            Languages: skills
              .filter((skill) => skill.category === "language")
              .map((skill) => ({
                id: Date.now().toString() + Math.random(),
                name: skill.name,
                proficiency: skill.level,
                category: "language",
                yearsExperience: skill.yearsExperience,
              })),
          };

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          skills: skillsData,
          updated_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Resource updated successfully!");
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        
        // Handle duplicate errors with specific messages
        if (response.status === 409) {
          toast.error(errorData.error || "A duplicate resource already exists");
        } else {
          toast.error(
            `Failed to update resource: ${errorData.error || "Unknown error"}`
          );
        }
      }
    } catch (error) {
      console.error("Error updating resource:", error);
      toast.error("Failed to update resource. Please try again.");
    } finally {
      setIsSaving(false);
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

  const handleInputChange = (field: string, value: string | number) => {
    // Special handling for email field
    if (field === "email" && typeof value === "string") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      if (value.trim()) {
        validateEmail(value);
      } else {
        setEmailError("");
      }
    }
    // Special handling for phone_number field
    else if (field === "phone_number" && typeof value === "string") {
      // First convert Arabic numerals to English
      let converted = convertArabicToEnglish(value);
      // Filter out invalid characters - only allow digits, spaces, dashes, parentheses, and + sign
      const filtered = converted.replace(/[^\d\s\-\(\)\+]/g, '');
      setFormData((prev) => ({
        ...prev,
        [field]: filtered,
      }));
      if (filtered.trim()) {
        validatePhoneNumber(filtered);
      } else {
        setPhoneError("");
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleAddSkill = () => {
    setEditingSkillIndex(null);
    setSkillForm({
      name: "",
      level: "intermediate",
      category: "",
      verified: false,
      yearsExperience: 1,
    });
    setShowSkillModal(true);
  };

  const handleEditSkill = (index: number) => {
    setEditingSkillIndex(index);
    setSkillForm(skills[index]);
    setShowSkillModal(true);
  };

  const handleSaveSkill = () => {
    if (!skillForm.name.trim()) {
      toast.error("Skill name is required");
      return;
    }

    if (editingSkillIndex !== null) {
      // Edit existing skill
      const updatedSkills = [...skills];
      updatedSkills[editingSkillIndex] = skillForm;
      setSkills(updatedSkills);
    } else {
      // Add new skill
      setSkills([...skills, skillForm]);
    }

    setShowSkillModal(false);
  };

  const handleRemoveSkill = (index: number) => {
    const updatedSkills = skills.filter((_, i) => i !== index);
    setSkills(updatedSkills);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "advanced":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "expert":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  // Compute and auto-update stock status
  const computeStockStatus = (qty: number): string => {
    if (qty < 10) return "available";
    if (qty < 12) return "on_leave";
    return "inactive";
  };
  useEffect(() => {
    if (formData.type === "material") {
      const status = computeStockStatus(formData.quantity);
      setFormData(prev => ({ ...prev, availability_status: status }));
    }
  }, [formData.quantity, formData.type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Resource
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Update resource information and settings
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  {(formData.type as string) !== "material" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role/Position *
                      </label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) =>
                          handleInputChange("role", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        placeholder="e.g., Senior Developer, Project Manager"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Department & Type */}
              {(formData.type as string) !== "material" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Department & Type
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department *
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) =>
                          handleInputChange("department", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        placeholder="e.g., Oil & Gas, Construction, IT, Finance"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Resource Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          handleInputChange("type", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        required
                      >
                        <option value="labor">Labor</option>
                        <option value="equipment">Equipment</option>
                        <option value="material">Material</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Information */}
              {(formData.type as string) !== "material" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Financial Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {(formData.type as string) === "material" ? "Cost per kg (OMR) *" : "Hourly Rate (OMR) *"}
                      </label>
                      <input
                        type="number"
                        value={formData.rate}
                        onChange={(e) =>
                          handleInputChange(
                            "rate",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        placeholder={(formData.type as string) === "material" ? "5.50" : "25.00"}
                        min="0"
                        step="0.01"
                        required
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
                        {(formData.type as string) === "material" ? "Capacity (kg) *" : "Daily Capacity (hours) *"}
                      </label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) =>
                          handleInputChange(
                            "capacity",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        placeholder={(formData.type as string) === "material" ? "1000" : "40"}
                        min="0"
                        required
                      />
                      {(formData.type as string) === "material" && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Maximum inventory capacity in kilograms
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Material Inventory Edit: only for material */}
              {(formData.type as string) === "material" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Material Inventory
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location *
                      </label>
                      <select
                        value={formData.location}
                        onChange={e => handleInputChange("location", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        required
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Unit *
                      </label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={e => handleInputChange("unit", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        placeholder="e.g., kg, ltr"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={e => handleInputChange("quantity", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Stock Status
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {formData.availability_status === "available" ? "In Stock" : formData.availability_status === "on_leave" ? "Low Stock" : "Out of Stock"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Availability & Skills */}
              {(formData.type as string) !== "material" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Availability & Skills
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Availability Status *
                      </label>
                      <select
                        value={formData.availability_status}
                        onChange={(e) =>
                          handleInputChange("availability_status", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        required
                      >
                        {(formData.type as string) === "material" ? (
                          <>
                            <option value="available">In Stock</option>
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
                    {/* Skills section - only for non-material resources */}
                    {(formData.type as string) !== "material" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Skills Management
                        </label>
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {skills.map((skill, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {skill.name}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${getLevelColor(
                                      skill.level
                                    )}`}
                                  >
                                    {skill.level}
                                  </span>
                                  {skill.verified && (
                                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      Verified
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {skill.category} • {skill.yearsExperience} year
                                  {skill.yearsExperience !== 1 ? "s" : ""}{" "}
                                  experience
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditSkill(index)}
                                  className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSkill(index)}
                                  className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleAddSkill}
                            className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-orange-500 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:text-orange-400 transition-colors flex items-center justify-center space-x-2"
                          >
                            <Plus size={16} />
                            <span>Add Skill</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rating */}
              {(formData.type as string) !== "material" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Performance Rating
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Rating (1-5)
                      </label>
                      <input
                        type="number"
                        value={formData.rating}
                        onChange={(e) =>
                          handleInputChange(
                            "rating",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        placeholder="1 to 5"
                        min="0"
                        max="5"
                        step="1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information - Show for labor and equipment, required only for labor */}
              {(formData.type as string) !== "material" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Mail className="w-5 h-5 mr-2" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email {formData.type === "labor" ? "*" : ""}
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white ${
                          emailError
                            ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
                            : "border-gray-300 dark:border-slate-600"
                        }`}
                        placeholder="email@example.com"
                        required={formData.type === "labor"}
                      />
                      {emailError && (
                        <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                          <span className="text-xs">{emailError}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number {formData.type === "labor" ? "*" : ""}
                      </label>
                      <input
                        type="text"
                        value={formData.phone_number}
                        onChange={(e) =>
                          handleInputChange("phone_number", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white ${
                          phoneError
                            ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
                            : "border-gray-300 dark:border-slate-600"
                        }`}
                        placeholder="+968 xxxx xxxx"
                        required={formData.type === "labor"}
                      />
                      {phoneError && (
                        <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                          <span className="text-xs">{phoneError}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location {formData.type === "labor" ? "*" : ""}
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) =>
                          handleInputChange("location", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                        placeholder="e.g., Muscat, Oman"
                        required={formData.type === "labor"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save size={16} />
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Skills Modal */}
        {showSkillModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingSkillIndex !== null ? "Edit Skill" : "Add New Skill"}
                </h3>
                <button
                  onClick={() => setShowSkillModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Skill Name *
                  </label>
                  <input
                    type="text"
                    value={skillForm.name}
                    onChange={(e) =>
                      setSkillForm({ ...skillForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                    placeholder="e.g., JavaScript, Project Management"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={skillForm.category}
                    onChange={(e) =>
                      setSkillForm({ ...skillForm, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">Select Category</option>
                    {skillCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Skill Level
                    </label>
                    <select
                      value={skillForm.level}
                      onChange={(e) =>
                        setSkillForm({
                          ...skillForm,
                          level: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                    >
                      {skillLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Years Experience
                    </label>
                    <input
                      type="number"
                      value={skillForm.yearsExperience}
                      onChange={(e) =>
                        setSkillForm({
                          ...skillForm,
                          yearsExperience: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                      min="0"
                      max="50"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="verified"
                    checked={skillForm.verified}
                    onChange={(e) =>
                      setSkillForm({ ...skillForm, verified: e.target.checked })
                    }
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label
                    htmlFor="verified"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Skill is verified/certified
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowSkillModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSkill}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  {editingSkillIndex !== null ? "Update Skill" : "Add Skill"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceEditModal;
