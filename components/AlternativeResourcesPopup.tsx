import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

interface Resource {
  resource_id: number;
  name: string;
  email?: string;
  role: string;
  department?: string;
  type?: string;
  rate?: number;
}

interface AlternativeResourcesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  alternatives: Resource[];
  taskId: number;
  onAssignmentComplete: () => void;
}

export function AlternativeResourcesPopup({
  isOpen,
  onClose,
  alternatives,
  taskId,
  onAssignmentComplete,
}: AlternativeResourcesPopupProps) {
  const handleResourceAssignment = async (resourceId: number) => {
    try {
      const response = await axios.post("/api/resourceAssignments", {
        resource_id: resourceId,
        task_id: taskId,
        allocation_percentage: 100,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        planned_hours: 40,
      });

      if (response.status === 201) {
        toast.success("Resource assigned successfully");
        onAssignmentComplete();
        onClose();
      }
    } catch (error: any) {
      console.error("Error assigning alternative resource:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to assign alternative resource";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alternative Resources Available</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted mb-4">
            The selected resource is not available. Here are some alternative
            resources you can assign:
          </p>
          <div className="space-y-3">
            {alternatives.map((resource) => (
              <div
                key={resource.resource_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-surface-2"
              >
                <div>
                  <p className="font-medium">{resource.name}</p>
                  <p className="text-sm text-muted">{resource.role}</p>
                  {resource.department && (
                    <p className="text-xs text-faint">
                      {resource.department}
                    </p>
                  )}
                  {resource.rate && (
                    <p className="text-xs text-faint">${resource.rate}/hr</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleResourceAssignment(resource.resource_id)}
                >
                  Assign
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
