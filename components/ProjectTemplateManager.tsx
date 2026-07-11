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
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { projectTemplateConfig } from "@/lib/template-utils";
import TemplateManagerBase, { DownloadButton } from "@/components/TemplateManagerBase";

interface ProjectTemplateManagerProps {
  onProjectsCreated?: () => void;
}

interface UploadResult {
  message: string;
  created_projects: {
    project_id: number;
    project_code: string;
    name: string;
    row: number;
  }[];
  errors: {
    row: number;
    error: string;
  }[];
  summary: {
    total_rows: number;
    created: number;
    errors: number;
  };
}

const ProjectTemplateManager: React.FC<ProjectTemplateManagerProps> = ({
  onProjectsCreated,
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
            <li>• Project data sheet with sample data</li>
            <li>• Portfolio reference sheet</li>
            <li>• EPS levels reference sheet</li>
            <li>• Project managers reference sheet</li>
            <li>• Comprehensive instructions</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-foreground mb-2">
            Template features:
          </h4>
          <ul className="space-y-1">
            <li>
              •{" "}
              {
                projectTemplateConfig.fields.filter((f) => f.required)
                  .length
              }{" "}
              required fields
            </li>
            <li>
              •{" "}
              {
                projectTemplateConfig.fields.filter(
                  (f) => !f.required
                ).length
              }{" "}
              optional fields
            </li>
            <li>• Field validation and examples</li>
            <li>• Reference data for dropdowns</li>
            <li>• Step-by-step instructions</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-2">
        <DownloadButton
          isDownloading={isDownloading}
          onDownload={onDownload}
          text="Download Excel Template"
          className="flex-1"
        />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The template includes live reference data from your system
          (portfolios, EPS levels, etc.) and sample data to help you
          get started. Remove the sample row before uploading your
          data.
        </AlertDescription>
      </Alert>
    </>
  );

  const renderUploadResult = (result: UploadResult) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Upload Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {result.summary.created}
              </div>
              <div className="text-sm text-green-600">
                Projects Created
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {result.summary.errors}
              </div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {result.summary.total_rows}
              </div>
              <div className="text-sm text-blue-600">Total Rows</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span>
                {result.summary.total_rows > 0
                  ? Math.round(
                      (result.summary.created /
                        result.summary.total_rows) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
            <Progress
              value={
                result.summary.total_rows > 0
                  ? (result.summary.created /
                      result.summary.total_rows) *
                    100
                  : 0
              }
            />
          </div>

          <Separator />

          {result.created_projects.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Successfully Created Projects
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {result.created_projects.map((project) => (
                  <div
                    key={project.project_id}
                    className="flex items-center justify-between p-2 bg-green-50 rounded"
                  >
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.project_code}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      Row {project.row}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-red-600 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Errors ({result.errors.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {result.errors.map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 bg-red-50 rounded"
                  >
                    <Badge variant="destructive" className="mt-0.5">
                      Row {error.row}
                    </Badge>
                    <div className="text-sm text-red-600">
                      {error.error}
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
          Template System Help
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Required Fields</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {projectTemplateConfig.fields
                .filter((f) => f.required)
                .map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center space-x-2"
                  >
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                    <span className="text-sm">{field.label}</span>
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Field Types & Validation</h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>text:</strong> Any text value
              </div>
              <div>
                <strong>number:</strong> Numeric values only
              </div>
              <div>
                <strong>date:</strong> Date in YYYY-MM-DD format
              </div>
              <div>
                <strong>select:</strong> Must be one of the predefined
                options
              </div>
              <div>
                <strong>boolean:</strong> true/false, 1/0, yes/no
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Best Practices</h4>
            <ul className="space-y-1 text-sm list-disc list-inside">
              <li>
                Download the live template for up-to-date reference data
              </li>
              <li>Use the reference sheets to find valid IDs</li>
              <li>Remove sample data before uploading</li>
              <li>Validate your data before uploading</li>
              <li>Process large files in batches if needed</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TemplateManagerBase
      downloadConfig={{
        url: "/api/projects/template/download",
        fileName: `project_template_${new Date().toISOString().split("T")[0]}.xlsx`,
        successMessage: "Template downloaded successfully",
        errorMessage: "Failed to download template",
      }}
      downloadCardTitle="Download Project Template"
      downloadCardDescription="Download an Excel template with all the required fields and reference data to create projects in bulk."
      renderDownloadCardContent={renderDownloadCardContent}
      uploadUrl="/api/projects/template/upload"
      fileInputId="file-upload"
      uploadCardTitle="Upload Project Data"
      uploadCardDescription="Upload your completed Excel file to create multiple projects at once."
      uploadButtonText="Upload & Create Projects"
      fileInputWrapperClassName="space-y-2"
      fileInputClassName=""
      disableInputWhileUploading
      fileSizeFormatter={(bytes) => `${(bytes / 1024).toFixed(1)} KB`}
      showResetAlways={false}
      onUploadResponse={(data) => {
        if (data.created_projects.length > 0) {
          toast.success(
            `Successfully created ${data.created_projects.length} projects`
          );
          onProjectsCreated?.();
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

export default ProjectTemplateManager;
