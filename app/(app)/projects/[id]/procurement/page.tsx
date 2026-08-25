"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AddEntityModal } from "@/components/AddEntityModal";
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
    Save,
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
    const [activeTab, setActiveTab] = useState("overview");
    const [procurements, setProcurements] = useState<Procurement[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddVendorModal, setShowAddVendorModal] = useState(false);
    const [showAddContractModal, setShowAddContractModal] = useState(false);
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
    const [editingProcurement, setEditingProcurement] =
        useState<Procurement | null>(null);
    const [editingContract, setEditingContract] = useState<Contract | null>(
        null
    );
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [showEditContractModal, setShowEditContractModal] = useState(false);
    const [showEditVendorModal, setShowEditVendorModal] = useState(false);
    const [editForm, setEditForm] = useState({
        type: "material",
        description: "",
        estimated_cost: "",
        actual_cost: "0",
        status: "Planning",
    });
    const [vendorForm, setVendorForm] = useState({
        name: "",
        contact_person: "",
        contact_info: "",
        address: "",
        category: "",
        performance_rating: "0",
    });
    const [contractForm, setContractForm] = useState({
        procurement_id: "",
        vendor_id: "",
        contract_number: "",
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        value: "",
        status: "Draft",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleAddProcurement = async (data: Record<string, any>) => {
        try {
            console.log("Adding procurement with data:", data);

            // Validate required fields
            if (!data.actual_cost || parseFloat(data.actual_cost) <= 0) {
                throw new Error(
                    "Actual cost is required and must be greater than 0"
                );
            }

            const res = await axios.post(
                `/api/projects/${projectId}/procurements`,
                {
                    type: data.type,
                    description: data.description,
                    estimated_cost: parseFloat(data.estimated_cost),
                    actual_cost: parseFloat(data.actual_cost),
                    status: data.status,
                    // Note: contracts_count is for display purposes only,
                    // actual contracts are created separately
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            console.log("Procurement creation response:", res);

            if (res.status === 200 || res.status === 201) {
                setProcurements((prev) => [...prev, res.data]);
                toast.success("Procurement added successfully");
                return res.data; // Return the created procurement
            } else {
                throw new Error(`Unexpected status: ${res.status}`);
            }
        } catch (error: any) {
            console.error("Error adding procurement:", error);

            // Extract error message from response if available
            let errorMessage = "Failed to add procurement";
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.details) {
                errorMessage = `${errorMessage}: ${error.response.data.details}`;
            } else if (error.message) {
                errorMessage = `${errorMessage}: ${error.message}`;
            }

            toast.error(errorMessage);
            throw error; // Re-throw for AddEntityModal to handle
        }
    };

    const handleEditProcurement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProcurement) return;

        // Validate required fields
        if (!editForm.actual_cost || parseFloat(editForm.actual_cost) <= 0) {
            toast.error("Actual cost is required and must be greater than 0");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await axios.put(
                `/api/procurements/${editingProcurement.procurement_id}`,
                {
                    type: editForm.type,
                    description: editForm.description,
                    estimated_cost: parseFloat(editForm.estimated_cost),
                    actual_cost: parseFloat(editForm.actual_cost),
                    status: editForm.status,
                },
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
                    prev.map((p) =>
                        p.procurement_id === editingProcurement.procurement_id
                            ? res.data
                            : p
                    )
                );
                setShowEditModal(false);
                setEditingProcurement(null);
                toast.success("Procurement updated successfully");
            }
        } catch (error) {
            console.error("Error updating procurement:", error);
            toast.error("Failed to update procurement");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProcurement = async (procurementId: number) => {
        if (
            !confirm(
                "Are you sure you want to delete this procurement? This will also delete all associated contracts."
            )
        )
            return;

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

    const handleAddVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await axios.post(
                `/api/vendors`,
                {
                    name: vendorForm.name,
                    contact_person: vendorForm.contact_person,
                    contact_info: vendorForm.contact_info,
                    address: vendorForm.address,
                    category: vendorForm.category,
                    performance_rating: parseFloat(
                        vendorForm.performance_rating
                    ),
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
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

    const handleAddContract = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await axios.post(
                `/api/contracts`,
                {
                    procurement_id: parseInt(contractForm.procurement_id),
                    vendor_id: parseInt(contractForm.vendor_id),
                    contract_number: contractForm.contract_number,
                    name: contractForm.name,
                    description: contractForm.description,
                    start_date: contractForm.start_date,
                    end_date: contractForm.end_date,
                    value: parseFloat(contractForm.value),
                    status: contractForm.status,
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            if (res.status === 201) {
                setContracts((prev) => [...prev, res.data]);

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

                setShowAddContractModal(false);
                setContractForm({
                    procurement_id: "",
                    vendor_id: "",
                    contract_number: "",
                    name: "",
                    description: "",
                    start_date: "",
                    end_date: "",
                    value: "",
                    status: "Draft",
                });
                toast.success("Contract added successfully");
            }
        } catch (error) {
            console.error("Error adding contract:", error);
            toast.error("Failed to add contract");
        } finally {
            setIsSubmitting(false);
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
        setEditingProcurement(procurement);
        setEditForm({
            type: procurement.type,
            description: procurement.description,
            estimated_cost: procurement.estimated_cost.toString(),
            actual_cost: procurement.actual_cost.toString(),
            status: procurement.status,
        });
        setShowEditModal(true);
    };

    const openEditContractModal = (contract: Contract) => {
        setEditingContract(contract);
        setContractForm({
            procurement_id: contract.procurement_id.toString(),
            vendor_id: contract.vendor_id.toString(),
            contract_number: contract.contract_number,
            name: contract.name,
            description: contract.description,
            start_date: contract.start_date.split("T")[0],
            end_date: contract.end_date.split("T")[0],
            value: contract.value.toString(),
            status: contract.status,
        });
        setShowEditContractModal(true);
    };

    const openEditVendorModal = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setVendorForm({
            name: vendor.name,
            contact_person: vendor.contact_person,
            contact_info: vendor.contact_info,
            address: vendor.address,
            category: vendor.category,
            performance_rating: vendor.performance_rating.toString(),
        });
        setShowEditVendorModal(true);
    };

    const handleEditContract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingContract) return;

        try {
            setIsSubmitting(true);
            const response = await axios.put(
                `/api/contracts/${editingContract.contract_id}`,
                {
                    procurement_id: parseInt(contractForm.procurement_id),
                    vendor_id: parseInt(contractForm.vendor_id),
                    contract_number: contractForm.contract_number,
                    name: contractForm.name,
                    description: contractForm.description,
                    start_date: contractForm.start_date,
                    end_date: contractForm.end_date,
                    value: parseFloat(contractForm.value),
                    status: contractForm.status,
                },
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
                    prev.map((c) =>
                        c.contract_id === editingContract.contract_id
                            ? response.data
                            : c
                    )
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

                setShowEditContractModal(false);
                setEditingContract(null);
                setContractForm({
                    procurement_id: "",
                    vendor_id: "",
                    contract_number: "",
                    name: "",
                    description: "",
                    start_date: "",
                    end_date: "",
                    value: "",
                    status: "Draft",
                });
                toast.success("Contract updated successfully");
            }
        } catch (error) {
            console.error("Error updating contract:", error);
            toast.error("Failed to update contract");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVendor) return;

        try {
            setIsSubmitting(true);
            const response = await axios.put(
                `/api/vendors/${editingVendor.vendor_id}`,
                {
                    name: vendorForm.name,
                    contact_person: vendorForm.contact_person,
                    contact_info: vendorForm.contact_info,
                    address: vendorForm.address,
                    category: vendorForm.category,
                    performance_rating: parseFloat(
                        vendorForm.performance_rating
                    ),
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            if (response.status === 200) {
                setVendors((prev) =>
                    prev.map((v) =>
                        v.vendor_id === editingVendor.vendor_id
                            ? response.data
                            : v
                    )
                );
                setShowEditVendorModal(false);
                setEditingVendor(null);
                setVendorForm({
                    name: "",
                    contact_person: "",
                    contact_info: "",
                    address: "",
                    category: "",
                    performance_rating: "0",
                });
                toast.success("Vendor updated successfully");
            }
        } catch (error) {
            console.error("Error updating vendor:", error);
            toast.error("Failed to update vendor");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteVendor = async (vendorId: number) => {
        if (!confirm("Are you sure you want to delete this vendor?")) return;

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
        if (!confirm("Are you sure you want to delete this contract?")) return;

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

    // Define fields for AddEntityModal
    const procurementFields = [
        {
            name: "type",
            label: "Type",
            type: "select" as const,
            required: true,
            defaultValue: "material",
            options: [
                { value: "material", label: "Material" },
                { value: "service", label: "Service" },
                { value: "equipment", label: "Equipment" },
            ],
        },
        {
            name: "description",
            label: "Description",
            type: "textarea" as const,
            required: true,
            defaultValue: "",
        },
        {
            name: "estimated_cost",
            label: "Estimated Cost (OMR)",
            type: "number" as const,
            required: true,
            defaultValue: "",
            min: 0,
        },
        {
            name: "actual_cost",
            label: "Actual Cost (OMR)",
            type: "number" as const,
            required: true,
            defaultValue: "",
            min: 0,
        },
        {
            name: "status",
            label: "Status",
            type: "select" as const,
            required: true,
            defaultValue: "Planning",
            options: [
                { value: "Planning", label: "Planning" },
                { value: "Tendering", label: "Tendering" },
                { value: "Evaluation", label: "Evaluation" },
                { value: "Awarded", label: "Awarded" },
                { value: "Completed", label: "Completed" },
                { value: "Cancelled", label: "Cancelled" },
            ],
        },
    ];

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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
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
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Access Denied
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            You don't have permission to view this procurement
                            page. This content is restricted to PJM, PMO, ENG,
                            SITE, and ADMIN roles.
                        </p>
                        <button
                            onClick={() =>
                                router.push(`/projects/${projectId}`)
                            }
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                View-Only Access
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
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
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.push(`/projects/${projectId}`)}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Project Procurement
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Comprehensive procurement and contract management
                        </p>
                    </div>
                </div>
                {canEdit() && (
                    <AddEntityModal
                        entityName="Procurement"
                        fields={procurementFields}
                        onSubmit={handleAddProcurement}
                        triggerButton={
                            <Button className="flex items-center space-x-2 bg-orange-500 text-white">
                                <Plus size={16} />
                                <span>Add Procurement</span>
                            </Button>
                        }
                    />
                )}
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-6">
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
                                    <FileTextIcon className="w-8 h-8 text-green-600" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Active Contracts
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {activeContracts}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center space-x-3">
                                    <Users className="w-8 h-8 text-purple-600" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Top Vendors
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {topVendors}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center space-x-3">
                                    <DollarSign className="w-8 h-8 text-orange-600" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Total Value
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            OMR{" "}
                                            {totalEstimatedValue.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Procurement Status Chart */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                    Procurement Status
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {
                                                procurements.filter(
                                                    (p) =>
                                                        p.status === "Planning"
                                                ).length
                                            }
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Planning
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-orange-600">
                                            {
                                                procurements.filter(
                                                    (p) =>
                                                        p.status === "Tendering"
                                                ).length
                                            }
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Tendering
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {
                                                procurements.filter(
                                                    (p) =>
                                                        p.status === "Awarded"
                                                ).length
                                            }
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Awarded
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {completedProcurements}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Completed
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                    Recent Activity
                                </h3>
                                <div className="space-y-3">
                                    {procurements
                                        .slice(0, 5)
                                        .map((procurement) => (
                                            <div
                                                key={procurement.procurement_id}
                                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    {getTypeIcon(
                                                        procurement.type
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">
                                                            {
                                                                procurement.description
                                                            }
                                                        </p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
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
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    All Procurements
                                </h2>
                            </div>

                            {procurements.length === 0 ? (
                                <div className="p-8 text-center">
                                    <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                                        No procurements found for this project.
                                    </p>
                                    {canEdit() && (
                                        <AddEntityModal
                                            entityName="Procurement"
                                            fields={procurementFields}
                                            onSubmit={handleAddProcurement}
                                            triggerButton={
                                                <Button className="flex items-center space-x-2">
                                                    <Plus size={16} />
                                                    <span>
                                                        Add First Procurement
                                                    </span>
                                                </Button>
                                            }
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {procurements.map((procurement) => (
                                        <div
                                            key={procurement.procurement_id}
                                            className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        {getTypeIcon(
                                                            procurement.type
                                                        )}
                                                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                            {
                                                                procurement.description
                                                            }
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

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Estimated Cost:
                                                            </span>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                OMR{" "}
                                                                {procurement.estimated_cost.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Actual Cost:
                                                            </span>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                OMR{" "}
                                                                {procurement.actual_cost.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Variance:
                                                            </span>
                                                            <p
                                                                className={`font-medium ${
                                                                    procurement.actual_cost -
                                                                        procurement.estimated_cost >=
                                                                    0
                                                                        ? "text-red-600 dark:text-red-400"
                                                                        : "text-green-600 dark:text-green-400"
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

                                                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
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
                                                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
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
                                                                    className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
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
                                                                    className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
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
                                                                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
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
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Contracts
                                </h2>
                                {canEdit() && (
                                    <Button
                                        onClick={() =>
                                            setShowAddContractModal(true)
                                        }
                                        className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white"
                                    >
                                        <Plus size={16} />
                                        <span>Add Contract</span>
                                    </Button>
                                )}
                            </div>

                            {contracts.length === 0 ? (
                                <div className="p-8 text-center">
                                    <FileTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                                        No contracts found.
                                    </p>
                                    {canEdit() && (
                                        <Button
                                            onClick={() =>
                                                setShowAddContractModal(true)
                                            }
                                            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white"
                                        >
                                            <Plus size={16} />
                                            <span>Add First Contract</span>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {contracts.map((contract) => (
                                        <div
                                            key={contract.contract_id}
                                            className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <FileTextIcon className="w-4 h-4 text-blue-600" />
                                                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                            {contract.name}
                                                        </h3>
                                                        <div className="flex items-center space-x-2">
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    contract.status ===
                                                                    "Active"
                                                                        ? "bg-green-100 text-green-800"
                                                                        : contract.status ===
                                                                          "Draft"
                                                                        ? "bg-yellow-100 text-yellow-800"
                                                                        : "bg-gray-100 text-gray-800"
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
                                                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteContract(
                                                                                contract.contract_id
                                                                            )
                                                                        }
                                                                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                                                        {contract.description}
                                                    </p>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Contract #:
                                                            </span>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                {
                                                                    contract.contract_number
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Value:
                                                            </span>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                OMR{" "}
                                                                {contract.value.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Start Date:
                                                            </span>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                {new Date(
                                                                    contract.start_date
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                End Date:
                                                            </span>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                {new Date(
                                                                    contract.end_date
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {contract.vendor && (
                                                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                            <div className="flex items-center space-x-2">
                                                                <Users className="w-4 h-4 text-purple-600" />
                                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                    Vendor:{" "}
                                                                    {
                                                                        contract
                                                                            .vendor
                                                                            .name
                                                                    }
                                                                </span>
                                                                <span className="text-sm text-gray-600 dark:text-gray-400">
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
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Vendors
                                </h2>
                                {canEdit() && (
                                    <Button
                                        onClick={() =>
                                            setShowAddVendorModal(true)
                                        }
                                        className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white"
                                    >
                                        <Plus size={16} />
                                        <span>Add Vendor</span>
                                    </Button>
                                )}
                            </div>

                            {vendors.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                                        No vendors found.
                                    </p>
                                    {canEdit() && (
                                        <Button
                                            onClick={() =>
                                                setShowAddVendorModal(true)
                                            }
                                            className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white"
                                        >
                                            <Plus size={16} />
                                            <span>Add First Vendor</span>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {vendors.map((vendor) => (
                                        <div
                                            key={vendor.vendor_id}
                                            className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <Users className="w-4 h-4 text-purple-600" />
                                                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                                            {vendor.name}
                                                        </h3>
                                                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                                            {vendor.category}
                                                        </span>
                                                        <div className="flex items-center space-x-1">
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                Rating:
                                                            </span>
                                                            <span className="text-sm font-medium text-yellow-600">
                                                                {
                                                                    vendor.performance_rating
                                                                }
                                                                /5
                                                            </span>
                                                        </div>
                                                        {vendor.performance_rating >=
                                                            4.0 && (
                                                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                                                Top Rated
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Contact:
                                                            </span>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                {
                                                                    vendor.contact_person
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Info:
                                                            </span>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                {
                                                                    vendor.contact_info
                                                                }
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
                                                        <div>
                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                Contracts:
                                                            </span>
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
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
                                                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteVendor(
                                                                    vendor.vendor_id
                                                                )
                                                            }
                                                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
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
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {activeRFQs.length} Active RFQs
                                </div>
                            </div>

                            {/* Active RFQs */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                    Active RFQs
                                </h4>
                                {activeRFQs.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
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
                                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                                                {
                                                                    procurement?.description
                                                                }
                                                            </h5>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                Generated:{" "}
                                                                {new Date(
                                                                    rfq.generated_at
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {
                                                                    responses.length
                                                                }{" "}
                                                                Responses
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {responses.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                Vendor
                                                                Responses:
                                                            </h6>
                                                            {responses.map(
                                                                (response) => (
                                                                    <div
                                                                        key={
                                                                            response.rfq_response_id
                                                                        }
                                                                        className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded"
                                                                    >
                                                                        <div className="flex-1">
                                                                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                                                {
                                                                                    response
                                                                                        .vendor
                                                                                        ?.name
                                                                                }
                                                                            </p>
                                                                            <p className="text-xs text-gray-600 dark:text-gray-400">
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
                                                                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                                                        : response.status ===
                                                                                          "Evaluated"
                                                                                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                                                                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
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
                                                                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
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
                                                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
                                                            <p className="text-sm text-green-800 dark:text-green-300">
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
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                                <h4 className="text-md font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                    How to Generate RFQs
                                </h4>
                                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
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

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-2xl border border-white/20 dark:border-gray-700/50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-3">
                                <Edit className="w-5 h-5 text-white" />
                            </div>
                            Edit Procurement
                        </DialogTitle>
                    </DialogHeader>

                    <form
                        onSubmit={handleEditProcurement}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-2 gap-6">
                            <div className="group">
                                <Label
                                    htmlFor="edit-type"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Type <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={editForm.type}
                                    onValueChange={(value: string) =>
                                        setEditForm({
                                            ...editForm,
                                            type: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300">
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="material">
                                            Material
                                        </SelectItem>
                                        <SelectItem value="service">
                                            Service
                                        </SelectItem>
                                        <SelectItem value="equipment">
                                            Equipment
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-status"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Status{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={editForm.status}
                                    onValueChange={(value: string) =>
                                        setEditForm({
                                            ...editForm,
                                            status: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300">
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Planning">
                                            Planning
                                        </SelectItem>
                                        <SelectItem value="Tendering">
                                            Tendering
                                        </SelectItem>
                                        <SelectItem value="Evaluation">
                                            Evaluation
                                        </SelectItem>
                                        <SelectItem value="Awarded">
                                            Awarded
                                        </SelectItem>
                                        <SelectItem value="Completed">
                                            Completed
                                        </SelectItem>
                                        <SelectItem value="Cancelled">
                                            Cancelled
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-estimated-cost"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Estimated Cost (OMR){" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-estimated-cost"
                                    type="number"
                                    value={editForm.estimated_cost}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            estimated_cost: e.target.value,
                                        })
                                    }
                                    required
                                    min={0}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-actual-cost"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Actual Cost (OMR)
                                </Label>
                                <Input
                                    id="edit-actual-cost"
                                    type="number"
                                    value={editForm.actual_cost}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            actual_cost: e.target.value,
                                        })
                                    }
                                    min={0}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                />
                            </div>

                            <div className="md:col-span-2 group">
                                <Label
                                    htmlFor="edit-description"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Description{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="edit-description"
                                    value={editForm.description}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            description: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowEditModal(false)}
                                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-blue-600 hover:to-purple-600"
                            >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                <span className="relative flex items-center">
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Update Procurement
                                        </>
                                    )}
                                </span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Vendor Modal */}
            <Dialog
                open={showAddVendorModal}
                onOpenChange={setShowAddVendorModal}
            >
                <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-2xl border border-white/20 dark:border-gray-700/50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            Add New Vendor
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAddVendor} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="group">
                                <Label
                                    htmlFor="vendor-name"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Vendor Name{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="vendor-name"
                                    type="text"
                                    value={vendorForm.name}
                                    onChange={(e) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="vendor-category"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Category{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={vendorForm.category}
                                    onValueChange={(value: string) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            category: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Construction">
                                            Construction
                                        </SelectItem>
                                        <SelectItem value="Materials">
                                            Materials
                                        </SelectItem>
                                        <SelectItem value="Services">
                                            Services
                                        </SelectItem>
                                        <SelectItem value="Equipment">
                                            Equipment
                                        </SelectItem>
                                        <SelectItem value="Consulting">
                                            Consulting
                                        </SelectItem>
                                        <SelectItem value="Technology">
                                            Technology
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="vendor-contact-person"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contact Person{" "}
                                    <span className="text-red-500">*</span>
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
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="vendor-performance-rating"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Performance Rating
                                </Label>
                                <Select
                                    value={vendorForm.performance_rating}
                                    onValueChange={(value: string) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            performance_rating: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300">
                                        <SelectValue placeholder="Select Rating" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1.0">
                                            1.0 - Poor
                                        </SelectItem>
                                        <SelectItem value="2.0">
                                            2.0 - Below Average
                                        </SelectItem>
                                        <SelectItem value="3.0">
                                            3.0 - Average
                                        </SelectItem>
                                        <SelectItem value="4.0">
                                            4.0 - Good
                                        </SelectItem>
                                        <SelectItem value="5.0">
                                            5.0 - Excellent
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2 group">
                                <Label
                                    htmlFor="vendor-contact-info"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contact Information{" "}
                                    <span className="text-red-500">*</span>
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
                                    required
                                    placeholder="Email, phone, etc."
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>

                            <div className="md:col-span-2 group">
                                <Label
                                    htmlFor="vendor-address"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Address{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="vendor-address"
                                    value={vendorForm.address}
                                    onChange={(e) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            address: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddVendorModal(false)}
                                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-purple-600 hover:to-pink-600"
                            >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                <span className="relative flex items-center">
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Vendor
                                        </>
                                    )}
                                </span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Contract Modal */}
            <Dialog
                open={showAddContractModal}
                onOpenChange={setShowAddContractModal}
            >
                <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-2xl border border-white/20 dark:border-gray-700/50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-3">
                                <FileTextIcon className="w-5 h-5 text-white" />
                            </div>
                            Add New Contract
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAddContract} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="group">
                                <Label
                                    htmlFor="contract-procurement"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Procurement{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={contractForm.procurement_id}
                                    onValueChange={(value: string) =>
                                        setContractForm({
                                            ...contractForm,
                                            procurement_id: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 group-hover:border-green-300">
                                        <SelectValue placeholder="Select Procurement" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {procurements.map((procurement) => (
                                            <SelectItem
                                                key={procurement.procurement_id}
                                                value={procurement.procurement_id.toString()}
                                            >
                                                {procurement.description} (OMR{" "}
                                                {procurement.estimated_cost.toLocaleString()}
                                                )
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="contract-vendor"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Vendor{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={contractForm.vendor_id}
                                    onValueChange={(value: string) =>
                                        setContractForm({
                                            ...contractForm,
                                            vendor_id: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 group-hover:border-green-300">
                                        <SelectValue placeholder="Select Vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendors.map((vendor) => (
                                            <SelectItem
                                                key={vendor.vendor_id}
                                                value={vendor.vendor_id.toString()}
                                            >
                                                {vendor.name} ({vendor.category}{" "}
                                                - {vendor.performance_rating}/5)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="contract-number"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contract Number{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="contract-number"
                                    type="text"
                                    value={contractForm.contract_number}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            contract_number: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="e.g., CON-2025-001"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 group-hover:border-green-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="contract-value"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contract Value (OMR){" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="contract-value"
                                    type="number"
                                    value={contractForm.value}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            value: e.target.value,
                                        })
                                    }
                                    required
                                    min={0}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 group-hover:border-green-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="contract-start-date"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Start Date{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="contract-start-date"
                                    type="date"
                                    value={contractForm.start_date}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            start_date: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 group-hover:border-green-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="contract-end-date"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    End Date{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="contract-end-date"
                                    type="date"
                                    value={contractForm.end_date}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            end_date: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 group-hover:border-green-300"
                                />
                            </div>

                            <div className="md:col-span-2 group">
                                <Label
                                    htmlFor="contract-name"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contract Name{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="contract-name"
                                    type="text"
                                    value={contractForm.name}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 group-hover:border-green-300"
                                />
                            </div>

                            <div className="md:col-span-2 group">
                                <Label
                                    htmlFor="contract-description"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Description{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="contract-description"
                                    value={contractForm.description}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            description: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 group-hover:border-green-300"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddContractModal(false)}
                                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-green-600 hover:to-emerald-600"
                            >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                <span className="relative flex items-center">
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Contract
                                        </>
                                    )}
                                </span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* RFQ Responses Modal */}
            <Dialog
                open={showRFQResponsesModal}
                onOpenChange={setShowRFQResponsesModal}
            >
                <DialogContent
                    className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/50 max-h-[90vh] overflow-y-auto"
                    style={{
                        width: "95vw",
                        maxWidth: "1400px",
                        margin: "0 auto",
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-3">
                                <Award className="w-5 h-5 text-white" />
                            </div>
                            RFQ Responses -{" "}
                            {selectedRFQProcurement?.description}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Procurement Details Card */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                Procurement Details
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Estimated Cost
                                    </div>
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        OMR{" "}
                                        {selectedRFQProcurement?.estimated_cost.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Type
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                                        {selectedRFQProcurement?.type}
                                    </div>
                                </div>
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Status
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                        {selectedRFQProcurement?.status}
                                    </div>
                                </div>
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Responses
                                    </div>
                                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
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
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                <Users className="w-5 h-5 mr-2 text-purple-600" />
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
                                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        {/* Header with ranking and vendor info */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center space-x-4">
                                                <div
                                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                                        index === 0
                                                            ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                                                            : index === 1
                                                            ? "bg-gradient-to-r from-gray-400 to-gray-600"
                                                            : "bg-gradient-to-r from-orange-400 to-orange-600"
                                                    }`}
                                                >
                                                    {index === 0
                                                        ? "🥇"
                                                        : index === 1
                                                        ? "🥈"
                                                        : "🥉"}
                                                </div>
                                                <div>
                                                    <h5 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                        {response.vendor?.name}
                                                    </h5>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Submitted:{" "}
                                                        {new Date(
                                                            response.submitted_date
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    OMR{" "}
                                                    {response.quote_amount.toLocaleString()}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    {response.delivery_time}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score Cards */}
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 text-center border border-blue-200 dark:border-blue-800">
                                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                    Technical Score
                                                </div>
                                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                    {response.technical_score}
                                                    /100
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
                                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                    Commercial Score
                                                </div>
                                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    {response.commercial_score}
                                                    /100
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 text-center border border-purple-200 dark:border-purple-800">
                                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                    Total Score
                                                </div>
                                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
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
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                            : response.status ===
                                                              "Evaluated"
                                                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                                    }`}
                                                >
                                                    {response.status}
                                                </span>
                                                {response.status ===
                                                    "Awarded" && (
                                                    <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
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
                                                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                                                    >
                                                        <Award className="w-4 h-4 mr-2" />
                                                        Award Contract
                                                    </Button>
                                                )}
                                        </div>

                                        {/* Notes */}
                                        {response.notes && (
                                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                                <div className="text-sm text-gray-700 dark:text-gray-300">
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

            {/* Edit Contract Modal */}
            <Dialog
                open={showEditContractModal}
                onOpenChange={setShowEditContractModal}
            >
                <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 w-full max-w-4xl mx-4 shadow-2xl border border-white/20 dark:border-gray-700/50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-3">
                                <Edit className="w-5 h-5 text-white" />
                            </div>
                            Edit Contract
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleEditContract} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group">
                                <Label
                                    htmlFor="edit-procurement-id"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Procurement{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={contractForm.procurement_id}
                                    onValueChange={(value: string) =>
                                        setContractForm({
                                            ...contractForm,
                                            procurement_id: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300">
                                        <SelectValue placeholder="Select Procurement" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {procurements.map((procurement) => (
                                            <SelectItem
                                                key={procurement.procurement_id}
                                                value={procurement.procurement_id.toString()}
                                            >
                                                {procurement.description} (OMR{" "}
                                                {procurement.estimated_cost.toLocaleString()}
                                                )
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-vendor-id"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Vendor{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={contractForm.vendor_id}
                                    onValueChange={(value: string) =>
                                        setContractForm({
                                            ...contractForm,
                                            vendor_id: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300">
                                        <SelectValue placeholder="Select Vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendors.map((vendor) => (
                                            <SelectItem
                                                key={vendor.vendor_id}
                                                value={vendor.vendor_id.toString()}
                                            >
                                                {vendor.name} ({vendor.category}{" "}
                                                - {vendor.performance_rating}/5)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-contract-number"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contract Number{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-contract-number"
                                    type="text"
                                    value={contractForm.contract_number}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            contract_number: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="e.g., CON-2025-001"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-contract-value"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contract Value (OMR){" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-contract-value"
                                    type="number"
                                    value={contractForm.value}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            value: e.target.value,
                                        })
                                    }
                                    required
                                    min={0}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-contract-start-date"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Start Date{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-contract-start-date"
                                    type="date"
                                    value={contractForm.start_date}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            start_date: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-contract-end-date"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    End Date{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-contract-end-date"
                                    type="date"
                                    value={contractForm.end_date}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            end_date: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-contract-status"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Status{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={contractForm.status}
                                    onValueChange={(value: string) =>
                                        setContractForm({
                                            ...contractForm,
                                            status: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300">
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Draft">
                                            Draft
                                        </SelectItem>
                                        <SelectItem value="Active">
                                            Active
                                        </SelectItem>
                                        <SelectItem value="Completed">
                                            Completed
                                        </SelectItem>
                                        <SelectItem value="Terminated">
                                            Terminated
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2 group">
                                <Label
                                    htmlFor="edit-contract-name"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contract Name{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-contract-name"
                                    type="text"
                                    value={contractForm.name}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                />
                            </div>

                            <div className="md:col-span-2 group">
                                <Label
                                    htmlFor="edit-contract-description"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Description{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="edit-contract-description"
                                    value={contractForm.description}
                                    onChange={(e) =>
                                        setContractForm({
                                            ...contractForm,
                                            description: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 group-hover:border-blue-300"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowEditContractModal(false)}
                                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-blue-600 hover:to-purple-600"
                            >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                <span className="relative flex items-center">
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Update Contract
                                        </>
                                    )}
                                </span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Vendor Modal */}
            <Dialog
                open={showEditVendorModal}
                onOpenChange={setShowEditVendorModal}
            >
                <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-2xl border border-white/20 dark:border-gray-700/50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
                                <Edit className="w-5 h-5 text-white" />
                            </div>
                            Edit Vendor
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleEditVendor} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group">
                                <Label
                                    htmlFor="edit-vendor-name"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Vendor Name{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-vendor-name"
                                    type="text"
                                    value={vendorForm.name}
                                    onChange={(e) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="Enter vendor name"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-vendor-category"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Category{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-vendor-category"
                                    type="text"
                                    value={vendorForm.category}
                                    onChange={(e) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            category: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="e.g., Construction, Materials, Services"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-vendor-contact-person"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contact Person{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-vendor-contact-person"
                                    type="text"
                                    value={vendorForm.contact_person}
                                    onChange={(e) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            contact_person: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="Primary contact person"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>

                            <div className="group">
                                <Label
                                    htmlFor="edit-vendor-performance-rating"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Performance Rating{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-vendor-performance-rating"
                                    type="number"
                                    value={vendorForm.performance_rating}
                                    onChange={(e) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            performance_rating: e.target.value,
                                        })
                                    }
                                    required
                                    min={0}
                                    max={5}
                                    step={0.1}
                                    placeholder="0.0 - 5.0"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>

                            <div className="md:col-span-2 group">
                                <Label
                                    htmlFor="edit-vendor-contact-info"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Contact Information{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-vendor-contact-info"
                                    type="text"
                                    value={vendorForm.contact_info}
                                    onChange={(e) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            contact_info: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="Email, phone, etc."
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>

                            <div className="md:col-span-2 group">
                                <Label
                                    htmlFor="edit-vendor-address"
                                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                                >
                                    Address{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="edit-vendor-address"
                                    value={vendorForm.address}
                                    onChange={(e) =>
                                        setVendorForm({
                                            ...vendorForm,
                                            address: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="Full address"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 group-hover:border-purple-300"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowEditVendorModal(false)}
                                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 hover:from-purple-600 hover:to-pink-600"
                            >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                <span className="relative flex items-center">
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Update Vendor
                                        </>
                                    )}
                                </span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default ProcurementPage;
