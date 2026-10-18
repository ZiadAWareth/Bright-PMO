import {
    Calendar,
    ArrowLeft,
    Plus,
    Upload,
    Clock,
    AlertTriangle,
    CheckCircle,
    Users,
    Building,
    Search,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Flag,
    Zap,
    X,
    BarChart,
    AlertCircle,
    Info,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/form-shell";

const CriticalPathManagementModal = ({
    risks,
    actions,
    onClose,
    onAction,
}: {
    risks: any[];
    actions: any[];
    onClose: () => void;
    onAction: (action: any, tasks: any[]) => void;
}) => {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical":
                return "text-danger bg-danger-soft ";
            case "high":
                return "text-bright bg-bright-soft ";
            case "medium":
                return "text-warning bg-warning-soft ";
            default:
                return "text-muted bg-surface-2  ";
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "critical":
                return <AlertTriangle className="w-4 h-4" />;
            case "high":
                return <AlertTriangle className="w-4 h-4" />;
            case "medium":
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Info className="w-4 h-4" />;
        }
    };

    const getActionButtonColor = (actionType: string) => {
        switch (actionType) {
            case "assign_resources":
                return "bg-info hover:opacity-90";
            case "breakdown":
                return "bg-accent-violet hover:opacity-90";
            case "accelerate":
                return "bg-bright hover:bg-bright-deep";
            case "prepare":
                return "bg-success hover:opacity-90";
            case "monitor_dependencies":
                return "bg-accent-indigo hover:opacity-90";
            case "emergency_recovery":
                return "bg-danger hover:opacity-90";
            default:
                return "bg-muted hover:bg-ink-solid-3";
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Critical Path Risk Management"
            description={`${risks.length} risks identified • ${actions.length} recommended actions`}
            maxWidthClass="max-w-6xl"
        >

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <StatCard
                            label="Critical Risks"
                            value={risks.filter((r) => r.severity === "critical").length}
                            icon={AlertTriangle}
                            tone="danger"
                        />
                        <StatCard
                            label="High Risks"
                            value={risks.filter((r) => r.severity === "high").length}
                            icon={AlertTriangle}
                            tone="brand"
                        />
                        <StatCard
                            label="Medium Risks"
                            value={risks.filter((r) => r.severity === "medium").length}
                            icon={AlertCircle}
                            tone="warning"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Risks Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-danger" />
                                Identified Risks
                            </h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {risks.length === 0 ? (
                                    <div className="text-center py-8 text-muted">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                                        <p>No risks identified</p>
                                        <p className="text-sm">
                                            Your critical path is well-managed!
                                        </p>
                                    </div>
                                ) : (
                                    risks.map((risk, index) => (
                                        <div
                                            key={index}
                                            className="border border-line rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    {getSeverityIcon(
                                                        risk.severity
                                                    )}
                                                    <h4 className="font-medium text-ink">
                                                        {risk.title}
                                                    </h4>
                                                </div>
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                                                        risk.severity
                                                    )}`}
                                                >
                                                    {risk.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted mb-3">
                                                {risk.description}
                                            </p>
                                            <div className="rounded border border-line border-l-[3px] border-l-danger bg-surface p-3 mb-3">
                                                <p className="text-xs text-ink-2 font-medium">
                                                    Impact: {risk.impact}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted mb-2 font-medium">
                                                    Affected Tasks (
                                                    {risk.tasks.length}):
                                                </p>
                                                <div className="space-y-1 max-h-20 overflow-y-auto">
                                                    {risk.tasks.map(
                                                        (
                                                            task: any,
                                                            taskIndex: number
                                                        ) => (
                                                            <div
                                                                key={taskIndex}
                                                                className="flex items-center gap-2 text-xs"
                                                            >
                                                                <div className="w-2 h-2 bg-danger rounded-full"></div>
                                                                <span className="text-ink-3">
                                                                    {task.name}
                                                                </span>
                                                                <span className="text-muted">
                                                                    (
                                                                    {
                                                                        task.duration
                                                                    }{" "}
                                                                    days)
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Actions Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                                <Zap className="w-5 h-5 text-info" />
                                Recommended Actions
                            </h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {actions.length === 0 ? (
                                    <div className="text-center py-8 text-muted">
                                        <Info className="w-12 h-12 mx-auto mb-2 text-info" />
                                        <p>No actions required</p>
                                        <p className="text-sm">
                                            All risks are being managed
                                            appropriately
                                        </p>
                                    </div>
                                ) : (
                                    actions.map((action, index) => (
                                        <div
                                            key={index}
                                            className="border border-line rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <h4 className="font-medium text-ink">
                                                    {action.title}
                                                </h4>
                                                <span className="px-2 py-1 bg-info-soft text-info text-xs rounded-full">
                                                    {action.tasks.length} tasks
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted mb-4">
                                                {action.description}
                                            </p>
                                            <div className="space-y-2">
                                                <p className="text-xs text-muted font-medium">
                                                    Tasks to address:
                                                </p>
                                                <div className="space-y-1 max-h-16 overflow-y-auto">
                                                    {action.tasks
                                                        .slice(0, 3)
                                                        .map(
                                                            (
                                                                task: any,
                                                                taskIndex: number
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        taskIndex
                                                                    }
                                                                    className="flex items-center gap-2 text-xs"
                                                                >
                                                                    <div className="w-2 h-2 bg-info rounded-full"></div>
                                                                    <span className="text-ink-3">
                                                                        {
                                                                            task.name
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    {action.tasks.length >
                                                        3 && (
                                                        <div className="text-xs text-muted">
                                                            +
                                                            {action.tasks
                                                                .length -
                                                                3}{" "}
                                                            more tasks
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-line">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-ink-3 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors"
                        >
                            Close
                        </button>
                    </div>
        </Modal>
    );
};

export default CriticalPathManagementModal;