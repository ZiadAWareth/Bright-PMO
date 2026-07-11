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
                return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300";
            case "high":
                return "text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300";
            case "medium":
                return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300";
            default:
                return "text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-300";
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
                return "bg-blue-600 hover:bg-blue-700";
            case "breakdown":
                return "bg-purple-600 hover:bg-purple-700";
            case "accelerate":
                return "bg-orange-600 hover:bg-orange-700";
            case "prepare":
                return "bg-green-600 hover:bg-green-700";
            case "monitor_dependencies":
                return "bg-indigo-600 hover:bg-indigo-700";
            case "emergency_recovery":
                return "bg-red-600 hover:bg-red-700";
            default:
                return "bg-gray-600 hover:bg-gray-700";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Critical Path Risk Management
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {risks.length} risks identified •{" "}
                                {actions.length} recommended actions
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <span className="font-semibold text-red-700 dark:text-red-300">
                                    Critical Risks
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {
                                    risks.filter(
                                        (r) => r.severity === "critical"
                                    ).length
                                }
                            </p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                <span className="font-semibold text-orange-700 dark:text-orange-300">
                                    High Risks
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {
                                    risks.filter((r) => r.severity === "high")
                                        .length
                                }
                            </p>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-500" />
                                <span className="font-semibold text-yellow-700 dark:text-yellow-300">
                                    Medium Risks
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {
                                    risks.filter((r) => r.severity === "medium")
                                        .length
                                }
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Risks Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Identified Risks
                            </h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {risks.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                                        <p>No risks identified</p>
                                        <p className="text-sm">
                                            Your critical path is well-managed!
                                        </p>
                                    </div>
                                ) : (
                                    risks.map((risk, index) => (
                                        <div
                                            key={index}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    {getSeverityIcon(
                                                        risk.severity
                                                    )}
                                                    <h4 className="font-medium text-gray-900 dark:text-white">
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
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                {risk.description}
                                            </p>
                                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-3">
                                                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                                                    Impact: {risk.impact}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
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
                                                                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                                                <span className="text-gray-700 dark:text-gray-300">
                                                                    {task.name}
                                                                </span>
                                                                <span className="text-gray-500 dark:text-gray-400">
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
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-500" />
                                Recommended Actions
                            </h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {actions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <Info className="w-12 h-12 mx-auto mb-2 text-blue-500" />
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
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                    {action.title}
                                                </h4>
                                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                                    {action.tasks.length} tasks
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                                {action.description}
                                            </p>
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
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
                                                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                                    <span className="text-gray-700 dark:text-gray-300">
                                                                        {
                                                                            task.name
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    {action.tasks.length >
                                                        3 && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
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
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CriticalPathManagementModal;