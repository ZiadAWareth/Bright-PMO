import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import TemplateManagerBase, {
  DownloadButton,
  handleSecurityAwareUploadError,
} from "@/components/TemplateManagerBase";

interface BudgetTemplateManagerProps {
  projectId: number;
  onBudgetUpdated?: () => void;
}

interface BudgetUploadResult {
  message: string;
  updated_budgets: {
    budget_id: number;
    wbs_id?: number;
    task_id?: number;
    wbs_name?: string;
    task_name?: string;
    old_planned_amount: number;
    new_planned_amount: number;
    variance: number;
    status: string;
  }[];
  created_budgets: {
    budget_id: number;
    wbs_id?: number;
    task_id?: number;
    wbs_name?: string;
    task_name?: string;
    planned_amount: number;
    variance: number;
    status: string;
  }[];
  errors: {
    row: number;
    field: string;
    error: string;
    item_name?: string;
  }[];
  warnings: {
    row: number;
    message: string;
    item_name?: string;
  }[];
  summary: {
    total_processed: number;
    successful: number;
    failed: number;
    warnings: number;
    total_budget_change: number;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const BudgetTemplateManager: React.FC<BudgetTemplateManagerProps> = ({
  projectId,
  onBudgetUpdated,
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
            <li>• Budget data sheet with current planned amounts</li>
            <li>• WBS items (Level 1 and below) reference</li>
            <li>• All project tasks</li>
            <li>• Current budget allocations</li>
            <li>• Comprehensive instructions</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-foreground mb-2">
            Template features:
          </h4>
          <ul className="space-y-1">
            <li>• Pre-filled with current budget data</li>
            <li>• Editable planned amount column</li>
            <li>• Automatic variance calculation</li>
            <li>• Budget validation rules</li>
            <li>• Root WBS protection (read-only)</li>
            <li>• Cost type tracking</li>
          </ul>
        </div>
      </div>

      <Separator />

      <DownloadButton
        isDownloading={isDownloading}
        onDownload={onDownload}
        text="Download Budget Template"
        className="w-full"
        size="lg"
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The template includes live data from your current budget
          allocations. Root WBS (Level 0) planned amounts are
          protected and cannot be modified through bulk upload.
          Download a fresh template if you've made budget changes
          recently.
        </AlertDescription>
      </Alert>
    </>
  );

  const renderUploadResult = (result: BudgetUploadResult) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result.updated_budgets.length > 0 ||
          result.created_budgets.length > 0 ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          Upload Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(
                  result.summary.total_budget_change
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Budget Change
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

          {result.updated_budgets.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Updated Budget Items (
                {result.updated_budgets.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {result.updated_budgets.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-green-50 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        {item.wbs_name || item.task_name}
                      </span>
                      <Badge variant="secondary">
                        {item.wbs_id ? "WBS" : "Task"}
                      </Badge>
                    </div>
                    <div className="text-right text-sm">
                      <div>
                        {formatCurrency(item.old_planned_amount)} →{" "}
                        {formatCurrency(item.new_planned_amount)}
                      </div>
                      <div className="text-muted-foreground">
                        Variance: {formatCurrency(item.variance)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.created_budgets.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                Created Budget Items (
                {result.created_budgets.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {result.created_budgets.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-blue-50 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">
                        {item.wbs_name || item.task_name}
                      </span>
                      <Badge variant="secondary">
                        {item.wbs_id ? "WBS" : "Task"}
                      </Badge>
                    </div>
                    <div className="text-right text-sm">
                      <div>{formatCurrency(item.planned_amount)}</div>
                      <div className="text-muted-foreground">
                        Variance: {formatCurrency(item.variance)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                Warnings ({result.warnings.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {result.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200"
                  >
                    <Badge variant="outline" className="shrink-0">
                      Row {warning.row}
                    </Badge>
                    <div className="flex-1">
                      {warning.item_name && (
                        <div className="font-medium text-yellow-700">
                          {warning.item_name}
                        </div>
                      )}
                      <div className="text-sm text-yellow-600">
                        {warning.message}
                      </div>
                    </div>
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
                      {error.item_name && (
                        <div className="text-sm font-medium text-red-600">
                          {error.item_name}
                        </div>
                      )}
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
          How to Use Budget Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Step-by-Step Process:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Download the budget template from the "Download Template"
                tab
              </li>
              <li>
                Open the Excel file and navigate to the "Budget_Data"
                sheet
              </li>
              <li>
                Review current planned amounts in the
                "Current_Planned_Amount" column
              </li>
              <li>
                Enter new planned amounts in the "New_Planned_Amount"
                column
              </li>
              <li>Save the Excel file</li>
              <li>Upload the file using the "Upload Data" tab</li>
              <li>
                Review the results and check for any errors or warnings
              </li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Important Notes:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                Root WBS (Level 0) budgets cannot be edited through the
                template
              </li>
              <li>
                The "New_Planned_Amount" column is the only editable field
              </li>
              <li>Empty cells in "New_Planned_Amount" will be ignored</li>
              <li>Budget amounts must be positive numbers</li>
              <li>
                The system will automatically calculate variance
                (new_planned - actual)
              </li>
              <li>
                Changes take effect immediately upon successful upload
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Template Structure:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium">Budget_Data Sheet:</h5>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Item_Type (WBS/Task)</li>
                  <li>Item_ID (Internal reference)</li>
                  <li>Item_Name (WBS or Task name)</li>
                  <li>WBS_Code (If applicable)</li>
                  <li>Level (WBS hierarchy level)</li>
                  <li>Current_Planned_Amount</li>
                  <li>Current_Actual_Amount</li>
                  <li>Current_Variance</li>
                  <li>
                    <strong>New_Planned_Amount (Editable)</strong>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium">Instructions Sheet:</h5>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Detailed field explanations</li>
                  <li>Validation rules</li>
                  <li>Common error solutions</li>
                  <li>Best practices</li>
                  <li>Example data</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TemplateManagerBase
      downloadConfig={{
        url: `/api/projects/${projectId}/budget/template/download`,
        fileName: `budget_template_project_${projectId}_${new Date().toISOString().split("T")[0]}.xlsx`,
        successMessage: "Budget template downloaded successfully",
        errorMessage: "Failed to download budget template",
      }}
      downloadCardTitle="Download Budget Template"
      downloadCardDescription="Download an Excel template with all WBS items and tasks to update budgets in bulk. Note: Root WBS budget amounts cannot be edited through the template."
      renderDownloadCardContent={renderDownloadCardContent}
      uploadUrl={`/api/projects/${projectId}/budget/template/upload`}
      fileInputId="budget-file-upload"
      uploadCardTitle="Upload Budget Data"
      uploadCardDescription="Upload your completed budget template to update multiple budget items at once. Root WBS budgets will be ignored during upload."
      uploadButtonText="Upload & Update Budgets"
      uploadButtonSize="lg"
      onUploadResponse={(data) => {
        const totalChanges =
          data.updated_budgets.length + data.created_budgets.length;

        if (totalChanges > 0) {
          toast.success(`Successfully processed ${totalChanges} budget items`);
          onBudgetUpdated?.();
        }

        if (data.errors.length > 0) {
          toast.warning(
            `${data.errors.length} rows had errors. Check the results below.`
          );
        }

        if (data.warnings.length > 0) {
          toast.warning(
            `${data.warnings.length} rows had warnings. Check the results below.`
          );
        }
      }}
      onUploadError={(error) =>
        handleSecurityAwareUploadError(error, "budget")
      }
      renderUploadResult={renderUploadResult}
      helpTabContent={helpTabContent}
    />
  );
};

export default BudgetTemplateManager;
