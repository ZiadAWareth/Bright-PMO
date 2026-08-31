import React from "react";

interface ResourceAssignmentCardProps {
    assignment: any;
}

const ResourceAssignmentCard: React.FC<ResourceAssignmentCardProps> = ({
    assignment,
}) => {
    const resource = assignment.resource;
    const skillsText =
        typeof resource.skills === "object" && resource.skills !== null
            ? Object.keys(resource.skills)
                  .filter((key) => resource.skills[key] === true)
                  .map((key) => key.charAt(0).toUpperCase() + key.slice(1).toLowerCase())
                  .join(", ")
            : "";

    const costEstimate = (assignment.planned_hours * resource.rate).toFixed(0);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="p-3 bg-gradient-to-r from-info-soft to-info-soft/50 border border-info rounded-md shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-success"></div>
                        <span className="font-semibold text-success text-sm truncate">
                            {resource.name}
                        </span>
                        <span className="px-2 py-0.5 bg-success-soft text-success rounded-full text-xs font-medium">
                            {resource.type}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-success">
                        <div className="flex items-center">
                            <span className="font-medium mr-1">Role:</span>
                            <span>{resource.role}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium mr-1">Rate:</span>
                            <span>${resource.rate}/hr</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium mr-1">Allocation:</span>
                            <span>{assignment.allocation_percentage}%</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium mr-1">Capacity:</span>
                            <span>{resource.capacity}h/day</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium mr-1">Planned:</span>
                            <span>{assignment.planned_hours}h</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium mr-1">Actual:</span>
                            <span>{assignment.actual_hours}h</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium mr-1">Progress:</span>
                            <span
                                className={`${
                                    assignment.actual_hours >= assignment.planned_hours
                                        ? "text-success font-semibold"
                                        : ""
                                }`}
                            >
                                {Math.min(
                                    100,
                                    Math.round(
                                        (assignment.actual_hours /
                                            assignment.planned_hours) *
                                            100
                                    )
                                )}
                                %
                            </span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium mr-1">Est. Cost:</span>
                            <span>${costEstimate}</span>
                        </div>
                    </div>

                    {resource.department && (
                        <div className="mt-1 text-xs text-success">
                            <span className="font-medium">Department:</span>{" "}
                            {resource.department}
                        </div>
                    )}

                    {skillsText && (
                        <div className="mt-1 text-xs text-success">
                            <span className="font-medium">Skills:</span>
                            <span className="ml-1 truncate" title={skillsText}>
                                {skillsText}
                            </span>
                        </div>
                    )}

                    <div className="mt-1 flex items-center text-xs">
                        <div className="flex items-center space-x-1">
                            <div
                                className={`h-1.5 w-1.5 rounded-full ${
                                    resource.availability_status === "available"
                                        ? "bg-success"
                                        : resource.availability_status === "on_leave"
                                        ? "bg-warning"
                                        : "bg-danger"
                                }`}
                            ></div>
                            <span className="text-success capitalize">
                                {resource.availability_status.replace("_", " ")}
                            </span>
                        </div>
                        {resource.contact_info && (
                            <span className="ml-2 text-success truncate">
                                {resource.contact_info}
                            </span>
                        )}
                    </div>
                </div>

                <div className="ml-2 text-right space-y-1">
                    <div className="text-xs text-muted">
                        {formatDate(assignment.start_date)} -{" "}
                        {formatDate(assignment.end_date)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceAssignmentCard;