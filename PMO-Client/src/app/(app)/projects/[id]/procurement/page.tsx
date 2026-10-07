"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    FileText,
    DollarSign,
    CheckCircle,
    Clock,
    AlertTriangle,
    X,
    ShoppingCart,
    Package,
    Wrench,
    Users,
    FileText as FileTextIcon,
    TrendingUp,
    Calendar,
    Award,
    Eye,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { TabRow } from "@/components/ui/tab-row";

interface Procurement {
    procurement_id: number;
    type: string;
    description: string;
    estimated_cost: number;
    actual_cost: number;
    status: string;
    created_at: string;
    updated_at: string;
    contracts?: any[];
}

interface Contract {
    contract_id: number;
    procurement_id: number;
    vendor_id: number;
    contract_number: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    value: number;
    status: string;
    created_at: string;
    updated_at: string;
    procurement?: any;
    vendor?: any;
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
    contracts?: any[];
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
}

const ProcurementPage = () => {
    const { id: projectId } = useParams();
    const router = useRouter();
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState("overview");
    const [procurements, setProcurements] = useState<Procurement[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [showRFQResponsesModal, setShowRFQResponsesModal] = useState(false);
    const [selectedRFQProcurement, setSelectedRFQProcurement] =
        useState<Procurement | null>(null);
    const [rfqResponses, setRfqResponses] = useState<RFQResponse[]>([]);
    const [activeRFQs, setActiveRFQs] = useState<
        {
            procurement_id: number;
            generated_at: string;
            vendors_notified: number;
        }[]
    >([]);

    // Check user role and access permissions
    useEffect(() => {
        const checkUserAccess = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    router.push("/auth/login");
                    return;
                }

                const response = await axios.get("/api/auth/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const user = response.data.user;
                const role = user?.role?.name?.toLowerCase();
                console.log("User role detected:", role);
                console.log("Full user object:", user);

                setUserRole(role);

                // Check if user has access to procurement page
                const allowedRoles = [
                    "pjm",
                    "pmo",
                    "proc",
                    "admin",
                    "administrator",
                    "eng",
                    "site",
                    "technical", // Add technical as fallback
                ];
                const hasPermission = allowedRoles.includes(role);

                console.log("Has permission:", hasPermission);
                console.log("Allowed roles:", allowedRoles);

                setHasAccess(hasPermission);

                if (!hasPermission) {
                    toast.error(
                        "Access denied. You don't have permission to view this page."
                    );
                    router.push(`/projects/${projectId}`);
                    return;
                }
            } catch (error) {
                console.error("Error checking user access:", error);
                toast.error("Authentication error. Please login again.");
                router.push("/auth/login");
            }
        };

        checkUserAccess();
    }, [projectId, router]);

    useEffect(() => {
        console.log(
            "Data fetching useEffect triggered. ProjectId:",
            projectId,
            "HasAccess:",
            hasAccess
        );
        if (!projectId || hasAccess === null) return;
        if (!hasAccess) return; // Don't fetch data if user doesn't have access

        console.log("Starting to fetch procurement data...");
        setLoading(true);

        // Fetch all procurement data
        Promise.all([
            axios.get(`/api/projects/${projectId}/procurements`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            }),
            axios.get(`/api/contracts`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            }),
            axios.get(`/api/vendors`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            }),
            axios
                .get(`/api/rfq-responses`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                })
                .catch((error) => {
                    console.warn("No RFQ responses found yet:", error);
                    return { data: [] }; // Return empty array if API fails
                }),
        ])
            .then(([procRes, contractRes, vendorRes, rfqRes]) => {
                console.log("Successfully fetched procurement data:", {
                    procurements: procRes.data?.length || 0,
                    contracts: contractRes.data?.length || 0,
                    vendors: vendorRes.data?.length || 0,
                    rfqResponses: rfqRes.data?.length || 0,
                });
                setProcurements(procRes.data);
                setContracts(contractRes.data);
                setVendors(vendorRes.data);
                setRfqResponses(rfqRes.data || []);

                // Set active RFQs based on existing responses
                const rfqData = rfqRes.data || [];
                const activeRFQsData = rfqData.reduce(
                    (acc: any[], response: any) => {
                        const existing = acc.find(
                            (rfq) =>
                                rfq.procurement_id === response.procurement_id
                        );
                        if (!existing) {
                            acc.push({
                                procurement_id: response.procurement_id,
                                generated_at: response.created_at,
                                vendors_notified: rfqData.filter(
                                    (r: any) =>
                                        r.procurement_id ===
                                        response.procurement_id
                                ).length,
                            });
                        }
                        return acc;
                    },
                    []
                );
                setActiveRFQs(activeRFQsData);

                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching procurement data:", error);
                console.error(
                    "Error details:",
                    error.response?.data || error.message
                );
                toast.error("Failed to load procurement data");
                setLoading(false);
            });
    }, [projectId, hasAccess]);

    // Helper function to check if user can edit (only PJM, PMO, ADMIN can edit)
    const canEdit = () => {
        if (!userRole) {
            console.log("canEdit: no userRole");
            return false;
        }
        const editRoles = ["pjm", "pmo", "admin", "administrator"];
        const canUserEdit = editRoles.includes(userRole.toLowerCase());
        console.log("canEdit check:", { userRole, canUserEdit, editRoles });
        return canUserEdit;
    };



    const handleDeleteProcurement = async (procurementId: number) => {
        const ok = await confirm({
            title: "Delete procurement?",
            message:
                "Every contract associated with this procurement is deleted as well. This cannot be undone.",
            confirmText: "Delete",
            tone: "danger",
        });
        if (!ok) return;

        try {
            // First, delete all contracts associated with this procurement
            const procurement = procurements.find(
                (p) => p.procurement_id === procurementId
            );
            if (procurement?.contracts && procurement.contracts.length > 0) {
                for (const contract of procurement.contracts) {
                    try {
                        await axios.delete(
                            `/api/contracts/${contract.contract_id}`,
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
                            `Error deleting contract ${contract.contract_id}:`,
                            error
                        );
                    }
                }
            }

            // Then delete the procurement
            const res = await axios.delete(
                `/api/procurements/${procurementId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            if (res.status === 200) {
                setProcurements((prev) =>
                    prev.filter((p) => p.procurement_id !== procurementId)
                );

                // Refresh contracts and vendors to update counts
                try {
                    const [contractsRes, vendorsRes] = await Promise.all([
                        axios.get("/api/contracts", {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                    "token"
                                )}`,
                            },
                        }),
                        axios.get("/api/vendors", {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                    "token"
                                )}`,
                            },
                        }),
                    ]);

                    if (contractsRes.status === 200) {
                        setContracts(contractsRes.data);
                    }
                    if (vendorsRes.status === 200) {
                        setVendors(vendorsRes.data);
                    }
                } catch (error) {
                    console.error(
                        "Error refreshing data after deletion:",
                        error
                    );
                }

                toast.success("Procurement deleted successfully");
            }
        } catch (error) {
            console.error("Error deleting procurement:", error);
            toast.error(
                "Failed to delete procurement. It may have associated contracts that need to be deleted first."
            );
        }
    };

    const generateRFQ = async (procurementId: number) => {
        try {
            const procurement = procurements.find(
                (p) => p.procurement_id === procurementId
            );
            if (!procurement) {
                toast.error("Procurement not found");
                return;
            }

            // Get top vendors for this procurement type
            const recommendedVendors = vendors
                .filter((v) => v.performance_rating >= 3.5)
                .sort((a, b) => b.performance_rating - a.performance_rating)
                .slice(0, 3);

            if (recommendedVendors.length === 0) {
                toast.error("No qualified vendors available for RFQ");
                return;
            }

            // Generate simulated vendor responses and save to database
            const responses: any[] = [];
            for (const vendor of recommendedVendors) {
                const baseQuote = procurement.estimated_cost;
                const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
                const quoteAmount = baseQuote * (1 + variation);
                const technicalScore = Math.floor(Math.random() * 20) + 70; // 70-90
                const commercialScore = Math.floor(Math.random() * 20) + 70; // 70-90
                const totalScore = Math.round(
                    technicalScore * 0.6 + commercialScore * 0.4
                );

                const responseData = {
                    procurement_id: procurementId,
                    vendor_id: vendor.vendor_id,
                    quote_amount: Math.round(quoteAmount),
                    delivery_time: `${
                        Math.floor(Math.random() * 30) + 15
                    } days`,
                    technical_score: technicalScore,
                    commercial_score: commercialScore,
                    total_score: totalScore,
                    status: "Submitted",
                    notes: `Response from ${vendor.name} for ${procurement.description}`,
                };

                try {
                    const res = await axios.post(
                        "/api/rfq-responses",
                        responseData,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                    "token"
                                )}`,
                            },
                        }
                    );
                    responses.push(res.data);
                } catch (error) {
                    console.error(
                        `Error creating RFQ response for vendor ${vendor.name}:`,
                        error
                    );
                }
            }

            // Update RFQ responses state with new data from database
            if (responses.length > 0) {
                setRfqResponses((prev) => [...prev, ...responses]);
            }

            // Add to active RFQs
            setActiveRFQs((prev) => [
                ...prev,
                {
                    procurement_id: procurementId,
                    generated_at: new Date().toISOString(),
                    vendors_notified: recommendedVendors.length,
                },
            ]);

            console.log("RFQ Generated:", {
                procurement_id: procurementId,
                procurement_description: procurement.description,
                estimated_value: procurement.estimated_cost,
                recommended_vendors: recommendedVendors,
                generated_at: new Date().toISOString(),
                responses: responses,
            });

            toast.success(
                `RFQ generated for ${procurement.description}. ${responses.length} vendors responded.`
            );

            // Update procurement status to "Tendering"
            const updateRes = await axios.put(
                `/api/procurements/${procurementId}`,
                {
                    ...procurement,
                    status: "Tendering",
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            if (updateRes.status === 200) {
                setProcurements((prev) =>
                    prev.map((p) =>
                        p.procurement_id === procurementId ? updateRes.data : p
                    )
                );
            }
        } catch (error) {
            console.error("Error generating RFQ:", error);
            toast.error("Failed to generate RFQ");
        }
    };

    const awardContract = async (response: RFQResponse) => {
        try {
            const procurement = procurements.find(
                (p) => p.procurement_id === response.procurement_id
            );
            const vendor = vendors.find(
                (v) => v.vendor_id === response.vendor_id
            );

            if (!procurement || !vendor) {
                toast.error("Procurement or vendor not found");
                return;
            }

            // Create contract automatically
            const contractData = {
                procurement_id: response.procurement_id,
                vendor_id: response.vendor_id,
                contract_number: `CON-${Date.now()}-${response.procurement_id}`,
                name: `Contract for ${procurement.description}`,
                description: `Awarded contract for ${procurement.description} to ${vendor.name}`,
                start_date: new Date().toISOString().split("T")[0],
                end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0], // 90 days from now
                value: response.quote_amount,
                status: "Active",
            };

            const contractRes = await axios.post(
                `/api/contracts`,
                contractData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            if (contractRes.status === 201) {
                setContracts((prev) => [...prev, contractRes.data]);

                // Update RFQ response status in database
                try {
                    await axios.put(
                        `/api/rfq-responses/${response.rfq_response_id}`,
                        {
                            status: "Awarded",
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                    "token"
                                )}`,
                            },
                        }
                    );

                    // Update local state
                    setRfqResponses((prev) =>
                        prev.map((r) =>
                            r.rfq_response_id === response.rfq_response_id
                                ? { ...r, status: "Awarded" as const }
                                : r
                        )
                    );
                } catch (error) {
                    console.error("Error updating RFQ response status:", error);
                }

                // Update procurement status to "Awarded"
                const updateRes = await axios.put(
                    `/api/procurements/${response.procurement_id}`,
                    {
                        ...procurement,
                        status: "Awarded",
                        actual_cost: response.quote_amount,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    }
                );

                if (updateRes.status === 200) {
                    setProcurements((prev) =>
                        prev.map((p) =>
                            p.procurement_id === response.procurement_id
                                ? updateRes.data
                                : p
                        )
                    );
                }

                // Refresh vendor data to update contract count
                try {
                    // Refresh all vendors to get updated contract counts
                    const vendorsRes = await axios.get("/api/vendors", {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    });

                    if (vendorsRes.status === 200) {
                        setVendors(vendorsRes.data);
                    }
                } catch (error) {
                    console.error("Error refreshing vendor data:", error);
                }

                toast.success(
                    `Contract awarded to ${
                        vendor.name
                    } for OMR ${response.quote_amount.toLocaleString()}`
                );
            }
        } catch (error) {
            console.error("Error awarding contract:", error);
            toast.error("Failed to award contract");
        }
    };

    const viewRFQResponses = (procurement: Procurement) => {
        setSelectedRFQProcurement(procurement);
        setShowRFQResponsesModal(true);
    };

    const openEditModal = (procurement: Procurement) => {
        router.push(
            `/projects/${projectId}/procurement/procurements/${procurement.procurement_id}/edit`
        );
    };

    const openEditContractModal = (contract: Contract) => {
        router.push(
            `/projects/${projectId}/procurement/contracts/${contract.contract_id}/edit`
        );
    };

    const openEditVendorModal = (vendor: Vendor) => {
        router.push(
            `/projects/${projectId}/procurement/vendors/${vendor.vendor_id}/edit`
        );
    };


    const handleDeleteVendor = async (vendorId: number) => {
        const ok = await confirm({
            title: "Delete vendor?",
            message: "This vendor is removed permanently.",
            confirmText: "Delete",
            tone: "danger",
        });
        if (!ok) return;

        try {
            const response = await axios.delete(`/api/vendors/${vendorId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (response.status === 200) {
                setVendors((prev) =>
                    prev.filter((v) => v.vendor_id !== vendorId)
                );
                toast.success("Vendor deleted successfully");
            }
        } catch (error) {
            console.error("Error deleting vendor:", error);
            toast.error("Failed to delete vendor");
        }
    };

    const handleDeleteContract = async (contractId: number) => {
        const ok = await confirm({
            title: "Delete contract?",
            message: "This contract is removed permanently.",
            confirmText: "Delete",
            tone: "danger",
        });
        if (!ok) return;

        try {
            const response = await axios.delete(
                `/api/contracts/${contractId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            if (response.status === 200) {
                setContracts((prev) =>
                    prev.filter((c) => c.contract_id !== contractId)
                );

                // Refresh vendors to update contract counts
                try {
                    const vendorsRes = await axios.get("/api/vendors", {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    });

                    if (vendorsRes.status === 200) {
                        setVendors(vendorsRes.data);
                    }
                } catch (error) {
                    console.error("Error refreshing vendor data:", error);
                }

                toast.success("Contract deleted successfully");
            }
        } catch (error) {
            console.error("Error deleting contract:", error);
            toast.error("Failed to delete contract");
        }
    };

    // Calculate summary statistics
    const totalProcurements = procurements.length;
    const completedProcurements = procurements.filter(
        (p) => p.status === "Completed"
    ).length;
    const inProgressProcurements = procurements.filter((p) =>
        ["Planning", "Tendering", "Evaluation", "Awarded"].includes(p.status)
    ).length;
    const totalEstimatedValue = procurements.reduce(
        (sum, p) => sum + (p.estimated_cost || 0),
        0
    );
    const totalActualValue = procurements.reduce(
        (sum, p) => sum + (p.actual_cost || 0),
        0
    );
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(
        (c) => c.status === "Active"
    ).length;
    const totalVendors = vendors.length;
    const topVendors = vendors.filter(
        (v) => v.performance_rating >= 4.0
    ).length;

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

    const tabs = [
        { id: "overview", label: "Overview", icon: <TrendingUp size={16} /> },
        {
            id: "procurements",
            label: "Procurements",
            icon: <ShoppingCart size={16} />,
        },
        {
            id: "contracts",
            label: "Contracts",
            icon: <FileTextIcon size={16} />,
        },
        { id: "vendors", label: "Vendors", icon: <Users size={16} /> },
        { id: "rfq", label: "RFQ", icon: <Award size={16} /> },
    ];

    // Show loading state while checking access
    if (hasAccess === null) {
        return (
            <DashboardLayout title="Project Procurement">
                <div className="flex items-center justify-center h-64">
                    <Spinner size={32} className="text-bright-primary" />
                </div>
            </DashboardLayout>
        );
    }

    // Show access denied if user doesn't have permission
    if (!hasAccess) {
        return (
            <DashboardLayout title="Project Procurement">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-danger-soft rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-danger" />
                        </div>
                        <h3 className="text-lg font-medium text-ink mb-2">
                            Access Denied
                        </h3>
                        <p className="text-muted mb-4">
                            You don't have permission to view this procurement
                            page. This content is restricted to PJM, PMO, ENG,
                            SITE, and ADMIN roles.
                        </p>
                        <button
                            onClick={() =>
                                router.push(`/projects/${projectId}`)
                            }
                            className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                        >
                            Back to Project
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    console.log(
        "Rendering main page. UserRole:",
        userRole,
        "HasAccess:",
        hasAccess,
        "Loading:",
        loading
    );

    return (
        <DashboardLayout title="Project Procurement">
            {/* Read-only notification for ENG and SITE users */}
            {(userRole === "eng" || userRole === "site") && (
                <div className="bg-info-soft border border-info rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-info-soft rounded-full flex items-center justify-center mr-3">
                            <Eye className="w-4 h-4 text-info" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-info">
                                View-Only Access
                            </h3>
                            <p className="text-sm text-info">
                                You have read-only access to this procurement
                                page. Only PJM, PMO, and ADMIN roles can make
                                changes.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => router.push(`/projects/${projectId}`)}
                    className="flex items-center gap-2 text-[13.5px] font-medium text-muted hover:text-ink transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Project
                </button>
                {canEdit() && (
                    <Button
                        onClick={() =>
                            router.push(
                                `/projects/${projectId}/procurement/procurements/new`
                            )
                        }
                        className="flex items-center space-x-2 bg-bright text-white"
                    >
                        <Plus size={16} />
                        <span>Add Procurement</span>
                    </Button>
                )}
            </div>

            <TabRow tabs={tabs} value={activeTab} onChange={setActiveTab} />

            {/* Tab Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Spinner size={32} className="text-bright-primary" />
                </div>
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
                                    <FileTextIcon className="w-8 h-8 text-success" />
                                    <div>
                                        <p className="text-sm text-muted">
                                            Active Contracts
                                        </p>
                                        <p className="text-lg font-semibold text-ink">
                                            {activeContracts}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-surface rounded-xl shadow p-4 flex items-center space-x-3">
                                    <Users className="w-8 h-8 text-accent-violet" />
                                    <div>
                                        <p className="text-sm text-muted">
                                            Top Vendors
                                        </p>
                                        <p className="text-lg font-semibold text-ink">
                                            {topVendors}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-surface rounded-xl shadow p-4 flex items-center space-x-3">
                                    <DollarSign className="w-8 h-8 text-bright" />
                                    <div>
                                        <p className="text-sm text-muted">
                                            Total Value
                                        </p>
                                        <p className="text-lg font-semibold text-ink">
                                            OMR{" "}
                                            {totalEstimatedValue.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Procurement Status Chart */}
                            <div className="bg-surface rounded-xl shadow p-6">
                                <h3 className="text-lg font-semibold text-ink mb-4">
                                    Procurement Status
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-warning">
                                            {
                                                procurements.filter(
                                                    (p) =>
                                                        p.status === "Planning"
                                                ).length
                                            }
                                        </div>
                                        <div className="text-sm text-muted">
                                            Planning
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-bright">
                                            {
                                                procurements.filter(
                                                    (p) =>
                                                        p.status === "Tendering"
                                                ).length
                                            }
                                        </div>
                                        <div className="text-sm text-muted">
                                            Tendering
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-info">
                                            {
                                                procurements.filter(
                                                    (p) =>
                                                        p.status === "Awarded"
                                                ).length
                                            }
                                        </div>
                                        <div className="text-sm text-muted">
                                            Awarded
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-success">
                                            {completedProcurements}
                                        </div>
                                        <div className="text-sm text-muted">
                                            Completed
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-surface rounded-xl shadow p-6">
                                <h3 className="text-lg font-semibold text-ink mb-4">
                                    Recent Activity
                                </h3>
                                <div className="space-y-3">
                                    {procurements
                                        .slice(0, 5)
                                        .map((procurement) => (
                                            <div
                                                key={procurement.procurement_id}
                                                className="flex items-center justify-between p-3 bg-surface-2 rounded-lg"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    {getTypeIcon(
                                                        procurement.type
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-ink">
                                                            {
                                                                procurement.description
                                                            }
                                                        </p>
                                                        <p className="text-sm text-muted">
                                                            OMR{" "}
                                                            {procurement.estimated_cost.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span
                                                    className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                                                        procurement.status
                                                    )}`}
                                                >
                                                    {procurement.status}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Procurements Tab */}
                    {activeTab === "procurements" && (
                        <div className="bg-surface rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-line">
                                <h2 className="text-lg font-semibold text-ink">
                                    All Procurements
                                </h2>
                            </div>

                            {procurements.length === 0 ? (
                                <div className="p-8 text-center">
                                    <ShoppingCart className="w-12 h-12 text-faint mx-auto mb-4" />
                                    <p className="text-muted mb-4">
                                        No procurements found for this project.
                                    </p>
                                    {canEdit() && (
                                        <Button
                                            onClick={() =>
                                                router.push(
                                                    `/projects/${projectId}/procurement/procurements/new`
                                                )
                                            }
                                            className="flex items-center space-x-2"
                                        >
                                            <Plus size={16} />
                                            <span>Add First Procurement</span>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-line">
                                    {procurements.map((procurement) => (
                                        <div
                                            key={procurement.procurement_id}
                                            className="p-6 hover:bg-surface-2 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        {getTypeIcon(
                                                            procurement.type
                                                        )}
                                                        <h3 className="text-lg font-medium text-ink">
                                                            {
                                                                procurement.description
                                                            }
                                                        </h3>
                                                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-info-soft text-info">
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

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted">
                                                                Estimated Cost:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                OMR{" "}
                                                                {procurement.estimated_cost.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">
                                                                Actual Cost:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                OMR{" "}
                                                                {procurement.actual_cost.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">
                                                                Variance:
                                                            </span>
                                                            <p
                                                                className={`font-medium ${
                                                                    procurement.actual_cost -
                                                                        procurement.estimated_cost >=
                                                                    0
                                                                        ? "text-danger"
                                                                        : "text-success"
                                                                }`}
                                                            >
                                                                OMR{" "}
                                                                {(
                                                                    procurement.actual_cost -
                                                                    procurement.estimated_cost
                                                                ).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 text-xs text-muted">
                                                        Created:{" "}
                                                        {new Date(
                                                            procurement.created_at
                                                        ).toLocaleDateString()}
                                                        {procurement.updated_at !==
                                                            procurement.created_at &&
                                                            ` • Updated: ${new Date(
                                                                procurement.updated_at
                                                            ).toLocaleDateString()}`}
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2 ml-4">
                                                    {canEdit() && (
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        procurement
                                                                    )
                                                                }
                                                                className="px-3 py-1 bg-info text-white text-xs rounded hover:opacity-90"
                                                            >
                                                                Edit
                                                            </button>
                                                            {procurement.status ===
                                                                "Planning" && (
                                                                <button
                                                                    onClick={() =>
                                                                        generateRFQ(
                                                                            procurement.procurement_id
                                                                        )
                                                                    }
                                                                    className="px-3 py-1 bg-bright text-white text-xs rounded hover:bg-bright-deep"
                                                                >
                                                                    Generate RFQ
                                                                </button>
                                                            )}
                                                            {procurement.status ===
                                                                "Tendering" && (
                                                                <button
                                                                    onClick={() =>
                                                                        viewRFQResponses(
                                                                            procurement
                                                                        )
                                                                    }
                                                                    className="px-3 py-1 bg-accent-violet text-white text-xs rounded hover:opacity-90"
                                                                >
                                                                    View
                                                                    Responses
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteProcurement(
                                                                        procurement.procurement_id
                                                                    )
                                                                }
                                                                className="px-3 py-1 bg-danger text-white text-xs rounded hover:opacity-90"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contracts Tab */}
                    {activeTab === "contracts" && (
                        <div className="bg-surface rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-ink">
                                    Contracts
                                </h2>
                                {canEdit() && (
                                    <Button
                                        onClick={() =>
                                            router.push(`/projects/${projectId}/procurement/contracts/new`)
                                        }
                                        className="flex items-center space-x-2 bg-success hover:opacity-90 text-white"
                                    >
                                        <Plus size={16} />
                                        <span>Add Contract</span>
                                    </Button>
                                )}
                            </div>

                            {contracts.length === 0 ? (
                                <div className="p-8 text-center">
                                    <FileTextIcon className="w-12 h-12 text-faint mx-auto mb-4" />
                                    <p className="text-muted mb-4">
                                        No contracts found.
                                    </p>
                                    {canEdit() && (
                                        <Button
                                            onClick={() =>
                                                router.push(`/projects/${projectId}/procurement/contracts/new`)
                                            }
                                            className="flex items-center space-x-2 bg-success hover:opacity-90 text-white"
                                        >
                                            <Plus size={16} />
                                            <span>Add First Contract</span>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-line">
                                    {contracts.map((contract) => (
                                        <div
                                            key={contract.contract_id}
                                            className="p-6 hover:bg-surface-2 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <FileTextIcon className="w-4 h-4 text-info" />
                                                        <h3 className="text-lg font-medium text-ink">
                                                            {contract.name}
                                                        </h3>
                                                        <div className="flex items-center space-x-2">
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    contract.status ===
                                                                    "Active"
                                                                        ? "bg-success-soft text-success"
                                                                        : contract.status ===
                                                                          "Draft"
                                                                        ? "bg-warning-soft text-warning"
                                                                        : "bg-surface-2 text-ink-2"
                                                                }`}
                                                            >
                                                                {
                                                                    contract.status
                                                                }
                                                            </span>
                                                            {canEdit() && (
                                                                <div className="flex space-x-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            openEditContractModal(
                                                                                contract
                                                                            )
                                                                        }
                                                                        className="px-3 py-1 bg-info text-white text-xs rounded hover:opacity-90"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteContract(
                                                                                contract.contract_id
                                                                            )
                                                                        }
                                                                        className="px-3 py-1 bg-danger text-white text-xs rounded hover:opacity-90"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-muted mb-3">
                                                        {contract.description}
                                                    </p>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted">
                                                                Contract #:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                {
                                                                    contract.contract_number
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">
                                                                Value:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                OMR{" "}
                                                                {contract.value.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">
                                                                Start Date:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                {new Date(
                                                                    contract.start_date
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">
                                                                End Date:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                {new Date(
                                                                    contract.end_date
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {contract.vendor && (
                                                        <div className="mt-3 p-3 bg-surface-2 rounded-lg">
                                                            <div className="flex items-center space-x-2">
                                                                <Users className="w-4 h-4 text-accent-violet" />
                                                                <span className="text-sm font-medium text-ink">
                                                                    Vendor:{" "}
                                                                    {
                                                                        contract
                                                                            .vendor
                                                                            .name
                                                                    }
                                                                </span>
                                                                <span className="text-sm text-muted">
                                                                    (Rating:{" "}
                                                                    {
                                                                        contract
                                                                            .vendor
                                                                            .performance_rating
                                                                    }
                                                                    /5)
                                                                </span>
                                                            </div>
                                                        </div>
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
                        <div className="bg-surface rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-ink">
                                    Vendors
                                </h2>
                                {canEdit() && (
                                    <Button
                                        onClick={() =>
                                            router.push(`/projects/${projectId}/procurement/vendors/new`)
                                        }
                                        className="flex items-center space-x-2 bg-accent-violet hover:opacity-90 text-white"
                                    >
                                        <Plus size={16} />
                                        <span>Add Vendor</span>
                                    </Button>
                                )}
                            </div>

                            {vendors.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Users className="w-12 h-12 text-faint mx-auto mb-4" />
                                    <p className="text-muted mb-4">
                                        No vendors found.
                                    </p>
                                    {canEdit() && (
                                        <Button
                                            onClick={() =>
                                                router.push(`/projects/${projectId}/procurement/vendors/new`)
                                            }
                                            className="flex items-center space-x-2 bg-accent-violet hover:opacity-90 text-white"
                                        >
                                            <Plus size={16} />
                                            <span>Add First Vendor</span>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-line">
                                    {vendors.map((vendor) => (
                                        <div
                                            key={vendor.vendor_id}
                                            className="p-6 hover:bg-surface-2 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <Users className="w-4 h-4 text-accent-violet" />
                                                        <h3 className="text-lg font-medium text-ink">
                                                            {vendor.name}
                                                        </h3>
                                                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-accent-violet-soft text-accent-violet">
                                                            {vendor.category}
                                                        </span>
                                                        <div className="flex items-center space-x-1">
                                                            <span className="text-sm text-muted">
                                                                Rating:
                                                            </span>
                                                            <span className="text-sm font-medium text-warning">
                                                                {
                                                                    vendor.performance_rating
                                                                }
                                                                /5
                                                            </span>
                                                        </div>
                                                        {vendor.performance_rating >=
                                                            4.0 && (
                                                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-success-soft text-success">
                                                                Top Rated
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted">
                                                                Contact:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                {
                                                                    vendor.contact_person
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">
                                                                Info:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                {
                                                                    vendor.contact_info
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">
                                                                Address:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                {vendor.address}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted">
                                                                Contracts:
                                                            </span>
                                                            <p className="font-medium text-ink">
                                                                {vendor
                                                                    .contracts
                                                                    ?.length ||
                                                                    0}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {canEdit() && (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() =>
                                                                openEditVendorModal(
                                                                    vendor
                                                                )
                                                            }
                                                            className="px-3 py-1 bg-info text-white text-xs rounded hover:opacity-90"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteVendor(
                                                                    vendor.vendor_id
                                                                )
                                                            }
                                                            className="px-3 py-1 bg-danger text-white text-xs rounded hover:opacity-90"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* RFQ Tab */}
                    {activeTab === "rfq" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">
                                    Request for Quotations (RFQ)
                                </h3>
                                <div className="text-sm text-muted">
                                    {activeRFQs.length} Active RFQs
                                </div>
                            </div>

                            {/* Active RFQs */}
                            <div className="bg-surface rounded-lg shadow p-6">
                                <h4 className="text-md font-semibold text-ink mb-4">
                                    Active RFQs
                                </h4>
                                {activeRFQs.length === 0 ? (
                                    <p className="text-muted text-center py-8">
                                        No active RFQs. Generate RFQs from
                                        procurements to see responses.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {activeRFQs.map((rfq) => {
                                            const procurement =
                                                procurements.find(
                                                    (p) =>
                                                        p.procurement_id ===
                                                        rfq.procurement_id
                                                );
                                            const responses =
                                                rfqResponses.filter(
                                                    (r) =>
                                                        r.procurement_id ===
                                                        rfq.procurement_id
                                                );
                                            const awardedResponse =
                                                responses.find(
                                                    (r) =>
                                                        r.status === "Awarded"
                                                );

                                            return (
                                                <div
                                                    key={rfq.procurement_id}
                                                    className="border border-line rounded-lg p-4"
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h5 className="font-medium text-ink">
                                                                {
                                                                    procurement?.description
                                                                }
                                                            </h5>
                                                            <p className="text-sm text-muted">
                                                                Generated:{" "}
                                                                {new Date(
                                                                    rfq.generated_at
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-soft text-info">
                                                                {
                                                                    responses.length
                                                                }{" "}
                                                                Responses
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {responses.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h6 className="text-sm font-medium text-ink-3">
                                                                Vendor
                                                                Responses:
                                                            </h6>
                                                            {responses.map(
                                                                (response) => (
                                                                    <div
                                                                        key={
                                                                            response.rfq_response_id
                                                                        }
                                                                        className="flex justify-between items-center p-2 bg-surface-2 rounded"
                                                                    >
                                                                        <div className="flex-1">
                                                                            <p className="font-medium text-sm text-ink">
                                                                                {
                                                                                    response
                                                                                        .vendor
                                                                                        ?.name
                                                                                }
                                                                            </p>
                                                                            <p className="text-xs text-muted">
                                                                                OMR{" "}
                                                                                {response.quote_amount.toLocaleString()}{" "}
                                                                                •{" "}
                                                                                {
                                                                                    response.delivery_time
                                                                                }{" "}
                                                                                •
                                                                                Score:{" "}
                                                                                {
                                                                                    response.total_score
                                                                                }
                                                                                /100
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <span
                                                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                                    response.status ===
                                                                                    "Awarded"
                                                                                        ? "bg-success-soft text-success  "
                                                                                        : response.status ===
                                                                                          "Evaluated"
                                                                                        ? "bg-warning-soft text-warning  "
                                                                                        : "bg-surface-2 text-ink-2  "
                                                                                }`}
                                                                            >
                                                                                {
                                                                                    response.status
                                                                                }
                                                                            </span>
                                                                            {response.status ===
                                                                                "Submitted" &&
                                                                                !awardedResponse &&
                                                                                canEdit() && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            awardContract(
                                                                                                response
                                                                                            )
                                                                                        }
                                                                                        className="px-3 py-1 bg-success text-white text-xs rounded hover:opacity-90"
                                                                                    >
                                                                                        Award
                                                                                    </button>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}

                                                    {awardedResponse && (
                                                        <div className="mt-3 p-2 bg-success-soft border border-success rounded">
                                                            <p className="text-sm text-success">
                                                                ✓ Contract
                                                                awarded to{" "}
                                                                {
                                                                    awardedResponse
                                                                        .vendor
                                                                        ?.name
                                                                }{" "}
                                                                for OMR{" "}
                                                                {awardedResponse.quote_amount.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* RFQ Generation Instructions */}
                            <div className="bg-info-soft border border-info rounded-lg p-4">
                                <h4 className="text-md font-semibold text-info mb-2">
                                    How to Generate RFQs
                                </h4>
                                <ol className="text-sm text-info space-y-1">
                                    <li>1. Go to the "Procurements" tab</li>
                                    <li>
                                        2. Find a procurement with status
                                        "Planning" or "Draft"
                                    </li>
                                    <li>
                                        3. Click "Generate RFQ" to send requests
                                        to qualified vendors
                                    </li>
                                    <li>
                                        4. Review vendor responses and award
                                        contracts
                                    </li>
                                </ol>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* RFQ Responses Modal */}
            <Dialog
                open={showRFQResponsesModal}
                onOpenChange={setShowRFQResponsesModal}
            >
                <DialogContent
                    className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto"
                    style={{
                        width: "95vw",
                        maxWidth: "1400px",
                        margin: "0 auto",
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold mb-6 text-ink flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-bright to-danger rounded-xl flex items-center justify-center mr-3">
                                <Award className="w-5 h-5 text-white" />
                            </div>
                            RFQ Responses -{" "}
                            {selectedRFQProcurement?.description}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Procurement Details Card */}
                        <div className="bg-gradient-to-r from-info-soft to-accent-indigo-soft rounded-xl p-6 border border-info">
                            <h4 className="text-lg font-semibold text-ink mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-info" />
                                Procurement Details
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/80 rounded-lg p-3">
                                    <div className="text-sm text-muted">
                                        Estimated Cost
                                    </div>
                                    <div className="text-lg font-bold text-info">
                                        OMR{" "}
                                        {selectedRFQProcurement?.estimated_cost.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-white/80 rounded-lg p-3">
                                    <div className="text-sm text-muted">
                                        Type
                                    </div>
                                    <div className="text-lg font-bold text-ink capitalize">
                                        {selectedRFQProcurement?.type}
                                    </div>
                                </div>
                                <div className="bg-white/80 rounded-lg p-3">
                                    <div className="text-sm text-muted">
                                        Status
                                    </div>
                                    <div className="text-lg font-bold text-ink">
                                        {selectedRFQProcurement?.status}
                                    </div>
                                </div>
                                <div className="bg-white/80 rounded-lg p-3">
                                    <div className="text-sm text-muted">
                                        Responses
                                    </div>
                                    <div className="text-lg font-bold text-accent-violet">
                                        {
                                            rfqResponses.filter(
                                                (r) =>
                                                    r.procurement_id ===
                                                    selectedRFQProcurement?.procurement_id
                                            ).length
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vendor Responses */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-ink flex items-center">
                                <Users className="w-5 h-5 mr-2 text-accent-violet" />
                                Vendor Responses
                            </h4>

                            {rfqResponses
                                .filter(
                                    (r) =>
                                        r.procurement_id ===
                                        selectedRFQProcurement?.procurement_id
                                )
                                .sort((a, b) => b.total_score - a.total_score)
                                .map((response, index) => (
                                    <div
                                        key={response.rfq_response_id}
                                        className="bg-surface rounded-xl border border-line p-6 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        {/* Header with ranking and vendor info */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center space-x-4">
                                                <div
                                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                                        index === 0
                                                            ? "bg-gradient-to-r from-warning to-warning"
                                                            : index === 1
                                                            ? "bg-gradient-to-r from-faint to-muted"
                                                            : "bg-gradient-to-r from-bright to-bright-deep"
                                                    }`}
                                                >
                                                    {index === 0
                                                        ? "🥇"
                                                        : index === 1
                                                        ? "🥈"
                                                        : "🥉"}
                                                </div>
                                                <div>
                                                    <h5 className="text-xl font-semibold text-ink">
                                                        {response.vendor?.name}
                                                    </h5>
                                                    <p className="text-sm text-muted">
                                                        Submitted:{" "}
                                                        {new Date(
                                                            response.submitted_date
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-success">
                                                    OMR{" "}
                                                    {response.quote_amount.toLocaleString()}
                                                </div>
                                                <div className="text-sm text-muted">
                                                    {response.delivery_time}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score Cards */}
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div className="bg-gradient-to-br from-info-soft to-info-soft rounded-lg p-4 text-center border border-info">
                                                <div className="text-sm text-muted mb-1">
                                                    Technical Score
                                                </div>
                                                <div className="text-2xl font-bold text-info">
                                                    {response.technical_score}
                                                    /100
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-success-soft to-success-soft rounded-lg p-4 text-center border border-success">
                                                <div className="text-sm text-muted mb-1">
                                                    Commercial Score
                                                </div>
                                                <div className="text-2xl font-bold text-success">
                                                    {response.commercial_score}
                                                    /100
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-accent-violet-soft to-accent-violet-soft rounded-lg p-4 text-center border border-accent-violet">
                                                <div className="text-sm text-muted mb-1">
                                                    Total Score
                                                </div>
                                                <div className="text-2xl font-bold text-accent-violet">
                                                    {response.total_score}/100
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status and Actions */}
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-3">
                                                <span
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                                        response.status ===
                                                        "Awarded"
                                                            ? "bg-success-soft text-success  "
                                                            : response.status ===
                                                              "Evaluated"
                                                            ? "bg-warning-soft text-warning  "
                                                            : "bg-surface-2 text-ink-2  "
                                                    }`}
                                                >
                                                    {response.status}
                                                </span>
                                                {response.status ===
                                                    "Awarded" && (
                                                    <span className="text-sm text-success flex items-center">
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Contract Created
                                                    </span>
                                                )}
                                            </div>

                                            {response.status === "Submitted" &&
                                                canEdit() && (
                                                    <Button
                                                        onClick={() =>
                                                            awardContract(
                                                                response
                                                            )
                                                        }
                                                        className="bg-gradient-to-r from-success to-success hover:from-success hover:to-success text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                                                    >
                                                        <Award className="w-4 h-4 mr-2" />
                                                        Award Contract
                                                    </Button>
                                                )}
                                        </div>

                                        {/* Notes */}
                                        {response.notes && (
                                            <div className="mt-4 p-3 bg-surface-2 rounded-lg border border-line">
                                                <div className="text-sm text-ink-3">
                                                    {response.notes}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default ProcurementPage;
