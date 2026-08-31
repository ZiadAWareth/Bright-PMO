"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LoadingState, Spinner } from "@/components/ui/spinner";
import { TabRow } from "@/components/ui/tab-row";
import RoleGuard from "@/components/auth/RoleGuard";
import { ListPagination } from "@/components/ui/list-pagination";
import { ViewToggle, type ListViewMode } from "@/components/ui/view-toggle";
import { PersonCell } from "@/components/ui/person-cell";
import {
  EmptyState,
  EntityCard,
  EntityCardFooter,
  EntityCardHeader,
  EntityProgress,
  EntityStat,
  EntityStats,
} from "@/components/ui/entity-card";
import {
  ListCard,
  ListHead,
  ListMessage,
  ListRow,
  NewButton,
  RowAction,
  RowActions,
  StatusBadge,
} from "@/components/ui/form-shell";
import {
  humanize,
  procurementStatusTone,
  ratingTone,
  rfqResponseStatusTone,
  scoreTone,
} from "@/lib/status-tone";

const PAGE_SIZE = 12;
const PROCUREMENT_COLUMNS = [
  "Description",
  "Project",
  "Type",
  "Status",
  "Estimated",
  "Actual",
  "Created",
];
const VENDOR_COLUMNS = [
  "Vendor",
  "Contact",
  "Contact info",
  "Category",
  "Address",
  "Rating",
];
const RESPONSE_COLUMNS = [
  "Procurement",
  "Vendor",
  "Quote",
  "Delivery",
  "Score",
  "Status",
  "Submitted",
];

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
  const searchParams = useSearchParams();
  // The vendor/procurement create pages link back with a tab query param
  // (e.g. ?tab=vendors) so creating one returns to the right list.
  const initialTab = searchParams?.get("tab") ?? "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [rfqResponses, setRfqResponses] = useState<RFQResponse[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingRFQ, setGeneratingRFQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState("all");
  const [view, setView] = useState<ListViewMode>("grid");
  const [page, setPage] = useState(0);
  const [vendorPage, setVendorPage] = useState(0);
  const [responseSearch, setResponseSearch] = useState("");
  const [responseStatusFilter, setResponseStatusFilter] = useState("all");
  const [responsePage, setResponsePage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showRFQResponsesModal, setShowRFQResponsesModal] = useState(false);
  const [selectedRFQProcurement, setSelectedRFQProcurement] =
    useState<Procurement | null>(null);
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
    ])
      .then(([procRes, rfqRes, vendorRes]) => {
        setProcurements(procRes.data);
        setRfqResponses(rfqRes.data || []);
        setVendors(vendorRes.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        toast.error("Failed to load RFQ data");
        setLoading(false);
      });
  }, []);

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
        return "bg-success-soft text-success  ";
      case "Awarded":
        return "bg-info-soft text-info  ";
      case "Planning":
        return "bg-warning-soft text-warning  ";
      case "Tendering":
        return "bg-bright-soft text-bright  ";
      case "Evaluation":
        return "bg-accent-violet-soft text-accent-violet  ";
      default:
        return "bg-surface-2 text-ink-2  ";
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
        return "bg-success-soft text-success  ";
      case "Evaluated":
        return "bg-info-soft text-info  ";
      case "Submitted":
        return "bg-warning-soft text-warning  ";
      case "Rejected":
        return "bg-danger-soft text-danger  ";
      default:
        return "bg-surface-2 text-ink-2  ";
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

  /**
   * The vendors tab previously rendered the full list with no search, filter or
   * pagination at all, so it kept its own filter state — a category chosen on
   * the procurements tab means nothing here.
   */
  const vendorCategories = Array.from(
    new Set(vendors.map((v) => v.category).filter(Boolean))
  ).sort();

  const filteredVendors = vendors.filter((vendor) => {
    const term = vendorSearch.trim().toLowerCase();
    const matchesSearch =
      !term ||
      vendor.name.toLowerCase().includes(term) ||
      (vendor.contact_person ?? "").toLowerCase().includes(term) ||
      (vendor.contact_info ?? "").toLowerCase().includes(term) ||
      (vendor.category ?? "").toLowerCase().includes(term);
    const matchesCategory =
      vendorCategoryFilter === "all" || vendor.category === vendorCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const procurementPageCount = Math.max(
    1,
    Math.ceil(filteredProcurements.length / PAGE_SIZE)
  );
  const pagedProcurements = filteredProcurements.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );
  const vendorPageCount = Math.max(
    1,
    Math.ceil(filteredVendors.length / PAGE_SIZE)
  );
  const pagedVendors = filteredVendors.slice(
    vendorPage * PAGE_SIZE,
    (vendorPage + 1) * PAGE_SIZE
  );

  /*
   * The responses tab, like vendors before it, rendered every row with no
   * search, filter or pagination. It keeps its own filter state for the same
   * reason: a status chosen on the procurements tab describes a procurement,
   * not a bid, so sharing the control would silently mean something different.
   */
  const filteredResponses = rfqResponses.filter((response) => {
    const term = responseSearch.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (response.procurement?.description ?? "").toLowerCase().includes(term) ||
      (response.vendor?.name ?? "").toLowerCase().includes(term) ||
      (response.notes ?? "").toLowerCase().includes(term);
    const matchesStatus =
      responseStatusFilter === "all" || response.status === responseStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const responsePageCount = Math.max(
    1,
    Math.ceil(filteredResponses.length / PAGE_SIZE)
  );
  const pagedResponses = filteredResponses.slice(
    responsePage * PAGE_SIZE,
    (responsePage + 1) * PAGE_SIZE
  );

  // Filtering changes what "page 1" means, so reset rather than stranding the
  // user on a page index that no longer has rows.
  useEffect(
    () => setPage(0),
    [searchTerm, statusFilter, typeFilter, view]
  );
  useEffect(
    () => setVendorPage(0),
    [vendorSearch, vendorCategoryFilter, view]
  );
  useEffect(
    () => setResponsePage(0),
    [responseSearch, responseStatusFilter, view]
  );

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
    <RoleGuard route="/rfq-management" title="RFQ Management">
    <DashboardLayout
      title="RFQ Management"
      subtitle="Manage Request for Quotations across all projects."
      actions={
        <>
          {/* Responses now paginate too, so the toggle applies to all three
              list tabs; only the overview has nothing to switch. */}
          {activeTab !== "overview" && (
            <ViewToggle value={view} onChange={setView} />
          )}
          {activeTab === "vendors" ? (
            <NewButton
              label="Add vendor"
              onClick={() => router.push("/rfq-management/vendors/new")}
            />
          ) : activeTab === "responses" ? (
            <NewButton
              label="Add RFQ response"
              onClick={() => router.push("/rfq-management/responses/new")}
            />
          ) : (
            <NewButton
              label="Add procurement"
              onClick={() => router.push("/rfq-management/procurements/new")}
            />
          )}
        </>
      }
    >
      <TabRow tabs={tabs} value={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface rounded-xl shadow p-4 flex items-center space-x-3">
                  <ShoppingCart className="w-8 h-8 text-info" />
                  <div>
                    <p className="text-sm text-muted">
                      Total Procurements
                    </p>
                    <p className="text-lg font-semibold text-ink">
                      {totalProcurements}
                    </p>
                  </div>
                </div>
                <div className="bg-surface rounded-xl shadow p-4 flex items-center space-x-3">
                  <Award className="w-8 h-8 text-accent-violet" />
                  <div>
                    <p className="text-sm text-muted">
                      Total Responses
                    </p>
                    <p className="text-lg font-semibold text-ink">
                      {totalResponses}
                    </p>
                  </div>
                </div>
                <div className="bg-surface rounded-xl shadow p-4 flex items-center space-x-3 min-w-0">
                  <DollarSign className="w-8 h-8 text-success flex-shrink-0" />
                  <div className="min-w-0 overflow-hidden flex-1">
                    <p className="text-sm text-muted">
                      Total Actual Cost
                    </p>
                    <p className="text-lg font-semibold text-ink break-words overflow-hidden">
                      <TruncatedNumber 
                        value={totalActualCost}
                        className="text-ink"
                      />
                    </p>
                  </div>
                </div>
                <div className="bg-surface rounded-xl shadow p-4 flex items-center space-x-3 min-w-0">
                  <DollarSign className="w-8 h-8 text-bright flex-shrink-0" />
                  <div className="min-w-0 overflow-hidden flex-1">
                    <p className="text-sm text-muted">
                      Total Estimated Value
                    </p>
                    <p className="text-lg font-semibold text-ink break-words overflow-hidden">
                      <TruncatedNumber 
                        value={totalValue}
                        className="text-ink"
                      />
                    </p>
                  </div>
                </div>
              </div>

              {/* RFQ Status Chart */}
              <div className="bg-surface rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-ink mb-4">
                  RFQ Status Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning">
                      {
                        procurements.filter((p) => p.status === "Planning")
                          .length
                      }
                    </div>
                    <div className="text-sm text-muted">
                      Planning
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-bright">
                      {activeRFQs}
                    </div>
                    <div className="text-sm text-muted">
                      Tendering
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-info">
                      {
                        procurements.filter((p) => p.status === "Awarded")
                          .length
                      }
                    </div>
                    <div className="text-sm text-muted">
                      Awarded
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">
                      {awardedContracts}
                    </div>
                    <div className="text-sm text-muted">
                      Contracts
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent RFQ Activity */}
              <div className="bg-surface rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-ink mb-4">
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
                        className="flex items-center justify-between p-3 bg-surface-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {getTypeIcon(procurement.type)}
                          <div>
                            <p className="font-medium text-ink">
                              {procurement.description}
                            </p>
                            <p className="text-sm text-muted">
                              {procurement.project?.name} •{" "}
                              <TruncatedNumber 
                                value={procurement.estimated_cost}
                                className="text-muted"
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
            <div className="space-y-6">
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

              {filteredProcurements.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart className="h-10 w-10" />}
                  title="No procurements found"
                  message={
                    procurements.length === 0
                      ? "No procurements have been raised yet."
                      : "Try adjusting your filters to see more results."
                  }
                  action={
                    procurements.length === 0 ? (
                      <NewButton
                        label="Add procurement"
                        onClick={() => router.push("/rfq-management/procurements/new")}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setTypeFilter("all");
                        }}
                        className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                      >
                        Clear all filters
                      </button>
                    )
                  }
                />
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {pagedProcurements.map((procurement) => (
                    <EntityCard
                      key={procurement.procurement_id}
                      onClick={() => openProcurementDetails(procurement)}
                    >
                      <EntityCardHeader
                        title={procurement.description}
                        subtitle={procurement.project?.name}
                        badges={
                          <>
                            <StatusBadge
                              label={humanize(procurement.status)}
                              tone={procurementStatusTone(procurement.status)}
                            />
                            <StatusBadge
                              label={humanize(procurement.type)}
                              tone="info"
                            />
                          </>
                        }
                      />

                      <EntityStats>
                        <EntityStat
                          icon={<DollarSign className="h-3.5 w-3.5" />}
                        >
                          Est. {formatNumber(procurement.estimated_cost).display}
                        </EntityStat>
                        <EntityStat
                          icon={<CheckCircle className="h-3.5 w-3.5" />}
                        >
                          Act. {formatNumber(procurement.actual_cost).display}
                        </EntityStat>
                      </EntityStats>

                      <EntityCardFooter
                        actions={
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {procurement.status === "Planning" && (
                              <button
                                type="button"
                                onClick={() =>
                                  generateRFQ(procurement.procurement_id)
                                }
                                disabled={
                                  generatingRFQ === procurement.procurement_id
                                }
                                className="inline-flex items-center gap-1.5 rounded-[8px] bg-bright px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-bright-deep disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {generatingRFQ ===
                                procurement.procurement_id ? (
                                  <>
                                    <Spinner size={12} />
                                    <span>Generating…</span>
                                  </>
                                ) : (
                                  <span>Generate RFQ</span>
                                )}
                              </button>
                            )}
                            {procurement.status === "Tendering" && (
                              <button
                                type="button"
                                onClick={() => viewRFQResponses(procurement)}
                                className="inline-flex items-center gap-1.5 rounded-[8px] border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-2"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Responses</span>
                              </button>
                            )}
                          </div>
                        }
                      >
                        <span className="text-[12px] text-faint">
                          {new Date(
                            procurement.created_at
                          ).toLocaleDateString()}
                        </span>
                      </EntityCardFooter>
                    </EntityCard>
                  ))}
                </div>
              ) : (
                <ListCard>
                  <table className="w-full border-collapse">
                    <ListHead columns={PROCUREMENT_COLUMNS} />
                    <tbody>
                      {pagedProcurements.length === 0 ? (
                        <ListMessage colSpan={PROCUREMENT_COLUMNS.length + 1}>
                          No procurements on this page.
                        </ListMessage>
                      ) : (
                        pagedProcurements.map((procurement) => (
                          <ListRow
                            key={procurement.procurement_id}
                            onClick={() => openProcurementDetails(procurement)}
                          >
                            <td className="max-w-[200px] px-4 py-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className="shrink-0 text-muted"
                                  aria-hidden="true"
                                >
                                  {getTypeIcon(procurement.type)}
                                </span>
                                <span className="truncate text-[13.5px] font-medium text-ink">
                                  {procurement.description}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[13.5px] text-ink-2">
                              {procurement.project?.name || (
                                <span className="text-faint">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <StatusBadge
                                label={humanize(procurement.type)}
                                tone="info"
                              />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <StatusBadge
                                label={humanize(procurement.status)}
                                tone={procurementStatusTone(
                                  procurement.status
                                )}
                              />
                            </td>
                            <td className="px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                              <TruncatedNumber
                                value={procurement.estimated_cost}
                                className="text-ink-2"
                              />
                            </td>
                            <td className="px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                              <TruncatedNumber
                                value={procurement.actual_cost}
                                className="text-ink-2"
                              />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-ink-2">
                              {new Date(
                                procurement.created_at
                              ).toLocaleDateString()}
                            </td>
                            <td
                              className="px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-2">
                                {procurement.status === "Planning" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      generateRFQ(procurement.procurement_id)
                                    }
                                    disabled={
                                      generatingRFQ ===
                                      procurement.procurement_id
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-[8px] bg-bright px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-bright-deep disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {generatingRFQ ===
                                    procurement.procurement_id ? (
                                      <>
                                        <Spinner size={12} />
                                        <span>Generating…</span>
                                      </>
                                    ) : (
                                      <span>Generate RFQ</span>
                                    )}
                                  </button>
                                )}
                                {procurement.status === "Tendering" && (
                                  <RowActions>
                                    <RowAction
                                      icon={Eye}
                                      label={`View responses for ${procurement.description}`}
                                      onClick={() =>
                                        viewRFQResponses(procurement)
                                      }
                                    />
                                  </RowActions>
                                )}
                              </div>
                            </td>
                          </ListRow>
                        ))
                      )}
                    </tbody>
                  </table>
                </ListCard>
              )}

              {filteredProcurements.length > 0 && (
                <ListPagination
                  page={page}
                  pageCount={procurementPageCount}
                  total={filteredProcurements.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  noun="procurement"
                />
              )}
            </div>
          )}

          {/* RFQ Responses Tab */}
          {activeTab === "responses" && (
            <div className="space-y-6">
              <FilterBar
                search={responseSearch}
                onSearch={setResponseSearch}
                searchPlaceholder="Search responses by procurement, vendor or notes…"
                resultLabel={`${filteredResponses.length} ${
                  filteredResponses.length === 1 ? "response" : "responses"
                }`}
                activeCount={responseStatusFilter !== "all" ? 1 : 0}
                onClear={() => setResponseStatusFilter("all")}
              >
                <FilterSelect
                  label="Status"
                  value={responseStatusFilter}
                  onChange={setResponseStatusFilter}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "Submitted", label: "Submitted" },
                    { value: "Evaluated", label: "Evaluated" },
                    { value: "Awarded", label: "Awarded" },
                    { value: "Rejected", label: "Rejected" },
                  ]}
                />
              </FilterBar>

              {filteredResponses.length === 0 ? (
                <EmptyState
                  icon={<Award className="h-10 w-10" />}
                  title="No RFQ responses found"
                  message={
                    rfqResponses.length === 0
                      ? "No vendor has submitted a bid yet."
                      : "Try adjusting your search or filter to see more results."
                  }
                  action={
                    rfqResponses.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setResponseSearch("");
                          setResponseStatusFilter("all");
                        }}
                        className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                      >
                        Clear all filters
                      </button>
                    ) : undefined
                  }
                />
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {pagedResponses.map((response) => (
                    <EntityCard
                      key={response.rfq_response_id}
                      onClick={() => openRFQResponseDetails(response)}
                    >
                      <EntityCardHeader
                        title={
                          response.procurement?.description ||
                          "Procurement Response"
                        }
                        subtitle={response.vendor?.name || "Unknown vendor"}
                        badges={
                          <StatusBadge
                            label={response.status}
                            tone={rfqResponseStatusTone(response.status)}
                          />
                        }
                      />

                      <EntityStats>
                        <EntityStat
                          icon={<DollarSign className="h-3.5 w-3.5" />}
                        >
                          <TruncatedNumber value={response.quote_amount} />
                        </EntityStat>
                        <EntityStat icon={<Clock className="h-3.5 w-3.5" />}>
                          {response.delivery_time || "—"}
                        </EntityStat>
                      </EntityStats>

                      {/*
                        * Total score is already a 0–100 figure, so it maps
                        * straight onto the bar with no rescaling.
                        */}
                      <EntityProgress
                        label="Evaluation score"
                        value={response.total_score}
                        display={`${response.total_score}/100`}
                        tone={
                          scoreTone(response.total_score) === "success"
                            ? "success"
                            : scoreTone(response.total_score) === "warning"
                              ? "warning"
                              : "danger"
                        }
                      />

                      <EntityCardFooter>
                        <PersonCell
                          name={response.vendor?.name || "Unknown vendor"}
                          subtitle={`Submitted ${new Date(
                            response.submitted_date
                          ).toLocaleDateString()}`}
                        />
                        {response.status === "Evaluated" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              awardContract(response);
                            }}
                            className="text-[13px] font-semibold text-success hover:opacity-80"
                          >
                            Award
                          </button>
                        )}
                      </EntityCardFooter>
                    </EntityCard>
                  ))}
                </div>
              ) : (
                <ListCard>
                  <table className="w-full border-collapse">
                    <ListHead columns={RESPONSE_COLUMNS} />
                    <tbody>
                      {pagedResponses.length === 0 ? (
                        <ListMessage colSpan={RESPONSE_COLUMNS.length + 1}>
                          No responses on this page.
                        </ListMessage>
                      ) : (
                        pagedResponses.map((response) => (
                          <ListRow
                            key={response.rfq_response_id}
                            onClick={() => openRFQResponseDetails(response)}
                          >
                            <td className="max-w-[280px] px-4 py-3">
                              <div className="min-w-0 truncate text-[13.5px] font-medium text-ink">
                                {response.procurement?.description || "—"}
                              </div>
                            </td>
                            <td className="max-w-[180px] px-4 py-3">
                              {response.vendor?.name ? (
                                <PersonCell name={response.vendor.name} />
                              ) : (
                                <span className="text-faint">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-ink-2">
                              <TruncatedNumber value={response.quote_amount} />
                            </td>
                            <td className="px-4 py-3 text-[13.5px] text-ink-2">
                              {response.delivery_time || (
                                <span className="text-faint">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <StatusBadge
                                label={`${response.total_score}/100`}
                                tone={scoreTone(response.total_score)}
                              />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <StatusBadge
                                label={response.status}
                                tone={rfqResponseStatusTone(response.status)}
                              />
                            </td>
                            <td className="px-4 py-3 text-[13.5px] text-ink-2">
                              {new Date(
                                response.submitted_date
                              ).toLocaleDateString()}
                            </td>
                            <td
                              className="px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <RowActions>
                                <RowAction
                                  icon={Eye}
                                  label="View response"
                                  onClick={() =>
                                    openRFQResponseDetails(response)
                                  }
                                />
                                {response.status === "Evaluated" && (
                                  <RowAction
                                    icon={Award}
                                    label="Award contract"
                                    onClick={() => awardContract(response)}
                                  />
                                )}
                              </RowActions>
                            </td>
                          </ListRow>
                        ))
                      )}
                    </tbody>
                  </table>
                </ListCard>
              )}

              {filteredResponses.length > 0 && (
                <ListPagination
                  page={responsePage}
                  pageCount={responsePageCount}
                  total={filteredResponses.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setResponsePage}
                  noun="response"
                />
              )}
            </div>
          )}

          {/* Vendors Tab */}
          {activeTab === "vendors" && (
            <div className="space-y-6">
              <FilterBar
                search={vendorSearch}
                onSearch={setVendorSearch}
                searchPlaceholder="Search vendors by name, contact or category…"
                resultLabel={`${filteredVendors.length} ${filteredVendors.length === 1 ? "vendor" : "vendors"}`}
                activeCount={vendorCategoryFilter !== "all" ? 1 : 0}
                onClear={() => setVendorCategoryFilter("all")}
              >
                <FilterSelect
                  label="Category"
                  value={vendorCategoryFilter}
                  onChange={setVendorCategoryFilter}
                  searchable={vendorCategories.length > 10}
                  options={[
                    { value: "all", label: "All categories" },
                    ...vendorCategories.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </FilterBar>

              {filteredVendors.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-10 w-10" />}
                  title="No vendors found"
                  message={
                    vendors.length === 0
                      ? "No vendors have been registered yet."
                      : "Try adjusting your search or filter to see more results."
                  }
                  action={
                    vendors.length === 0 ? (
                      <NewButton
                        label="Add vendor"
                        onClick={() => router.push("/rfq-management/vendors/new")}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setVendorSearch("");
                          setVendorCategoryFilter("all");
                        }}
                        className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                      >
                        Clear all filters
                      </button>
                    )
                  }
                />
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {pagedVendors.map((vendor) => (
                    <EntityCard
                      key={vendor.vendor_id}
                      onClick={() => openVendorDetails(vendor)}
                    >
                      <EntityCardHeader
                        title={vendor.name}
                        subtitle={vendor.address}
                        badges={
                          <>
                            {vendor.category && (
                              <StatusBadge label={vendor.category} tone="info" />
                            )}
                            <StatusBadge
                              label={`${vendor.performance_rating}/5`}
                              tone={ratingTone(vendor.performance_rating)}
                            />
                          </>
                        }
                      />

                      <EntityStats>
                        <EntityStat icon={<Users className="h-3.5 w-3.5" />}>
                          {vendor.contact_person || "No contact"}
                        </EntityStat>
                        <EntityStat icon={<FileText className="h-3.5 w-3.5" />}>
                          {vendor.contact_info || "—"}
                        </EntityStat>
                      </EntityStats>

                      {/*
                        * Rating is 0–5, so it is scaled to fill the bar while the
                        * printed figure stays on the familiar 5-point scale.
                        */}
                      <EntityProgress
                        label="Performance"
                        value={(vendor.performance_rating / 5) * 100}
                        display={`${vendor.performance_rating}/5`}
                        tone={
                          ratingTone(vendor.performance_rating) === "success"
                            ? "success"
                            : ratingTone(vendor.performance_rating) === "warning"
                              ? "warning"
                              : "danger"
                        }
                      />

                      <EntityCardFooter>
                        <PersonCell
                          name={vendor.contact_person || vendor.name}
                          subtitle={vendor.category || "Vendor"}
                        />
                      </EntityCardFooter>
                    </EntityCard>
                  ))}
                </div>
              ) : (
                <ListCard>
                  <table className="w-full border-collapse">
                    <ListHead columns={VENDOR_COLUMNS} />
                    <tbody>
                      {pagedVendors.length === 0 ? (
                        <ListMessage colSpan={VENDOR_COLUMNS.length + 1}>
                          No vendors on this page.
                        </ListMessage>
                      ) : (
                        pagedVendors.map((vendor) => (
                          <ListRow
                            key={vendor.vendor_id}
                            onClick={() => openVendorDetails(vendor)}
                          >
                            <td className="max-w-[200px] px-4 py-3">
                              <div className="min-w-0 truncate text-[13.5px] font-medium text-ink">
                                {vendor.name}
                              </div>
                            </td>
                            <td className="max-w-[180px] px-4 py-3">
                              {vendor.contact_person ? (
                                <PersonCell name={vendor.contact_person} />
                              ) : (
                                <span className="text-faint">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-[13.5px] text-ink-2">
                              {vendor.contact_info || (
                                <span className="text-faint">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {vendor.category ? (
                                <StatusBadge
                                  label={vendor.category}
                                  tone="info"
                                />
                              ) : (
                                <span className="text-faint">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-[13.5px] text-ink-2">
                              {vendor.address || (
                                <span className="text-faint">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <StatusBadge
                                label={`${vendor.performance_rating}/5`}
                                tone={ratingTone(vendor.performance_rating)}
                              />
                            </td>
                            <td
                              className="px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <RowActions>
                                <RowAction
                                  icon={Eye}
                                  label={`View ${vendor.name}`}
                                  onClick={() => openVendorDetails(vendor)}
                                />
                              </RowActions>
                            </td>
                          </ListRow>
                        ))
                      )}
                    </tbody>
                  </table>
                </ListCard>
              )}

              {filteredVendors.length > 0 && (
                <ListPagination
                  page={vendorPage}
                  pageCount={vendorPageCount}
                  total={filteredVendors.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setVendorPage}
                  noun="vendor"
                />
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
              <div className="bg-gradient-to-r from-info-soft to-accent-indigo-soft rounded-xl p-4 sm:p-6 border border-info">
                <h4 className="text-base sm:text-lg font-semibold text-ink mb-3 sm:mb-4 flex items-center">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-info flex-shrink-0" />
                  Procurement Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white/80 rounded-lg p-3 min-w-0 overflow-hidden">
                    <div className="text-xs sm:text-sm text-muted mb-1">
                      Estimated Cost
                    </div>
                    <div className="text-base sm:text-lg font-bold break-words overflow-hidden">
                      <TruncatedNumber 
                        value={selectedRFQProcurement.estimated_cost}
                        className="text-info"
                      />
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 min-w-0 overflow-hidden">
                    <div className="text-xs sm:text-sm text-muted mb-1">
                      Actual Cost
                    </div>
                    <div className="text-base sm:text-lg font-bold break-words overflow-hidden">
                      <TruncatedNumber 
                        value={selectedRFQProcurement.actual_cost}
                        className="text-success"
                      />
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 min-w-0">
                    <div className="text-xs sm:text-sm text-muted mb-1">
                      Type
                    </div>
                    <div className="text-base sm:text-lg font-bold text-ink capitalize break-words">
                      {selectedRFQProcurement.type}
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 min-w-0">
                    <div className="text-xs sm:text-sm text-muted mb-1">
                      Status
                    </div>
                    <div className="text-base sm:text-lg font-bold text-ink break-words">
                      {selectedRFQProcurement.status}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                  <div className="bg-white/80 rounded-lg p-3 min-w-0">
                    <div className="text-xs sm:text-sm text-muted mb-1">
                      Project
                    </div>
                    <div className="text-base sm:text-lg font-bold text-ink break-words">
                      {selectedRFQProcurement.project?.name || "N/A"}
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 min-w-0 overflow-hidden">
                    <div className="text-xs sm:text-sm text-muted mb-1">
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
                            ? "text-danger"
                            : "text-success"
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Responses List */}
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold text-ink">
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
                      className="border border-line rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-surface-2 transition-colors"
                      onClick={() => openRFQResponseDetails(response)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-info flex-shrink-0" />
                            <h5 className="text-base sm:text-lg font-medium text-ink break-words min-w-0 flex-1">
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
                              <span className="text-xs sm:text-sm text-muted block mb-1">
                                Quote Amount:
                              </span>
                              <p className="font-medium text-ink text-sm sm:text-base break-words overflow-hidden">
                                <TruncatedNumber 
                                  value={response.quote_amount}
                                  className="text-ink"
                                />
                              </p>
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm text-muted block mb-1">
                                Delivery Time:
                              </span>
                              <p className="font-medium text-ink text-sm sm:text-base break-words">
                                {response.delivery_time}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm text-muted block mb-1">
                                Technical Score:
                              </span>
                              <p className="font-medium text-ink text-sm sm:text-base">
                                {response.technical_score}/100
                              </p>
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm text-muted block mb-1">
                                Commercial Score:
                              </span>
                              <p className="font-medium text-ink text-sm sm:text-base">
                                {response.commercial_score}/100
                              </p>
                            </div>
                          </div>

                          {response.notes && (
                            <div className="mt-3 pt-3 border-t border-line">
                              <span className="text-xs sm:text-sm text-muted block mb-1">
                                Notes:
                              </span>
                              <p className="text-xs sm:text-sm text-ink break-words">
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
                              className="px-3 py-1.5 bg-success text-white text-xs sm:text-sm rounded-md hover:opacity-90 transition-colors whitespace-nowrap"
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

      {/* Procurement Details Modal */}
      {showProcurementDetailsModal && selectedProcurement && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                Procurement Details
              </h3>
              <button
                onClick={() => setShowProcurementDetailsModal(false)}
                className="text-muted hover:text-ink-3"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-info-soft to-accent-indigo-soft rounded-xl p-6 border border-info">
                  <div className="flex items-center space-x-3 mb-4">
                    {getTypeIcon(selectedProcurement.type)}
                    <h3 className="text-xl font-bold text-ink">
                      {selectedProcurement.description}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-info-soft text-info">
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
                    <div className="bg-white/80 rounded-lg p-3 min-w-0">
                      <div className="text-sm text-muted">
                        Project
                      </div>
                      <div className="text-lg font-bold text-ink">
                        {selectedProcurement.project?.name || "N/A"}
                      </div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 min-w-0 overflow-hidden">
                      <div className="text-sm text-muted">
                        Estimated Cost
                      </div>
                      <div className="text-lg font-bold break-words overflow-hidden">
                        <TruncatedNumber 
                          value={selectedProcurement.estimated_cost}
                          className="text-info"
                        />
                      </div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 min-w-0 overflow-hidden">
                      <div className="text-sm text-muted">
                        Actual Cost
                      </div>
                      <div className="text-lg font-bold break-words overflow-hidden">
                        <TruncatedNumber 
                          value={selectedProcurement.actual_cost}
                          className="text-success"
                        />
                      </div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 min-w-0 overflow-hidden">
                      <div className="text-sm text-muted">
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
                              ? "text-danger"
                              : "text-success"
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="bg-surface rounded-xl shadow p-6">
                  <h4 className="text-lg font-semibold text-ink mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-info" />
                    Timeline
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-info rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-medium text-ink">
                          Created
                        </div>
                        <div className="text-sm text-muted">
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
                        <div className="w-3 h-3 bg-success rounded-full"></div>
                        <div className="flex-1">
                          <div className="font-medium text-ink">
                            Last Updated
                          </div>
                          <div className="text-sm text-muted">
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
          <div className="bg-surface rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                Vendor Details
              </h3>
              <button
                onClick={() => setShowVendorDetailsModal(false)}
                className="text-muted hover:text-ink-3"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-success-soft to-success-soft rounded-xl p-6 border border-success">
                  <div className="flex items-center space-x-3 mb-4">
                    <Users className="w-6 h-6 text-success" />
                    <h3 className="text-xl font-bold text-ink">
                      {selectedVendor.name}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-success-soft text-success">
                      {selectedVendor.category.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-info-soft text-info">
                      Rating: {selectedVendor.performance_rating}/5
                    </span>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-surface rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-ink mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-info" />
                      Contact Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted">
                          Contact Person
                        </div>
                        <div className="text-lg font-medium text-ink">
                          {selectedVendor.contact_person}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Contact Info
                        </div>
                        <div className="text-lg font-medium text-ink">
                          {selectedVendor.contact_info}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Address
                        </div>
                        <div className="text-lg font-medium text-ink">
                          {selectedVendor.address}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance & Timeline */}
                  <div className="bg-surface rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-ink mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-success" />
                      Performance & Timeline
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted">
                          Performance Rating
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-lg font-medium text-ink">
                            {selectedVendor.performance_rating}/5
                          </div>
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={16}
                                className={`${
                                  star <= selectedVendor.performance_rating
                                    ? "text-warning fill-current"
                                    : "text-faint "
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Created
                        </div>
                        <div className="text-lg font-medium text-ink">
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
                          <div className="text-sm text-muted">
                            Last Updated
                          </div>
                          <div className="text-lg font-medium text-ink">
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
          <div className="bg-surface rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                RFQ Response Details
              </h3>
              <button
                onClick={() => setShowRFQResponseDetailsModal(false)}
                className="text-muted hover:text-ink-3"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-accent-violet-soft to-accent-indigo-soft rounded-xl p-6 border border-accent-violet">
                  <div className="flex items-center space-x-3 mb-4">
                    <Users className="w-6 h-6 text-accent-violet" />
                    <h3 className="text-xl font-bold text-ink">
                      {selectedRFQResponse.vendor?.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getResponseStatusColor(
                        selectedRFQResponse.status
                      )}`}
                    >
                      {selectedRFQResponse.status.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-info-soft text-info break-words overflow-hidden max-w-full">
                      <TruncatedNumber 
                        value={selectedRFQResponse.quote_amount}
                        className="text-info"
                      />
                    </span>
                  </div>
                </div>

                {/* Response Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-surface rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-ink mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-info" />
                      Response Information
                    </h4>
                    <div className="space-y-4">
                      <div className="min-w-0 overflow-hidden">
                        <div className="text-sm text-muted">
                          Quote Amount
                        </div>
                        <div className="text-lg font-bold break-words overflow-hidden">
                          <TruncatedNumber 
                            value={selectedRFQResponse.quote_amount}
                            className="text-info"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Delivery Time
                        </div>
                        <div className="text-lg font-medium text-ink">
                          {selectedRFQResponse.delivery_time}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Submitted Date
                        </div>
                        <div className="text-lg font-medium text-ink">
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
                          <div className="text-sm text-muted">
                            Notes
                          </div>
                          <div className="text-lg font-medium text-ink">
                            {selectedRFQResponse.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scoring & Timeline */}
                  <div className="bg-surface rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-ink mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-success" />
                      Scoring & Timeline
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted">
                          Technical Score
                        </div>
                        <div className="text-lg font-medium text-ink">
                          {selectedRFQResponse.technical_score}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Commercial Score
                        </div>
                        <div className="text-lg font-medium text-ink">
                          {selectedRFQResponse.commercial_score}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Total Score
                        </div>
                        <div className="text-lg font-bold text-success">
                          {selectedRFQResponse.total_score}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Created
                        </div>
                        <div className="text-lg font-medium text-ink">
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
                          <div className="text-sm text-muted">
                            Last Updated
                          </div>
                          <div className="text-lg font-medium text-ink">
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
                  <div className="bg-surface rounded-xl shadow p-6">
                    <h4 className="text-lg font-semibold text-ink mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-bright" />
                      Procurement Context
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted">
                          Procurement
                        </div>
                        <div className="text-lg font-medium text-ink">
                          {selectedRFQResponse.procurement.description}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Type
                        </div>
                        <div className="text-lg font-medium text-ink capitalize">
                          {selectedRFQResponse.procurement.type}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted">
                          Status
                        </div>
                        <div className="text-lg font-medium text-ink">
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
    </RoleGuard>
  );
};

export default RFQManagementPage;
