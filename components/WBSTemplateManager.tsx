import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import TemplateManagerBase, {
  DownloadButton,
  handleSecurityAwareUploadError,
} from "@/components/TemplateManagerBase";
import { Spinner } from "@/components/ui/spinner";

interface WBSTemplateManagerProps {
  projectId: number;
  onWBSCreated?: () => void | Promise<void>;
}

interface UploadResult {
  message: string;
  created_wbs_items: {
    wbs_id: number;
    wbs_code: string;
    name: string;
    level: number;
    parent_wbs_id: number | null;
    status: string;
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

const WBSUploadResultCard: React.FC<{
  result: UploadResult;
  title?: string;
}> = ({ result, title = "Upload Results" }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {result.created_wbs_items.length > 0 ? (
          <CheckCircle className="h-5 w-5 text-success" />
        ) : (
          <XCircle className="h-5 w-5 text-danger" />
        )}
        {title}
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
          <div className="p-3 bg-success-soft rounded-lg">
            <div className="text-2xl font-bold text-success">
              {result.summary.successful}
            </div>
            <div className="text-sm text-muted-foreground">
              Successful
            </div>
          </div>
          <div className="p-3 bg-danger-soft rounded-lg">
            <div className="text-2xl font-bold text-danger">
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

        {result.created_wbs_items.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Created WBS Items (
              {result.created_wbs_items.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {result.created_wbs_items.map((item) => (
                <div
                  key={item.wbs_id}
                  className="flex items-center justify-between p-2 bg-success-soft rounded border"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.wbs_code}</Badge>
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="secondary">
                      Level {item.level}
                    </Badge>
                  </div>
                  <Badge
                    variant={
                      item.status === "completed"
                        ? "default"
                        : item.status === "in_progress"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.errors.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2 text-danger">
              <AlertCircle className="h-4 w-4" />
              Errors ({result.errors.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {result.errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-danger-soft rounded border border-danger"
                >
                  <Badge variant="destructive" className="shrink-0">
                    Row {error.row}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium text-danger">
                      {error.field}
                    </div>
                    <div className="text-sm text-danger">
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

const WBSTemplateManager: React.FC<WBSTemplateManagerProps> = ({
  projectId,
  onWBSCreated,
}) => {
  const [isDownloadingP6, setIsDownloadingP6] = useState(false);
  const [isUploadingP6, setIsUploadingP6] = useState(false);
  const [uploadResultP6, setUploadResultP6] = useState<UploadResult | null>(null);
  const [selectedFileP6, setSelectedFileP6] = useState<File | null>(null);

  const handleDownloadP6Template = async () => {
    setIsDownloadingP6(true);
    try {
      const response = await axios.get(
        `/api/projects/${projectId}/wbs/template/download-p6`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `wbs_p6_template_project_${projectId}_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("P6 WBS template downloaded");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to download P6 template");
    } finally {
      setIsDownloadingP6(false);
    }
  };

  const handleFileSelectP6 = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        setSelectedFileP6(file);
        setUploadResultP6(null);
      } else {
        toast.error("Please select an Excel file (.xlsx or .xls)");
        event.target.value = "";
      }
    }
  };

  const handleUploadP6 = async () => {
    if (!selectedFileP6) {
      toast.error("Please select a file first");
      return;
    }
    setIsUploadingP6(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFileP6);
      const response = await axios.post(
        `/api/projects/${projectId}/wbs/template/upload-p6`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setUploadResultP6(response.data);
      if (response.data.created_wbs_items?.length > 0) {
        toast.success(
          `Successfully created ${response.data.created_wbs_items.length} WBS items from P6 file`
        );
        await onWBSCreated?.();
      }
      if (response.data.errors?.length > 0) {
        toast.warning(
          `${response.data.errors.length} row(s) had errors. Check the results below.`
        );
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.details ||
        "P6 WBS upload failed";
      toast.error(msg);
      if (error.response?.data?.errors?.length) {
        setUploadResultP6({
          message: msg,
          created_wbs_items: [],
          errors: error.response.data.errors.map(
            (e: { row?: number; field?: string; error?: string }) => ({
              row: e.row ?? 0,
              field: e.field ?? "",
              error: e.error ?? "",
            })
          ),
          summary: {
            total_processed: 0,
            successful: 0,
            failed: error.response.data.errors.length,
          },
        });
      }
    } finally {
      setIsUploadingP6(false);
    }
  };

  const p6TabContent = (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            P6 / MS Project WBS Upload
          </CardTitle>
          <CardDescription>
            Use an export from Primavera P6 or Microsoft Project. Level must be a hierarchy like 1, 1.1, 1.1.1; parent is inferred. WBS Name required; description and dates optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="wbs-p6-file-upload">Select Excel File</Label>
              <Input
                id="wbs-p6-file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelectP6}
                className="mt-1"
              />
            </div>
            {selectedFileP6 && (
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  Selected: <strong>{selectedFileP6.name}</strong>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadP6Template}
                disabled={isDownloadingP6}
                variant="outline"
              >
                {isDownloadingP6 ? (
                  <Spinner size={16} className="mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download P6 Template
              </Button>
              <Button
                onClick={handleUploadP6}
                disabled={!selectedFileP6 || isUploadingP6}
                size="lg"
              >
                {isUploadingP6 ? (
                  <>
                    <Spinner size={16} className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload P6 WBS
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {uploadResultP6 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResultP6.created_wbs_items.length > 0 ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-danger" />
              )}
              P6 Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{uploadResultP6.summary.total_processed}</div>
                  <div className="text-sm text-muted-foreground">Total Processed</div>
                </div>
                <div className="p-3 bg-success-soft rounded-lg">
                  <div className="text-2xl font-bold text-success">{uploadResultP6.summary.successful}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="p-3 bg-danger-soft rounded-lg">
                  <div className="text-2xl font-bold text-danger">{uploadResultP6.summary.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
              {uploadResultP6.created_wbs_items.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadResultP6.created_wbs_items.map((item) => (
                    <div key={item.wbs_id} className="flex items-center gap-2 p-2 bg-success-soft rounded border">
                      <Badge variant="outline">{item.wbs_code}</Badge>
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="secondary">Level {item.level}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {uploadResultP6.errors.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadResultP6.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-danger-soft rounded border border-danger">
                      <Badge variant="destructive">Row {error.row}</Badge>
                      <div className="flex-1">
                        <div className="font-medium text-danger">{error.field}</div>
                        <div className="text-sm text-danger">{error.error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );

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
            <li>• WBS data sheet with sample data</li>
            <li>• Existing WBS items reference sheet</li>
            <li>• Comprehensive instructions</li>
            <li>• Field validation rules</li>
            <li>• Status options reference</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-foreground mb-2">
            Template features:
          </h4>
          <ul className="space-y-1">
            <li>• Pre-configured field validation</li>
            <li>• Parent-child relationship support</li>
            <li>• Internal row references for new hierarchies</li>
            <li>• Budget allocation tracking</li>
            <li>• Status management</li>
            <li>• Hierarchical level control</li>
            <li>• Two-phase creation process</li>
          </ul>
        </div>
      </div>

      <Separator />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Note:</strong> Always download a fresh
          template before uploading. The template includes current WBS
          data for security validation. Using outdated templates will
          fail the security check.
        </AlertDescription>
      </Alert>

      <DownloadButton
        isDownloading={isDownloading}
        onDownload={onDownload}
        text="Download WBS Template"
        className="w-full"
        size="lg"
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The template includes live data from your current WBS items
          for parent selection. Download a fresh template if you've
          added new WBS items recently.
        </AlertDescription>
      </Alert>
    </>
  );

  const uploadPreButtonContent = (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <strong>Security Check:</strong> The system will validate
        that your Excel file contains the current WBS data. If
        validation fails, download a fresh template and transfer
        your new WBS items to it.
      </AlertDescription>
    </Alert>
  );

  const renderUploadResult = (result: UploadResult) => (
    <WBSUploadResultCard result={result} />
  );

  const helpTabContent = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Help & Instructions
        </CardTitle>
        <CardDescription>
          Step-by-step guide to using the WBS template
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">How to Use:</h4>
            <ol className="space-y-2 text-sm pl-4">
              <li>1. Download the WBS template from the Download tab</li>
              <li>
                2. Open the Excel file and review the instructions sheet
                first
              </li>
              <li>3. Fill in the "WBS Items" sheet with your data</li>
              <li>
                4. Use the "Existing WBS" sheet to find Parent WBS IDs for
                existing items
              </li>
              <li>
                5. Use "Parent Row Reference" to create hierarchies within
                the same upload
              </li>
              <li>
                6. Ensure every WBS item has a parent (no root WBS
                allowed)
              </li>
              <li>7. Remove all sample data rows before uploading</li>
              <li>8. Save the file and upload it using the Upload tab</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">
              🚨 Important Restrictions:
            </h4>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-danger-soft rounded-lg border border-danger">
                <strong className="text-danger">
                  No Root WBS Creation
                </strong>
                <p className="text-danger mt-1">
                  You cannot create root level (Level 0) WBS items through
                  bulk upload. Every WBS item must have a parent assigned.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">
              Parent Assignment Methods:
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Method 1: Parent WBS ID</strong>
                <p className="text-muted-foreground">
                  Use this to reference existing WBS items in your
                  project. Find the ID in the "Existing WBS Items"
                  reference sheet.
                </p>
              </div>
              <div>
                <strong>Method 2: Parent Row Reference</strong>
                <p className="text-muted-foreground">
                  Use this to reference another row in the same Excel
                  upload. Enter the row number (e.g., "2" for row 2). The
                  parent row must come before the child row.
                </p>
              </div>
              <div className="p-3 bg-info-soft rounded-lg">
                <strong>Example:</strong>
                <ul className="mt-1 space-y-1">
                  <li>
                    Row 2: "Requirements" (Level 2, Parent WBS ID: 1)
                  </li>
                  <li>Row 3: "Design" (Level 2, Parent WBS ID: 1)</li>
                  <li>
                    Row 4: "UI Design" (Level 3, Parent Row Reference: 3)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Field Requirements:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <Badge variant="destructive">Required</Badge>
                <span>
                  WBS Name, Description, Level, Start Date, End Date,
                  Budget Amount, Parent Assignment
                </span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Optional</Badge>
                <span>Status</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">
              🔒 Security & Data Integrity:
            </h4>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-info-soft rounded-lg border border-info">
                <strong className="text-info">
                  Template Validation
                </strong>
                <p className="text-info mt-1">
                  The system validates that the "Existing WBS" sheet in
                  your Excel file matches the current database state. This
                  ensures data integrity and prevents conflicts.
                </p>
              </div>
              <div className="p-3 bg-warning-soft rounded-lg border border-warning">
                <strong className="text-warning">
                  Always Use Fresh Templates
                </strong>
                <p className="text-warning mt-1">
                  Always download a fresh template before uploading. Using
                  outdated templates will fail security validation. Do not
                  modify the "Existing WBS" sheet manually.
                </p>
              </div>
              <div>
                <strong>
                  If Upload Fails Due to Security Validation:
                </strong>
                <ol className="mt-1 list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Download a fresh WBS template</li>
                  <li>Copy your new WBS items to the fresh template</li>
                  <li>
                    Verify the "Existing WBS" sheet shows current data
                  </li>
                  <li>Upload the updated file</li>
                </ol>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Important Notes:</h4>
            <ul className="space-y-1 text-sm">
              <li>
                • Every WBS item MUST have a parent (use either Parent WBS
                ID OR Parent Row Reference)
              </li>
              <li>
                • Cannot use both Parent WBS ID and Parent Row Reference
                together
              </li>
              <li>
                • Parent Row Reference must point to a row that comes
                before it
              </li>
              <li>
                • Level must be exactly parent level + 1 (minimum level is
                1)
              </li>
              <li>• Date format: YYYY-MM-DD (e.g., 2025-01-01)</li>
              <li>• Budget amounts should be in OMR</li>
              <li>
                • Status options: not_started, in_progress, completed,
                on_hold, delayed
              </li>
              <li>
                • Row references include the header row (start from 2)
              </li>
              <li>• No root level (Level 0) WBS items allowed</li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Data Validation:</strong> The template includes
              built-in validation rules to help prevent common errors.
              Review any validation warnings before uploading.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TemplateManagerBase
      downloadConfig={{
        url: `/api/projects/${projectId}/wbs/template/download`,
        fileName: `wbs_template_project_${projectId}_${new Date().toISOString().split("T")[0]}.xlsx`,
        successMessage: "WBS template downloaded successfully",
        errorMessage: "Failed to download WBS template",
      }}
      downloadCardTitle="Download WBS Template"
      downloadCardDescription="Download an Excel template with all required fields and reference data to create WBS items in bulk."
      renderDownloadCardContent={renderDownloadCardContent}
      uploadUrl={`/api/projects/${projectId}/wbs/template/upload`}
      fileInputId="wbs-file-upload"
      uploadCardTitle="Upload WBS Data"
      uploadCardDescription="Upload your completed WBS template to create multiple WBS items at once."
      uploadButtonText="Upload & Create WBS Items"
      uploadButtonSize="lg"
      uploadPreButtonContent={uploadPreButtonContent}
      onUploadResponse={async (data) => {
        if (data.created_wbs_items.length > 0) {
          toast.success(
            `Successfully created ${data.created_wbs_items.length} WBS items`
          );
          await onWBSCreated?.();
        }
        if (data.errors.length > 0) {
          toast.warning(
            `${data.errors.length} rows had errors. Check the results below.`
          );
        }
      }}
      onUploadError={(error) =>
        handleSecurityAwareUploadError(error, "WBS")
      }
      renderUploadResult={renderUploadResult}
      helpTabContent={helpTabContent}
      extraTabs={[
        {
          id: "p6",
          label: "P6 / MS Project",
          content: p6TabContent,
        },
      ]}
    />
  );
};

export default WBSTemplateManager;
