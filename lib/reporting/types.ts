export type ReportFormat = 'pdf' | 'excel' | 'powerpoint' | 'csv' | 'dashboard';
export type ReportCategory = 'financial' | 'project' | 'resource' | 'risk' | 'schedule' | 'executive' | 'operational' | 'compliance' | 'document' | 'task';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  format: ReportFormat;
  dataSource: string[];
  version: string;
  createdBy: string;
  createdAt: Date;
  lastGenerated?: Date;
  nextScheduled?: Date;
  sharedWith?: string[];
  downloadCount?: number;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  name: string;
  generatedAt: Date;
  generatedBy: string;
  format: ReportFormat;
  fileUrl?: string; // Link to stored file if server-side
} 