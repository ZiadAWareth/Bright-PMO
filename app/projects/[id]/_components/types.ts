export interface Document {
    id: number;
    name: string;
    type: string;
    size: string;
    uploadedBy: string;
    uploadedDate: string;
    category: string;
    version: string;
    status: "draft" | "review" | "approved" | "archived";
    url: string;
}

export interface Comment {
    id: number;
    author: string;
    content: string;
    timestamp: string;
    type: "general" | "task" | "risk" | "milestone";
    relatedId?: number;
    mentions: string[];
}

export interface AuditLog {
    id: number;
    action: string;
    user: string;
    timestamp: string;
    details: string;
    entityType: string;
    entityId: number;
    oldValue?: string;
    newValue?: string;
}

export interface Integration {
    id: number;
    name: string;
    type: string;
    status: "connected" | "disconnected" | "error" | "syncing";
    lastSync: string;
    description: string;
}

export interface BOMResource {
    id: number;
    name: string;
    category: "labor" | "equipment" | "material";
    type: string;
    unit: string;
    rate: number;
    quantity: number;
    totalCost: number;
    role?: string;
    hours_worked?: number;
    days_used?: number;
    quantity_used?: number;
    total_cost: number;
    assignments: Array<{
        taskName: string;
        quantity: number;
        cost: number;
    }>;
}

export interface BOMData {
    generated_date: string;
    totalCost: number;
    summary: {
        labor: { count: number; totalCost: number };
        equipment: { count: number; totalCost: number };
        material: { count: number; totalCost: number };
        total_resources: number;
        budget_utilization: number;
        cost_variance: number;
    };
    totals: {
        labor_total: number;
        equipment_total: number;
        material_total: number;
        grand_total: number;
    };
    categories: {
        labor: BOMResource[];
        equipment: BOMResource[];
        material: BOMResource[];
    };
    resources: BOMResource[];
}

export interface ProjectApproval {
    id: number;
    project_id: number;
    user_id: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    user: {
        user_id: number;
        username: string;
        email: string;
        account: {
            first_name: string;
            last_name: string;
        };
        role: {
            role_id?: number;
            name: string;
        } | null;
    };
}
