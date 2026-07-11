import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import TemplateManagerBase, { DownloadButton } from "@/components/TemplateManagerBase";

interface TaskTemplateManagerProps {
  projectId: number;
  onTasksCreated?: () => void;
}

interface UploadResult {
  message: string;
  created_tasks: {
    task_id: number;
    name: string;
    wbs_name: string;
    status: string;
    priority: string;
    is_milestone: boolean;
    is_critical_path: boolean;
  }[];
  errors: {
    row: number;
    field: string;
    error: string;
  }[];
  summary: {
    total_processed: number;
    successful: number;
    failed: number;
  };
}

const TaskTemplateManager: React.FC<TaskTemplateManagerProps> = ({
  projectId,
  onTasksCreated,
}) => {
  const renderDownloadCardContent = ({
    isDownloading,
    onDownload,
  }: {
    isDownloading: boolean;
    onDownload: () => Promise<void>;
  }) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div>
          <h4 className="font-medium text-foreground mb-2">
            Template includes:
          </h4>
          <ul className="space-y-1">
            <li>• Tasks data sheet with sample data</li>
            <li>• WBS reference sheet for selection</li>
            <li>• Task reference sheet for dependencies</li>
            <li>• Comprehensive instructions</li>
            <li>• Field validation rules</li>
            <li>• Status and priority options</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-foreground mb-2">
            Template features:
          </h4>
          <ul className="space-y-1">
            <li>• Pre-configured field validation</li>
            <li>• WBS assignment support</li>
            <li>• Task dependency management</li>
            <li>• Duration calculation</li>
            <li>• Milestone and critical path flags</li>
            <li>• Priority and status management</li>
          </ul>
        </div>
      </div>

      <Separator />

      <DownloadButton
        isDownloading={isDownloading}
        onDownload={onDownload}
        text="Download Tasks Template"
        className="w-full"
        size="lg"
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The template includes live data from your current WBS items
          for task assignment. Download a fresh template if you've
          added new WBS items recently.
        </AlertDescription>
      </Alert>
    </>
  );

  const renderUploadResult = (result: UploadResult) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result.created_tasks.length > 0 ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          Upload Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {result.summary.total_processed}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Processed
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {result.summary.successful}
              </div>
              <div className="text-sm text-muted-foreground">
                Successful
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {result.summary.failed}
              </div>
              <div className="text-sm text-muted-foreground">
                Failed
              </div>
            </div>
          </div>

          {result.summary.successful > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Progress
                  value={
                    (result.summary.successful /
                      result.summary.total_processed) *
                    100
                  }
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">
                  {Math.round(
                    (result.summary.successful /
                      result.summary.total_processed) *
                      100
                  )}
                  %
                </span>
              </div>
            </div>
          )}

          {result.created_tasks.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Created Tasks ({result.created_tasks.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {result.created_tasks.map((task) => (
                  <div
                    key={task.task_id}
                    className="flex items-center justify-between p-2 bg-green-50 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{task.name}</span>
                      <Badge variant="outline">{task.wbs_name}</Badge>
                      <Badge variant="secondary">
                        {task.priority}
                      </Badge>
                      {task.is_milestone && (
                        <Badge variant="default">Milestone</Badge>
                      )}
                      {task.is_critical_path && (
                        <Badge variant="destructive">Critical</Badge>
                      )}
                    </div>
                    <Badge
                      variant={
                        task.status === "completed"
                          ? "default"
                          : task.status === "in_progress"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                Errors ({result.errors.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200"
                  >
                    <Badge variant="destructive" className="shrink-0">
                      Row {error.row}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium text-red-700">
                        {error.field}
                      </div>
                      <div className="text-sm text-red-600">
                        {error.error}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const helpTabContent = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Help & Instructions
        </CardTitle>
        <CardDescription>
          Step-by-step guide to using the Tasks template
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">How to Use:</h4>
            <ol className="space-y-2 text-sm pl-4">
              <li>1. Download the Tasks template from the Download tab</li>
              <li>2. Open the Excel file and review the instructions</li>
              <li>3. Fill in the "Tasks" sheet with your data</li>
              <li>
                4. Use the "WBS Reference" sheet to find WBS IDs
              </li>
              <li>
                5. Use the "Task Reference" sheet to set up dependencies
              </li>
              <li>6. Remove the sample data row before uploading</li>
              <li>7. Save the file and upload it using the Upload tab</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Field Requirements:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <Badge variant="destructive">Required</Badge>
                <span>
                  Name, Description, WBS ID, Start Date, End Date, Duration
                </span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Optional</Badge>
                <span>
                  Estimated Hours, Work Package, Priority, Status, 
                  Is Milestone, Is Critical Path, Dependencies
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Task Dependencies Guide:</h4>
            <div className="space-y-4 text-sm">
              <div>
                <h5 className="font-medium text-foreground mb-2">Dependency Types Supported:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded border">
                    <div className="font-medium text-blue-700">Finish-to-Start (FS)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Task B cannot start until Task A finishes<br/>
                      <code>finish_to_start</code> (Most common)
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded border">
                    <div className="font-medium text-green-700">Start-to-Start (SS)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Task B cannot start until Task A starts<br/>
                      <code>start_to_start</code>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded border">
                    <div className="font-medium text-orange-700">Finish-to-Finish (FF)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Task B cannot finish until Task A finishes<br/>
                      <code>finish_to_finish</code>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded border">
                    <div className="font-medium text-purple-700">Start-to-Finish (SF)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Task B cannot finish until Task A starts<br/>
                      <code>start_to_finish</code> (Rarely used)
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-foreground mb-2">How to Set Dependencies:</h5>
                <div className="space-y-2">
                  <div className="p-2 bg-blue-50 rounded border">
                    <div className="font-medium text-blue-700">Predecessor Task IDs Column:</div>
                    <div className="text-xs">Enter comma-separated Task IDs that must complete before this task</div>
                    <div className="text-xs font-mono bg-white p-1 rounded mt-1">Example: "5,12,18" or "3"</div>
                  </div>
                  <div className="p-2 bg-green-50 rounded border">
                    <div className="font-medium text-green-700">Dependency Type Column:</div>
                    <div className="text-xs">Choose the relationship type (default: finish_to_start if empty)</div>
                    <div className="text-xs font-mono bg-white p-1 rounded mt-1">Example: "finish_to_start" or "start_to_start"</div>
                  </div>
                  <div className="p-2 bg-orange-50 rounded border">
                    <div className="font-medium text-orange-700">Lag Time Column:</div>
                    <div className="text-xs">Add delay in days between dependent tasks (optional)</div>
                    <div className="text-xs font-mono bg-white p-1 rounded mt-1">Example: "2" (adds 2-day delay) or leave empty for no lag</div>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-foreground mb-2">Dependency Examples:</h5>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-gray-50 rounded border">
                    <div className="font-medium">Simple Sequential Tasks:</div>
                    <div>Task 5 must finish before Task 6 starts</div>
                    <div className="font-mono mt-1">
                      Predecessor IDs: "5" | Type: "finish_to_start" | Lag: (empty)
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded border">
                    <div className="font-medium">Multiple Dependencies:</div>
                    <div>Task 10 waits for Tasks 7, 8, and 9 to complete</div>
                    <div className="font-mono mt-1">
                      Predecessor IDs: "7,8,9" | Type: "finish_to_start" | Lag: (empty)
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded border">
                    <div className="font-medium">Parallel Start with Delay:</div>
                    <div>Task 15 starts 3 days after Task 14 starts</div>
                    <div className="font-mono mt-1">
                      Predecessor IDs: "14" | Type: "start_to_start" | Lag: "3"
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Other Field Requirements:</h4>
            <ul className="space-y-1 text-sm">
              <li>• WBS ID must reference existing WBS items in the project</li>
              <li>• Date format: YYYY-MM-DD (e.g., 2025-01-07)</li>
              <li>• Duration is calculated automatically from dates</li>
              <li>• Estimated hours should be numeric (e.g., 40)</li>
              <li>
                • Priority options: low, medium, high
              </li>
              <li>
                • Status options: todo, in_progress, completed, on_hold
              </li>
              <li>• Is Milestone/Critical Path: TRUE or FALSE</li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Data Validation:</strong> The template includes
              built-in validation rules to help prevent common errors.
              Review any validation warnings before uploading.
              <br />
              <strong>Dependencies:</strong> Task dependencies will be created 
              automatically based on the predecessor task IDs you specify.
              Ensure all referenced task IDs exist in your project.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TemplateManagerBase
      downloadConfig={{
        url: `/api/projects/${projectId}/tasks/template/download`,
        fileName: `tasks_template_project_${projectId}_${new Date().toISOString().split("T")[0]}.xlsx`,
        successMessage: "Tasks template downloaded successfully",
        errorMessage: "Failed to download Tasks template",
      }}
      downloadCardTitle="Download Tasks Template"
      downloadCardDescription="Download an Excel template with all required fields and reference data to create tasks in bulk."
      renderDownloadCardContent={renderDownloadCardContent}
      uploadUrl={`/api/projects/${projectId}/tasks/template/upload`}
      fileInputId="tasks-file-upload"
      uploadCardTitle="Upload Tasks Data"
      uploadCardDescription="Upload your completed tasks template to create multiple tasks at once."
      uploadButtonText="Upload & Create Tasks"
      uploadButtonSize="lg"
      onUploadResponse={(data) => {
        if (data.created_tasks.length > 0) {
          toast.success(
            `Successfully created ${data.created_tasks.length} tasks`
          );
          onTasksCreated?.();
        }
        if (data.errors.length > 0) {
          toast.warning(
            `${data.errors.length} rows had errors. Check the results below.`
          );
        }
      }}
      renderUploadResult={renderUploadResult}
      helpTabContent={helpTabContent}
    />
  );
};

export default TaskTemplateManager;
