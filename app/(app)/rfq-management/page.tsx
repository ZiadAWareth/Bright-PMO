"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { AddEntityModal } from "@/components/AddEntityModal";
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShoppingCart,
  Package,
  Wrench,
  Users,
  TrendingUp,
  Calendar,
  Award,
  ExternalLink,
  Eye,
  Filter,
  Search,
  Save,
  Settings,
  X,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Procurement {
  procurement_id: number;
  project_id: number;
  wbs_id?: number; // Optional since not all procurements might have WBS
  type: string;
  description: string;
  estimated_cost: number;
  actual_cost: number;
  status: string;
  created_at: string;
  updated_at: string;
  project?: {
    project_id: number;
    name: string;
    project_code: string;
  };
}

interface RFQResponse {
  rfq_response_id: number;
  procurement_id: number;
  vendor_id: number;
  quote_amount: number;
  delivery_time: string;
  technical_score: number;
  commercial_score: number;
  total_score: number;
  status: "Submitted" | "Evaluated" | "Awarded" | "Rejected";
  submitted_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
  vendor?: {
    vendor_id: number;
    name: string;
    contact_person: string;
    contact_info: string;
    address: string;
    category: string;
    performance_rating: number;
  };
  procurement?: Procurement;
}

interface Vendor {
  vendor_id: number;
  name: string;
  contact_person: string;
  contact_info: string;
  address: string;
  category: string;
  performance_rating: number;
  created_at: string;
  updated_at: string;
}

// Helper function to format numbers with truncation
const formatNumber = (num: number): { display: string; full: string } => {
  if (!num || isNaN(num) || !isFinite(num)) {
    return { display: "0", full: "0" };
  }
  
  const full = num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const numStr = Math.abs(num).toString().split('.')[0]; // Get integer part, remove decimals
  
  // If number has 6 digits or less, show full value
  if (numStr.length <= 6) {
    return { display: full, full };
  }
  
  // For numbers with more than 6 digits, show exactly first 6 digits with dots
  // Just take first 6 digits and add dots - no comma formatting to keep it simple
  const firstSixDigits = numStr.substring(0, 6);
  const truncated = firstSixDigits + "...";
  
  return { display: truncated, full };
};

// Component to display truncated number with tooltip
const TruncatedNumber = ({ 
  value, 
  currency = "OMR", 
  className = "" 
}: { 
  value: number; 
  currency?: string;
  className?: string;
}) => {
  const { display, full } = formatNumber(value);
  const fullFormatted = value.toLocaleString();
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`break-words overflow-hidden ${className}`}>
          {currency} {display}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{currency} {fullFormatted}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const RFQManagementPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [rfqResponses, setRfqResponses] = useState<RFQResponse[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingRFQ, setGeneratingRFQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showRFQResponsesModal, setShowRFQResponsesModal] = useState(false);
  const [selectedRFQProcurement, setSelectedRFQProcurement] =
    useState<Procurement | null>(null);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showProcurementDetailsModal, setShowProcurementDetailsModal] =
    useState(false);
  const [selectedProcurement, setSelectedProcurement] =
    useState<Procurement | null>(null);
  const [showVendorDetailsModal, setShowVendorDetailsModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showRFQResponseDetailsModal, setShowRFQResponseDetailsModal] =
    useState(false);
  const [selectedRFQResponse, setSelectedRFQResponse] =
    useState<RFQResponse | null>(null);
  const [showAddProcurementModal, setShowAddProcurementModal] = useState(false);
  const [procurementForm, setProcurementForm] = useState({
    type: "",
    description: "",
    estimated_cost: "",
    actual_cost: "",
    status: "Planning",
  });
  const [isSubmittingProcurement, setIsSubmittingProcurement] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    contact_person: "",
    contact_info: "",
    address: "",
    category: "",
    performance_rating: "0",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);

    // Fetch all RFQ-related data
    Promise.all([
      axios.get(`/api/procurements`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
      axios
        .get(`/api/rfq-responses`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .catch((error) => {
          console.warn("No RFQ responses found yet:", error);
          return { data: [] };
        }),
      axios.get(`/api/vendors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
      axios
        .get(`/api/projects`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .catch((error) => {
          console.warn("No projects found yet:", error);
          console.error(
            "Projects API error details:",
            error.response?.data || error.message
          );
          return { data: [] };
        }),
    ])
      .then(([procRes, rfqRes, vendorRes, projectRes]) => {
        console.log("Projects response:", projectRes);
        console.log("Projects data:", projectRes.data);
        setProcurements(procRes.data);
        setRfqResponses(rfqRes.data || []);
        setVendors(vendorRes.data);
        setProjects(projectRes.data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        toast.error("Failed to load RFQ data");
        setLoading(false);
      });
  }, []);

  // Debug useEffect to log projects
  useEffect(() => {
    console.log("Projects state updated:", projects);
  }, [projects]);

  const generateRFQ = async (procurementId: number) => {
    try {
      setGeneratingRFQ(procurementId);
      
      // Check if user is authenticated
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }
      
      // Find the procurement to update
      const procurement = procurements.find(
        (p) => p.procurement_id === procurementId
      );
      if (!procurement) {
        toast.error("Procurement not found");
        return;
      }

      // Check if there are vendors available
      if (vendors.length === 0) {
        toast.error("No vendors available to send RFQ to. Please add vendors first.");
        return;
      }

      console.log(`Generating RFQ for procurement ${procurementId} with ${vendors.length} vendors`);

      // Update status to 'Tendering'
      console.log('Updating procurement status to Tendering:', procurement);
      const response = await axios.put(
        `/api/procurements/${procurementId}`,
        {
          project_id: procurement.project_id,
          wbs_id: procurement.wbs_id || null, // Handle case where wbs_id might not exist
          type: procurement.type,
          description: procurement.description,
          estimated_cost: procurement.estimated_cost,
          actual_cost: procurement.actual_cost,
          status: "Tendering",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        // Create RFQ responses for each vendor
        const rfqResponsePromises = vendors.map(async (vendor) => {
          try {
            const rfqResponseData = {
              procurement_id: procurementId,
              vendor_id: vendor.vendor_id,
              quote_amount: procurement.estimated_cost, // Default to estimated cost
              delivery_time: "30 days", // Default delivery time
              technical_score: 0, // Default scores to be updated later
              commercial_score: 0,
              status: "Submitted",
              notes: `RFQ automatically generated for ${vendor.name}`,
            };

            console.log(`Creating RFQ response for vendor ${vendor.name}:`, rfqResponseData);

            const response = await axios.post(`/api/rfq-responses`, rfqResponseData, {
              headers: { Authorization: `Bearer ${token}` },
            });

            console.log(`RFQ response created successfully for vendor ${vendor.name}:`, response.data);
            return response;
          } catch (error) {
            console.error(`Failed to create RFQ response for vendor ${vendor.name}:`, error);
            if (axios.isAxiosError(error)) {
              console.error('Error response:', error.response?.data);
              console.error('Error status:', error.response?.status);
            }
            throw error;
          }
        });

        // Wait for all RFQ responses to be created
        const rfqResponseResults = await Promise.allSettled(rfqResponsePromises);
        
        // Count successful and failed responses
        const successfulResponses = rfqResponseResults.filter(
          (result) => result.status === "fulfilled"
        ).length;
        const failedResponses = rfqResponseResults.filter(
          (result) => result.status === "rejected"
        ).length;

        // Update the procurements list in state
        setProcurements((prev) =>
          prev.map((p) =>
            p.procurement_id === procurementId
              ? { ...p, status: "Tendering" }
              : p
          )
        );

        // Refresh RFQ responses data
        try {
          const rfqResponsesResponse = await axios.get(`/api/rfq-responses`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setRfqResponses(rfqResponsesResponse.data || []);
        } catch (error) {
          console.warn("Failed to refresh RFQ responses:", error);
        }

        // Show appropriate success/warning message
        if (failedResponses === 0) {
          toast.success(
            `RFQ generated successfully! Created ${successfulResponses} vendor responses. Procurement is now open for bidding.`
          );
        } else {
          toast.warning(
            `RFQ partially generated. Created ${successfulResponses} responses, but ${failedResponses} failed. Check console for details.`
          );
        }

        // Log failed responses for debugging
        rfqResponseResults.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(`Failed to create RFQ response for vendor ${vendors[index].name}:`, result.reason);
          }
        });
      }
    } catch (error) {
      console.error("Error generating RFQ:", error);
      toast.error("Failed to generate RFQ");
    } finally {
      setGeneratingRFQ(null);
    }
  };

  const viewRFQResponses = (procurement: Procurement) => {
    setSelectedRFQProcurement(procurement);
    setShowRFQResponsesModal(true);
  };

  const awardContract = async (response: RFQResponse) => {
    try {
      const res = await axios.post(
        `/api/rfq-responses/${response.rfq_response_id}/award`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (res.status === 200) {
        toast.success("Contract awarded successfully");
        setShowRFQResponsesModal(false);
        // Refresh the data
        window.location.reload();
      }
    } catch (error) {
      console.error("Error awarding contract:", error);
      toast.error("Failed to award contract");
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields are not empty or whitespace-only
    if (!vendorForm.name || !vendorForm.name.trim()) {
      toast.error("Vendor name is required and cannot be empty.");
      return;
    }
    
    if (!vendorForm.contact_person || !vendorForm.contact_person.trim()) {
      toast.error("Contact person is required and cannot be empty.");
      return;
    }
    
    if (!vendorForm.contact_info || !vendorForm.contact_info.trim()) {
      toast.error("Contact information is required and cannot be empty.");
      return;
    }
    
    if (!vendorForm.address || !vendorForm.address.trim()) {
      toast.error("Address is required and cannot be empty.");
      return;
    }
    
    if (!vendorForm.category || !vendorForm.category.trim()) {
      toast.error("Category is required and cannot be empty.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await axios.post(
        `/api/vendors`,
        {
          name: vendorForm.name.trim(),
          contact_person: vendorForm.contact_person.trim(),
          contact_info: vendorForm.contact_info.trim(),
          address: vendorForm.address.trim(),
          category: vendorForm.category.trim(),
          performance_rating: parseFloat(vendorForm.performance_rating),
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (res.status === 201) {
        setVendors((prev) => [...prev, res.data]);
        setShowAddVendorModal(false);
        setVendorForm({
          name: "",
          contact_person: "",
          contact_info: "",
          address: "",
          category: "",
          performance_rating: "0",
        });
        toast.success("Vendor added successfully");
      }
    } catch (error) {
      console.error("Error adding vendor:", error);
      toast.error("Failed to add vendor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate description is not empty or whitespace-only
    if (!procurementForm.description || !procurementForm.description.trim()) {
      toast.error("Procurement description is required and cannot be empty.");
      return;
    }
    
    setIsSubmittingProcurement(true);
    try {
      // Use the first available project or create a default one
      let projectId =
        projects && projects.length > 0 ? projects[0].project_id : 1;

      const res = await axios.post(
        `/api/procurements`,
        {
          project_id: projectId,
          type: procurementForm.type,
          description: procurementForm.description.trim(),
          estimated_cost: parseFloat(procurementForm.estimated_cost),
          actual_cost: procurementForm.actual_cost
            ? parseFloat(procurementForm.actual_cost)
            : 0,
          status: procurementForm.status,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      console.log("Procurement response:", res);

      if (res.status === 201) {
        setProcurements((prev) => [...prev, res.data]);
        setShowAddProcurementModal(false);
        setProcurementForm({
          type: "",
          description: "",
          estimated_cost: "",
          actual_cost: "",
          status: "Planning",
        });
        toast.success("Procurement added successfully");
      }
    } catch (error: any) {
      console.error("Error adding procurement:", error);
      console.error("Error response:", error.response);
      toast.error("Failed to add procurement");
    } finally {
      setIsSubmittingProcurement(false);
    }
  };

  const openProcurementDetails = (procurement: Procurement) => {
    setSelectedProcurement(procurement);
    setShowProcurementDetailsModal(true);
  };

  const openVendorDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowVendorDetailsModal(true);
  };

  const openRFQResponseDetails = (response: RFQResponse) => {
    setSelectedRFQResponse(response);
    setShowRFQResponseDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Awarded":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Planning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Tendering":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "Evaluation":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "material":
        return <Package className="w-4 h-4" />;
      case "service":
        return <Wrench className="w-4 h-4" />;
      case "equipment":
        return <ShoppingCart className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getResponseStatusColor = (status: string) => {
    switch (status) {
      case "Awarded":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Evaluated":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Submitted":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  // Filter procurements based on search and filters
  const filteredProcurements = procurements.filter((procurement) => {
    const matchesSearch =
      procurement.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      procurement.project?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || procurement.status === statusFilter;
    const matchesType = typeFilter === "all" || procurement.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate statistics
  const totalProcurements = procurements.length;
  const totalActualCost = procurements.reduce(
    (sum, p) => sum + (p.actual_cost || 0),
    0
  );
  const activeRFQs = procurements.filter(
    (p) => p.status === "Tendering"
  ).length;
  const totalResponses = rfqResponses.length;
  const awardedContracts = rfqResponses.filter(
    (r) => r.status === "Awarded"
  ).length;
  const totalValue = procurements.reduce(
    (sum, p) => sum + (p.estimated_cost || 0),
    0
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: <TrendingUp size={16} /> },
    {
      id: "procurements",
      label: "All Procurements",
      icon: <ShoppingCart size={16} />,
    },
    { id: "responses", label: "RFQ Responses", icon: <Award size={16} /> },
    { id: "vendors", label: "Vendors", icon: <Users size={16} /> },
  ];

  return (
    <DashboardLayout title="RFQ Management">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage Request for Quotations across all projects
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center space-x-3">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Procurements
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {totalProcurements}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center space-x-3">
                  <Award className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Responses
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {totalResponses}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center space-x-3 min-w-0">
                  <DollarSign className="w-8 h-8 text-green-600 flex-shrink-0" />
                  <div className="min-w-0 overflow-hidden flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Actual Cost
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words overflow-hidden">
                      <TruncatedNumber 
                        value={totalActualCost}
                        className="text-gray-900 dark:text-gray-100"
                      />
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center space-x-3 min-w-0">
                  <DollarSign className="w-8 h-8 text-orange-600 flex-shrink-0" />
                  <div className="min-w-0 overflow-hidden flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Estimated Value
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words overflow-hidden">
                      <TruncatedNumber 
                        value={totalValue}
                        className="text-gray-900 dark:text-gray-100"
                      />
                    </p>
                  </div>
                </div>
              </div>

              {/* RFQ Status Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  RFQ Status Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {
                        procurements.filter((p) => p.status === "Planning")
                          .length
                      }
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Planning
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {activeRFQs}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Tendering
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {
                        procurements.filter((p) => p.status === "Awarded")
                          .length
                      }
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Awarded
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {awardedContracts}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Contracts
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent RFQ Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Recent RFQ Activity
                </h3>
                <div className="space-y-3">
                  {procurements
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .slice(0, 5)
                    .map((procurement) => (
                      <div
                        key={procurement.procurement_id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {getTypeIcon(procurement.type)}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {procurement.description}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {procurement.project?.name} •{" "}
                              <TruncatedNumber 
                                value={procurement.estimated_cost}
                                className="text-gray-600 dark:text-gray-400"
                              />
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                              procurement.status
                            )}`}
                          >
                            {procurement.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Procurements Tab */}
          {activeTab === "procurements" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    All Procurements
                  </h2>
                  <button
                    onClick={() => setShowAddProcurementModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Plus size={16} />
                    <span>Add Procurement</span>
                  </button>
                </div>

                <div className="mt-4">
                  <FilterBar
                    search={searchTerm}
                    onSearch={setSearchTerm}
                    searchPlaceholder="Search procurements by description or project…"
                    resultLabel={`${filteredProcurements.length} ${filteredProcurements.length === 1 ? "procurement" : "procurements"}`}
                    activeCount={
                      (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0)
                    }
                    onClear={() => {
                      setStatusFilter("all");
                      setTypeFilter("all");
                    }}
                  >
                    <FilterSelect
                      label="Type"
                      value={typeFilter}
                      onChange={setTypeFilter}
                      options={[
                        { value: "all", label: "All types" },
                        { value: "material", label: "Material" },
                        { value: "service", label: "Service" },
                        { value: "equipment", label: "Equipment" },
                      ]}
                    />
                    <FilterSelect
                      label="Status"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { value: "all", label: "All statuses" },
                        { value: "pending", label: "Pending" },
                        { value: "approved", label: "Approved" },
                        { value: "ordered", label: "Ordered" },
                        { value: "delivered", label: "Delivered" },
                        { value: "cancelled", label: "Cancelled" },
                      ]}
                    />
                  </FilterBar>
                </div>
              </div>

              {filteredProcurements.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No procurements found.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredProcurements.map((procurement) => (
                    <div
                      key={procurement.procurement_id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => openProcurementDetails(procurement)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            {getTypeIcon(procurement.type)}
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {procurement.description}
                            </h3>
                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              {procurement.type.toUpperCase()}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                                procurement.status
                              )}`}
                            >
                              {procurement.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div className="min-w-0 overflow-hidden">
                              <span className="text-gray-500 dark:text-gray-400">
                                Project:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100 break-words">
                                {procurement.project?.name || "N/A"}
                              </p>
                            </div>
                            <div className="min-w-0 overflow-hidden">
                              <span className="text-gray-500 dark:text-gray-400">
                                Estimated Cost:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100 break-words overflow-hidden">
                                <TruncatedNumber 
                                  value={procurement.estimated_cost}
                                  className="text-gray-900 dark:text-gray-100"
                                />
                              </p>
                            </div>
                            <div className="min-w-0 overflow-hidden">
                              <span className="text-gray-500 dark:text-gray-400">
                                Actual Cost:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100 break-words overflow-hidden">
                                <TruncatedNumber 
                                  value={procurement.actual_cost}
                                  className="text-gray-900 dark:text-gray-100"
                                />
                              </p>
                            </div>
                            <div className="min-w-0 overflow-hidden">
                              <span className="text-gray-500 dark:text-gray-400">
                                Created:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100 break-words">
                                {new Date(
                                  procurement.created_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {procurement.status === "Planning" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateRFQ(procurement.procurement_id);
                              }}
                              disabled={generatingRFQ === procurement.procurement_id}
                              className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                            >
                              {generatingRFQ === procurement.procurement_id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <span>Generate RFQ</span>
                              )}
                            </button>
                          )}
                          {procurement.status === "Tendering" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                viewRFQResponses(procurement);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Responses</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RFQ Responses Tab */}
          {activeTab === "responses" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  RFQ Responses
                </h2>
                <AddEntityModal
                  entityName="RFQ Response"
                  fields={[
                    {
                      name: "procurement_id",
                      label: "Procurement",
                      type: "select" as const,
                      required: true,
                      defaultValue: "",
                      options: procurements
                        .filter((p) =>
                          p.status === "Tendering" ||
                          p.status === "Planning" ||
                          p.status === "Approved"
                        )
                        .map((p) => ({
                          value: p.procurement_id.toString(),
                          label: `${p.description} (${
                            p.project?.name || "N/A"
                          }) - ${p.status}`,
                        })),
                    },
                    {
                      name: "vendor_id",
                      label: "Vendor",
                      type: "select" as const,
                      required: true,
                      defaultValue: "",
                      options: vendors.map((v) => ({
                        value: v.vendor_id.toString(),
                        label: v.name,
                      })),
                    },
                    {
                      name: "quote_amount",
                      label: "Quote Amount (OMR)",
                      type: "number" as const,
                      required: true,
                      defaultValue: "",
                      min: 0,
                    },
                    {
                      name: "delivery_time",
                      label: "Delivery Time (days)",
                      type: "number" as const,
                      required: true,
                      defaultValue: "",
                      min: 1,
                    },
                    {
                      name: "technical_score",
                      label: "Technical Score (0-100)",
                      type: "number" as const,
                      required: true,
                      defaultValue: "0",
                      min: 0,
                      max: 100,
                    },
                    {
                      name: "commercial_score",
                      label: "Commercial Score (0-100)",
                      type: "number" as const,
                      required: true,
                      defaultValue: "0",
                      min: 0,
                      max: 100,
                    },
                    {
                      name: "total_score",
                      label: "Total Score (0-100)",
                      type: "number" as const,
                      required: true,
                      defaultValue: "0",
                      min: 0,
                      max: 100,
                    },
                    {
                      name: "notes",
                      label: "Notes",
                      type: "textarea" as const,
                      required: false,
                      defaultValue: "",
                    },
                  ]}
                  onSubmit={async (data: Record<string, any>) => {
                    try {
                      console.log("Form data received:", data);

                      const requestData = {
                        procurement_id: parseInt(data.procurement_id),
                        vendor_id: parseInt(data.vendor_id),
                        quote_amount: parseFloat(data.quote_amount),
                        delivery_time: `${data.delivery_time} days`,
                        technical_score: parseFloat(data.technical_score) || 0,
                        commercial_score:
                          parseFloat(data.commercial_score) || 0,
                        total_score: parseFloat(data.total_score) || 0,
                        notes: data.notes || "",
                      };

                      console.log("Sending request data:", requestData);

                      const response = await axios.post(
                        `/api/rfq-responses`,
                        requestData,
                        {
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                              "token"
                            )}`,
                          },
                        }
                      );

                      if (response.status === 201) {
                        // Update the procurement status to "Awarded" and set actual cost
                        const procurement = procurements.find(
                          (p) =>
                            p.procurement_id === parseInt(data.procurement_id)
                        );
                        if (procurement) {
                          try {
                            await axios.put(
                              `/api/procurements/${procurement.procurement_id}`,
                              {
                                ...procurement,
                                status: "Awarded",
                                actual_cost: parseFloat(data.quote_amount),
                              },
                              {
                                headers: {
                                  Authorization: `Bearer ${localStorage.getItem(
                                    "token"
                                  )}`,
                                },
                              }
                            );
                          } catch (error) {
                            console.error(
                              "Error updating procurement status:",
                              error
                            );
                          }
                        }

                        toast.success(
                          "RFQ Response added successfully and procurement awarded!"
                        );

                        // Refresh both RFQ responses and procurements data
                        const [rfqResponsesResponse, procurementsResponse] =
                          await Promise.all([
                            axios.get(`/api/rfq-responses`, {
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                  "token"
                                )}`,
                              },
                            }),
                            axios.get(`/api/procurements`, {
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                  "token"
                                )}`,
                              },
                            }),
                          ]);

                        setRfqResponses(rfqResponsesResponse.data || []);
                        setProcurements(procurementsResponse.data || []);
                      }
                    } catch (error: any) {
                      console.error("Error adding RFQ response:", error);
                      toast.error(
                        error.response?.data?.error ||
                          error.response?.data?.message ||
                          "Failed to add RFQ response"
                      );
                    }
                  }}
                  triggerButton={
                    <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      <Plus size={16} />
                      <span>Add RFQ Response</span>
                    </button>
                  }
                />
              </div>

              {rfqResponses.length === 0 ? (
                <div className="p-8 text-center">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No RFQ responses found.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rfqResponses.map((response) => (
                    <div
                      key={response.rfq_response_id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => openRFQResponseDetails(response)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <Award className="w-5 h-5 text-purple-600" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {response.procurement?.description ||
                                "Procurement Response"}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium ${getResponseStatusColor(
                                response.status
                              )}`}
                            >
                              {response.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                Vendor:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {response.vendor?.name || "N/A"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                Quote Amount:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                <TruncatedNumber 
                                  value={response.quote_amount}
                                  className="text-gray-900 dark:text-gray-100"
                                />
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                Total Score:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {response.total_score}/100
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                Submitted:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {new Date(
                                  response.submitted_date
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {response.status === "Evaluated" && (
                            <button
                              onClick={() => awardContract(response)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Award Contract
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vendors Tab */}
          {activeTab === "vendors" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Vendors
                </h2>
                <button
                  onClick={() => setShowAddVendorModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Vendor</span>
                </button>
              </div>

              {vendors.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No vendors found.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {vendors.map((vendor) => (
                    <div
                      key={vendor.vendor_id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => openVendorDetails(vendor)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {vendor.name}
                            </h3>
                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              {vendor.category}
                            </span>
                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              Rating: {vendor.performance_rating}/5
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                Contact Person:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {vendor.contact_person}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                Contact Info:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {vendor.contact_info}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                Address:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {vendor.address}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* RFQ Responses Modal */}
      <Dialog
        open={showRFQResponsesModal}
        onOpenChange={setShowRFQResponsesModal}
      >
        <DialogContent className="max-w-6xl w-[95vw] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg sm:text-xl pr-8">
              RFQ Responses - {selectedRFQProcurement?.description}
            </DialogTitle>
          </DialogHeader>

          {selectedRFQProcurement && (
            <div className="space-y-4 sm:space-y-6">
              {/* Procurement Details Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" />
                  Procurement Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0 overflow-hidden">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Estimated Cost
                    </div>
                    <div className="text-base sm:text-lg font-bold break-words overflow-hidden">
                      <TruncatedNumber 
                        value={selectedRFQProcurement.estimated_cost}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0 overflow-hidden">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Actual Cost
                    </div>
                    <div className="text-base sm:text-lg font-bold break-words overflow-hidden">
                      <TruncatedNumber 
                        value={selectedRFQProcurement.actual_cost}
                        className="text-green-600 dark:text-green-400"
                      />
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Type
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white capitalize break-words">
                      {selectedRFQProcurement.type}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Status
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white break-words">
                      {selectedRFQProcurement.status}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Project
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white break-words">
                      {selectedRFQProcurement.project?.name || "N/A"}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0 overflow-hidden">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Variance
                    </div>
                    <div className="text-base sm:text-lg font-bold break-words overflow-hidden">
                      <TruncatedNumber 
                        value={
                          selectedRFQProcurement.actual_cost -
                          selectedRFQProcurement.estimated_cost
                        }
                        className={
                          selectedRFQProcurement.actual_cost -
                            selectedRFQProcurement.estimated_cost >=
                          0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Responses List */}
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Vendor Responses
                </h4>
                {rfqResponses
                  .filter(
                    (response) =>
                      response.procurement_id ===
                      selectedRFQProcurement.procurement_id
                  )
                  .map((response) => (
                    <div
                      key={response.rfq_response_id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => openRFQResponseDetails(response)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                            <h5 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white break-words min-w-0 flex-1">
                              {response.vendor?.name}
                            </h5>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap flex-shrink-0 ${getResponseStatusColor(
                                response.status
                              )}`}
                            >
                              {response.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div className="min-w-0 overflow-hidden">
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 block mb-1">
                                Quote Amount:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base break-words overflow-hidden">
                                <TruncatedNumber 
                                  value={response.quote_amount}
                                  className="text-gray-900 dark:text-white"
                                />
                              </p>
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 block mb-1">
                                Delivery Time:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base break-words">
                                {response.delivery_time}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 block mb-1">
                                Technical Score:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                                {response.technical_score}/100
                              </p>
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 block mb-1">
                                Commercial Score:
                              </span>
                              <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                                {response.commercial_score}/100
                              </p>
                            </div>
                          </div>

                          {response.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 block mb-1">
                                Notes:
                              </span>
                              <p className="text-xs sm:text-sm text-gray-900 dark:text-white break-words">
                                {response.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {response.status === "Evaluated" && (
                          <div className="flex items-center justify-end sm:justify-start mt-3 sm:mt-0 sm:ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                awardContract(response);
                              }}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
                            >
                              Award Contract
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Vendor Modal */}
      <Dialog open={showAddVendorModal} onOpenChange={setShowAddVendorModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddVendor} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <Label
                  htmlFor="vendor-name"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                >
                  Vendor Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vendor-name"
                  type="text"
                  value={vendorForm.name}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                  placeholder="Enter vendor name"
                  required
                />
              </div>

              <div className="group">
                <Label
                  htmlFor="vendor-category"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                >
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={vendorForm.category}
                  onValueChange={(value: string) =>
                    setVendorForm({ ...vendorForm, category: value })
                  }
                >
                  <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="IT Services">IT Services</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Materials">Materials</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <Label
                  htmlFor="vendor-contact-person"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                >
                  Contact Person <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vendor-contact-person"
                  type="text"
                  value={vendorForm.contact_person}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      contact_person: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                  placeholder="Enter contact person name"
                  required
                />
              </div>

              <div className="group">
                <Label
                  htmlFor="vendor-contact-info"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                >
                  Contact Info <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vendor-contact-info"
                  type="text"
                  value={vendorForm.contact_info}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      contact_info: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                  placeholder="Enter email or phone"
                  required
                />
              </div>
            </div>

            <div className="group">
              <Label
                htmlFor="vendor-address"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="vendor-address"
                value={vendorForm.address}
                onChange={(e) =>
                  setVendorForm({ ...vendorForm, address: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                placeholder="Enter vendor address"
                rows={3}
                required
              />
            </div>

            <div className="group">
              <Label
                htmlFor="vendor-rating"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Performance Rating
              </Label>
              <Select
                value={vendorForm.performance_rating}
                onValueChange={(value: string) =>
                  setVendorForm({ ...vendorForm, performance_rating: value })
                }
              >
                <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Not Rated</SelectItem>
                  <SelectItem value="1">1 - Poor</SelectItem>
                  <SelectItem value="2">2 - Below Average</SelectItem>
                  <SelectItem value="3">3 - Average</SelectItem>
                  <SelectItem value="4">4 - Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddVendorModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Add Vendor</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Procurement Modal */}
      <Dialog
        open={showAddProcurementModal}
        onOpenChange={setShowAddProcurementModal}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Procurement Request</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddProcurement} className="space-y-6">
            <div className="group">
              <Label
                htmlFor="procurement-description"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Procurement Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="procurement-description"
                type="text"
                value={procurementForm.description}
                onChange={(e) =>
                  setProcurementForm({
                    ...procurementForm,
                    description: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                placeholder="Enter procurement description"
                required
              />
            </div>

            <div className="group">
              <Label
                htmlFor="procurement-type"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={procurementForm.type}
                onValueChange={(value: string) =>
                  setProcurementForm({ ...procurementForm, type: value })
                }
              >
                <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <Label
                  htmlFor="procurement-estimated-cost"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                >
                  Estimated Cost (OMR) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="procurement-estimated-cost"
                  type="text"
                  value={procurementForm.estimated_cost}
                  onChange={(e) =>
                    setProcurementForm({
                      ...procurementForm,
                      estimated_cost: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                  placeholder="Enter estimated cost"
                  required
                />
              </div>

              <div className="group">
                <Label
                  htmlFor="procurement-actual-cost"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                >
                  Actual Cost (OMR)
                </Label>
                <Input
                  id="procurement-actual-cost"
                  type="text"
                  value={procurementForm.actual_cost}
                  onChange={(e) =>
                    setProcurementForm({
                      ...procurementForm,
                      actual_cost: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300"
                  placeholder="Enter actual cost (optional)"
                />
              </div>
            </div>

            <div className="group">
              <Label
                htmlFor="procurement-status"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Status
              </Label>
              <Select
                value={procurementForm.status}
                onValueChange={(value: string) =>
                  setProcurementForm({ ...procurementForm, status: value })
                }
              >
                <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 group-hover:border-orange-300">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="Tendering">Tendering</SelectItem>
                  <SelectItem value="Evaluation">Evaluation</SelectItem>
                  <SelectItem value="Awarded">Awarded</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddProcurementModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingProcurement}
                className="flex items-center space-x-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingProcurement ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Add Procurement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Procurement Details Modal */}
      {showProcurementDetailsModal && selectedProcurement && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Procurement Details
              </h3>
              <button
                onClick={() => setShowProcurementDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3 mb-4">
                    {getTypeIcon(selectedProcurement.type)}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedProcurement.description}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {selectedProcurement.type.toUpperCase()}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        selectedProcurement.status
                      )}`}
                    >
                      {selectedProcurement.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Project
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedProcurement.project?.name || "N/A"}
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0 overflow-hidden">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Estimated Cost
                      </div>
                      <div className="text-lg font-bold break-words overflow-hidden">
                        <TruncatedNumber 
                          value={selectedProcurement.estimated_cost}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0 overflow-hidden">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Actual Cost
                      </div>
                      <div className="text-lg font-bold break-words overflow-hidden">
                        <TruncatedNumber 
                          value={selectedProcurement.actual_cost}
                          className="text-green-600 dark:text-green-400"
                        />
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 min-w-0 overflow-hidden">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Variance
                      </div>
                      <div className="text-lg font-bold break-words overflow-hidden">
                        <TruncatedNumber 
                          value={
                            selectedProcurement.actual_cost -
                            selectedProcurement.estimated_cost
                          }
                          className={
                            selectedProcurement.actual_cost -
                              selectedProcurement.estimated_cost >=
                            0
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Timeline
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          Created
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(
                            selectedProcurement.created_at
                          ).toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(
                            selectedProcurement.created_at
                          ).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    {selectedProcurement.updated_at !==
                      selectedProcurement.created_at && (
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            Last Updated
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(
                              selectedProcurement.updated_at
                            ).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(
                              selectedProcurement.updated_at
                            ).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Details Modal */}
      {showVendorDetailsModal && selectedVendor && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Vendor Details
              </h3>
              <button
                onClick={() => setShowVendorDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-3 mb-4">
                    <Users className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedVendor.name}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      {selectedVendor.category.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      Rating: {selectedVendor.performance_rating}/5
                    </span>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      Contact Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Contact Person
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedVendor.contact_person}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Contact Info
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedVendor.contact_info}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Address
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedVendor.address}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance & Timeline */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                      Performance & Timeline
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Performance Rating
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-lg font-medium text-gray-900 dark:text-white">
                            {selectedVendor.performance_rating}/5
                          </div>
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={16}
                                className={`${
                                  star <= selectedVendor.performance_rating
                                    ? "text-yellow-500 fill-current"
                                    : "text-gray-300 dark:text-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Created
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {new Date(
                            selectedVendor.created_at
                          ).toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(
                            selectedVendor.created_at
                          ).toLocaleTimeString()}
                        </div>
                      </div>
                      {selectedVendor.updated_at !==
                        selectedVendor.created_at && (
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Last Updated
                          </div>
                          <div className="text-lg font-medium text-gray-900 dark:text-white">
                            {new Date(
                              selectedVendor.updated_at
                            ).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(
                              selectedVendor.updated_at
                            ).toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RFQ Response Details Modal */}
      {showRFQResponseDetailsModal && selectedRFQResponse && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                RFQ Response Details
              </h3>
              <button
                onClick={() => setShowRFQResponseDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-3 mb-4">
                    <Users className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedRFQResponse.vendor?.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getResponseStatusColor(
                        selectedRFQResponse.status
                      )}`}
                    >
                      {selectedRFQResponse.status.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 break-words overflow-hidden max-w-full">
                      <TruncatedNumber 
                        value={selectedRFQResponse.quote_amount}
                        className="text-blue-800 dark:text-blue-300"
                      />
                    </span>
                  </div>
                </div>

                {/* Response Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-blue-600" />
                      Response Information
                    </h4>
                    <div className="space-y-4">
                      <div className="min-w-0 overflow-hidden">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Quote Amount
                        </div>
                        <div className="text-lg font-bold break-words overflow-hidden">
                          <TruncatedNumber 
                            value={selectedRFQResponse.quote_amount}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Delivery Time
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedRFQResponse.delivery_time}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Submitted Date
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {new Date(
                            selectedRFQResponse.submitted_date
                          ).toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(
                            selectedRFQResponse.submitted_date
                          ).toLocaleTimeString()}
                        </div>
                      </div>
                      {selectedRFQResponse.notes && (
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Notes
                          </div>
                          <div className="text-lg font-medium text-gray-900 dark:text-white">
                            {selectedRFQResponse.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scoring & Timeline */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                      Scoring & Timeline
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Technical Score
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedRFQResponse.technical_score}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Commercial Score
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedRFQResponse.commercial_score}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Total Score
                        </div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {selectedRFQResponse.total_score}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Created
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {new Date(
                            selectedRFQResponse.created_at
                          ).toLocaleDateString()}{" "}
                          at{" "}
                          {new Date(
                            selectedRFQResponse.created_at
                          ).toLocaleTimeString()}
                        </div>
                      </div>
                      {selectedRFQResponse.updated_at !==
                        selectedRFQResponse.created_at && (
                        <div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Last Updated
                          </div>
                          <div className="text-lg font-medium text-gray-900 dark:text-white">
                            {new Date(
                              selectedRFQResponse.updated_at
                            ).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(
                              selectedRFQResponse.updated_at
                            ).toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Procurement Context */}
                {selectedRFQResponse.procurement && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-orange-600" />
                      Procurement Context
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Procurement
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedRFQResponse.procurement.description}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Type
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                          {selectedRFQResponse.procurement.type}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Status
                        </div>
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedRFQResponse.procurement.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RFQManagementPage;
