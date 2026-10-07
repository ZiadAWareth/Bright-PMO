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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Upload,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Spinner } from "@/components/ui/spinner";

export interface DownloadConfig {
  url: string;
  fileName: string;
  successMessage: string;
  errorMessage: string;
}

export interface ExtraTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TemplateManagerBaseProps {
  downloadConfig: DownloadConfig;
  customDownloadHandler?: () => Promise<void>;

  downloadCardTitle: string;
  downloadCardDescription: string;
  renderDownloadCardContent: (props: {
    isDownloading: boolean;
    onDownload: () => Promise<void>;
  }) => React.ReactNode;

  uploadUrl: string;
  fileInputId: string;
  acceptedFileTypes?: string;
  onUploadResponse: (data: any) => void | Promise<void>;
  onUploadError?: (error: any) => void;

  uploadCardTitle: string;
  uploadCardDescription: string;
  uploadButtonText: string;
  uploadButtonSize?: "default" | "sm" | "lg";
  fileInputLabel?: string;
  fileInputWrapperClassName?: string;
  fileInputClassName?: string;
  disableInputWhileUploading?: boolean;
  fileSizeFormatter?: (bytes: number) => string;
  showResetAlways?: boolean;
  uploadPreButtonContent?: React.ReactNode;
  renderUploadResult: (result: any) => React.ReactNode;

  helpTabContent: React.ReactNode;

  extraTabs?: ExtraTab[];
}

const defaultFileSizeFormatter = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export const DownloadButton: React.FC<{
  isDownloading: boolean;
  onDownload: () => Promise<void>;
  text: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}> = ({ isDownloading, onDownload, text, className, size }) => (
  <Button
    onClick={onDownload}
    disabled={isDownloading}
    className={className}
    size={size}
  >
    {isDownloading ? (
      <>
        <Spinner size={16} className="mr-2" />
        Generating Template...
      </>
    ) : (
      <>
        <Download className="w-4 h-4 mr-2" />
        {text}
      </>
    )}
  </Button>
);

export function handleSecurityAwareUploadError(
  error: any,
  entityName: string
) {
  const errorData = error.response?.data;
  let errorMessage = `Failed to upload ${entityName} file`;

  if (errorData) {
    if (errorData.errorType === "SECURITY_VALIDATION_ERROR") {
      toast.error("Security Validation Failed", {
        description:
          errorData.details ||
          `The existing ${entityName} data in your Excel file doesn't match the current database state.`,
        duration: 10000,
      });

      if (
        errorData.validationErrors &&
        errorData.validationErrors.length > 0
      ) {
        const errorCount = errorData.validationErrors.length;
        const errorSummary = errorData.validationErrors
          .slice(0, 3)
          .map((err: any) => `• Row ${err.row || "N/A"}: ${err.error}`)
          .join("\n");

        const truncatedMessage =
          errorCount > 3
            ? `${errorSummary}\n... and ${errorCount - 3} more error(s)`
            : errorSummary;

        toast.error(`Validation Errors (${errorCount} found)`, {
          description: truncatedMessage,
          duration: 15000,
        });
      }

      if (errorData.recommendation) {
        toast.info("Recommendation", {
          description: errorData.recommendation,
          duration: 8000,
        });
      }

      return;
    }

    if (errorData.message && errorData.message.includes("\n\n")) {
      const [mainMessage, ...additionalInfo] =
        errorData.message.split("\n\n");
      errorMessage = mainMessage;

      if (additionalInfo.length > 0 && additionalInfo[0].trim()) {
        toast.info("Additional Information", {
          description: additionalInfo.join("\n\n"),
          duration: 8000,
        });
      }

      toast.error(mainMessage);
    } else if (errorData.details) {
      errorMessage = `${errorData.error}: ${errorData.details}`;
      toast.error(errorMessage);
    } else if (errorData.error) {
      errorMessage = errorData.error;
      toast.error(errorMessage);
    } else {
      toast.error(errorMessage);
    }

    if (errorData.errors && Array.isArray(errorData.errors)) {
      const errorCount = errorData.errors.length;
      const errorSummary = errorData.errors
        .slice(0, 3)
        .map(
          (err: any, index: number) =>
            `• Error ${index + 1}: ${err.message || err}`
        )
        .join("\n");

      const truncatedMessage =
        errorCount > 3
          ? `${errorSummary}\n... and ${errorCount - 3} more error(s)`
          : errorSummary;

      toast.error(`Validation Errors (${errorCount} found)`, {
        description: truncatedMessage,
        duration: 12000,
      });
    }
  } else {
    toast.error(errorMessage);
  }
}

const TemplateManagerBase: React.FC<TemplateManagerBaseProps> = ({
  downloadConfig,
  customDownloadHandler,
  downloadCardTitle,
  downloadCardDescription,
  renderDownloadCardContent,
  uploadUrl,
  fileInputId,
  acceptedFileTypes = ".xlsx,.xls",
  onUploadResponse,
  onUploadError,
  uploadCardTitle,
  uploadCardDescription,
  uploadButtonText,
  uploadButtonSize,
  fileInputLabel = "Select Excel File",
  fileInputWrapperClassName,
  fileInputClassName = "mt-1",
  disableInputWhileUploading = false,
  fileSizeFormatter = defaultFileSizeFormatter,
  showResetAlways = true,
  uploadPreButtonContent,
  renderUploadResult,
  helpTabContent,
  extraTabs = [],
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (customDownloadHandler) {
        await customDownloadHandler();
      } else {
        const response = await axios.get(downloadConfig.url, {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", downloadConfig.fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast.success(downloadConfig.successMessage);
      }
    } catch (error: any) {
      if (!customDownloadHandler) {
        const errorMessage =
          error?.response?.data?.error || downloadConfig.errorMessage;
        toast.error(errorMessage);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        setSelectedFile(file);
        setUploadResult(null);
      } else {
        toast.error("Please select a valid Excel file (.xlsx or .xls)");
        event.target.value = "";
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post(uploadUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setUploadResult(response.data);
      await onUploadResponse(response.data);
    } catch (error: any) {
      if (onUploadError) {
        onUploadError(error);
      } else {
        toast.error(
          error?.response?.data?.error || "Failed to upload file"
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    const fileInput = document.getElementById(
      fileInputId
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="download" className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="download">Download Template</TabsTrigger>
          <TabsTrigger value="upload">Upload Data</TabsTrigger>
          {extraTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="help">Help & Info</TabsTrigger>
        </TabsList>

        <TabsContent value="download" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                {downloadCardTitle}
              </CardTitle>
              <CardDescription>
                {downloadCardDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {renderDownloadCardContent({
                  isDownloading,
                  onDownload: handleDownload,
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {uploadCardTitle}
              </CardTitle>
              <CardDescription>
                {uploadCardDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={fileInputWrapperClassName}>
                  <Label htmlFor={fileInputId}>{fileInputLabel}</Label>
                  <Input
                    id={fileInputId}
                    type="file"
                    accept={acceptedFileTypes}
                    onChange={handleFileSelect}
                    className={fileInputClassName || undefined}
                    disabled={
                      disableInputWhileUploading ? isUploading : undefined
                    }
                  />
                </div>

                {selectedFile && (
                  <Alert>
                    <FileSpreadsheet className="h-4 w-4" />
                    <AlertDescription>
                      Selected file: <strong>{selectedFile.name}</strong> (
                      {fileSizeFormatter(selectedFile.size)})
                    </AlertDescription>
                  </Alert>
                )}

                {uploadPreButtonContent}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="flex-1"
                    size={uploadButtonSize}
                  >
                    {isUploading ? (
                      <>
                        <Spinner size={16} className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadButtonText}
                      </>
                    )}
                  </Button>
                  {(showResetAlways || selectedFile) && (
                    <Button
                      onClick={resetUpload}
                      variant="outline"
                      disabled={isUploading}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {uploadResult && renderUploadResult(uploadResult)}
        </TabsContent>

        {extraTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4">
            {tab.content}
          </TabsContent>
        ))}

        <TabsContent value="help" className="space-y-4">
          {helpTabContent}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TemplateManagerBase;
