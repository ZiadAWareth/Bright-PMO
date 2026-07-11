'use client';

import React, { useState } from 'react';
import { ReportTemplate, ReportFormat } from '@/lib/reporting/types';
import { 
  fetchProjectsDirect, 
  fetchBudgetsDirect, 
  fetchResourcesDirect, 
  fetchRisksDirect, 
  fetchTasksDirect, 
  fetchPortfoliosDirect, 
  fetchDocumentsDirect,
  fetchEquipmentSiteLogsDirect,
  fetchTransactionsDirect,
  getProjectSummary, 
  getResourceUtilization, 
  getFinancialSummary, 
  getRiskAnalysis 
} from '@/lib/reporting/dataService';
import { generatePdf } from '@/lib/reporting/pdfGenerator';
import { generateExcel, generateCsv } from '@/lib/reporting/excelGenerator';
import { FileText, Download, FileSpreadsheet, FileImage, FileBarChart, FilePieChart, Eye, Save, Share2, Calendar, Users, DollarSign, TrendingUp, BarChart3, PieChart, AlertTriangle, Clock, Target, Award, Building, Briefcase, Code, Shield, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedReport {
id: string;
template: ReportTemplate;
data: any;
generatedAt: Date;
generatedBy: string;
status: 'generated' | 'exporting';
}

interface ReportGeneratorProps {
isOpen: boolean;
onClose: () => void;
templates: ReportTemplate[];
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ isOpen, onClose, templates }) => {
const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
const [isExporting, setIsExporting] = useState(false);
const [showSummary, setShowSummary] = useState(false);

if (!isOpen) return null;

const formatOptions: { value: ReportFormat; label: string; icon: any; description: string; color: string }[] = [
{ value: 'pdf', label: 'PDF Report', icon: FileText, description: 'Professional document format', color: 'bg-red-500 hover:bg-red-600' },
{ value: 'excel', label: 'Excel Spreadsheet', icon: FileSpreadsheet, description: 'Data analysis and calculations', color: 'bg-green-500 hover:bg-green-600' },
{ value: 'powerpoint', label: 'PowerPoint Presentation', icon: FileImage, description: 'Presentation format', color: 'bg-orange-500 hover:bg-orange-600' }
];

const handleGenerateReport = async (template: ReportTemplate) => {
setIsGenerating(true);
try {
console.log('Generating report for template:', template);
console.log('Data sources:', template.dataSource);

// Fetch data based on template category using direct API calls
let reportData: any = {};

switch (template.category) {
  case 'project':
    console.log('Fetching project data directly...');
    const projectData = await fetchProjectsDirect();
    console.log('Project data received:', projectData);
    reportData = {
      projects: projectData,
      summary: {
        totalProjects: Array.isArray(projectData) ? projectData.length : 0,
        activeProjects: Array.isArray(projectData) ? projectData.filter((p: any) => p.status === 'active' || p.status === 'execution').length : 0,
        completedProjects: Array.isArray(projectData) ? projectData.filter((p: any) => p.status === 'completed').length : 0
      }
    };
    break;
    
  case 'resource':
    console.log('Fetching resource data directly...');
    const resourceData = await fetchResourcesDirect();
    console.log('Resource data received:', resourceData);
    console.log('Resource data type:', typeof resourceData);
    console.log('Resource data length:', Array.isArray(resourceData) ? resourceData.length : 'Not an array');
    console.log('Resource data keys:', resourceData && typeof resourceData === 'object' ? Object.keys(resourceData) : 'Not an object');
    
    const totalResources = Array.isArray(resourceData) ? resourceData.length : 0;
    const availableResources = Array.isArray(resourceData) ? resourceData.filter((r: any) => !r.assignments || r.assignments.length === 0).length : 0;
    const allocatedResources = Array.isArray(resourceData) ? resourceData.filter((r: any) => r.assignments && r.assignments.length > 0).length : 0;
    
    console.log('Calculated summary:', { totalResources, availableResources, allocatedResources });
    
    reportData = {
      resources: resourceData,
      summary: {
        totalResources,
        availableResources,
        allocatedResources
      }
    };
    break;
    
  case 'financial':
    console.log('Fetching financial data directly...');
    const budgetData = await fetchBudgetsDirect();
    const transactionData = await fetchTransactionsDirect();
    console.log('Budget data received:', budgetData);
    console.log('Transaction data received:', transactionData);
    
    const totalPlanned = budgetData.reduce((sum: number, budget: any) => sum + (budget.planned_amount || 0), 0);
    const totalActual = budgetData.reduce((sum: number, budget: any) => sum + (budget.actual_amount || 0), 0);
    const totalTransactions = transactionData.reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0);
    const totalSpent = totalActual + totalTransactions;
    
    reportData = {
      budgets: budgetData,
      transactions: transactionData,
      summary: {
        totalPlanned,
        totalActual,
        totalTransactions,
        totalSpent,
        totalVariance: totalPlanned - totalSpent,
        totalBudgets: budgetData.length
      }
    };
    break;
    
  case 'risk':
    console.log('Fetching risk data directly...');
    const riskData = await fetchRisksDirect();
    console.log('Risk data received:', riskData);
    reportData = {
      risks: riskData,
      summary: {
        totalRisks: Array.isArray(riskData) ? riskData.length : 0,
        highRisks: Array.isArray(riskData) ? riskData.filter((r: any) => r.impact === 'high').length : 0,
        mitigatedRisks: Array.isArray(riskData) ? riskData.filter((r: any) => r.status === 'mitigated').length : 0
      }
    };
    break;
    
  case 'task':
    console.log('Fetching task data directly...');
    const taskDataOnly = await fetchTasksDirect();
    console.log('Task data received:', taskDataOnly);
    reportData = {
      tasks: taskDataOnly,
      summary: {
        totalTasks: Array.isArray(taskDataOnly) ? taskDataOnly.length : 0,
        completedTasks: Array.isArray(taskDataOnly) ? taskDataOnly.filter((t: any) => t.status === 'completed').length : 0,
        inProgressTasks: Array.isArray(taskDataOnly) ? taskDataOnly.filter((t: any) => t.status === 'in_progress' || t.status === 'active').length : 0,
        pendingTasks: Array.isArray(taskDataOnly) ? taskDataOnly.filter((t: any) => t.status === 'on_hold' ).length : 0
      }
    };
    break;
    
  case 'document':
    console.log('Fetching document data directly...');
    const documentData = await fetchDocumentsDirect();
    console.log('Document data received:', documentData);
    reportData = {
      documents: documentData,
      summary: {
        totalDocuments: Array.isArray(documentData) ? documentData.length : 0
      }
    };
    break;
    
  case 'operational':
    console.log('Fetching operational data directly...');
    const equipmentSiteLogsData = await fetchEquipmentSiteLogsDirect();
    console.log('Equipment site logs data received:', equipmentSiteLogsData);
    reportData = {
      'equipment-site-logs': equipmentSiteLogsData,
      summary: {
        totalEquipmentLogs: Array.isArray(equipmentSiteLogsData) ? equipmentSiteLogsData.length : 0,
        activeEquipment: Array.isArray(equipmentSiteLogsData) ? equipmentSiteLogsData.filter((log: any) => !log.logged_out_date).length : 0,
        completedAssignments: Array.isArray(equipmentSiteLogsData) ? equipmentSiteLogsData.filter((log: any) => log.logged_out_date).length : 0
      }
    };
    break;
    
  default:
    console.log('Fetching general data using direct APIs...');
    // For general templates, fetch all requested data sources directly
    const dataPromises = template.dataSource.map(async (source) => {
      switch (source.toLowerCase()) {
        case 'projects':
          return { key: 'projects', data: await fetchProjectsDirect() };
        case 'budgets':
          return { key: 'budgets', data: await fetchBudgetsDirect() };
        case 'resources':
          return { key: 'resources', data: await fetchResourcesDirect() };
        case 'risks':
          return { key: 'risks', data: await fetchRisksDirect() };
        case 'tasks':
          return { key: 'tasks', data: await fetchTasksDirect() };
        case 'portfolios':
          return { key: 'portfolios', data: await fetchPortfoliosDirect() };
        case 'documents':
          return { key: 'documents', data: await fetchDocumentsDirect() };
        case 'equipment-site-logs':
          return { key: 'equipment-site-logs', data: await fetchEquipmentSiteLogsDirect() };
        case 'transactions':
          return { key: 'transactions', data: await fetchTransactionsDirect() };
       
        default:
          return { key: source, data: [] };
      }
    });
    
    const results = await Promise.all(dataPromises);
    results.forEach(({ key, data }) => {
      reportData[key] = data;
    });
    break;
}

// Check if we have valid data
if (!reportData || (Array.isArray(reportData) && reportData.length === 0) || (typeof reportData === 'object' && Object.keys(reportData).length === 0)) {
  console.log('No data available for report generation');
  toast.error('No data available for this report. Please ensure there is data in the system.');
  return;
}

console.log('Final report data:', reportData);

const newReport: GeneratedReport = {
  id: `report-${Date.now()}`,
  template,
  data: reportData,
  generatedAt: new Date(),
  generatedBy: 'Current User',
  status: 'generated'
};

setGeneratedReport(newReport);
toast.success('Report generated successfully!');
} catch (error) {
console.error('Error generating report:', error);
toast.error('Failed to generate report.');
} finally {
setIsGenerating(false);
}
};

const handleExportReport = async (format: ReportFormat) => {
if (!generatedReport) return;

setIsExporting(true);
try {
  switch (format) {
    case 'pdf':
      generatePdf(generatedReport.template, generatedReport.data);
      break;
    case 'excel':
      generateExcel(generatedReport.template, generatedReport.data);
      break;
    case 'powerpoint': {
      const response = await fetch('/api/reports/pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: generatedReport.template, data: generatedReport.data })
      });
      if (!response.ok) throw new Error('Failed to generate PPTX');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedReport.template.name.replace(/\s+/g, '_')}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      break;
    }
    default:
      toast.error(`Unsupported export format: ${format}`);
      return;
  }
  toast.success(`${format.toUpperCase()} export completed!`);
} catch (error) {
  console.error('Error exporting report:', error);
  toast.error('Failed to export report.');
} finally {
  setIsExporting(false);
}
};

const getCategoryIcon = (category: string) => {
const icons = {
financial: DollarSign,
project: Briefcase,
resource: Users,
risk: AlertTriangle,
schedule: Clock,
executive: Globe,
operational: Target,
compliance: Shield,
task: Calendar
};
return icons[category as keyof typeof icons] || FileText;
};

const getCategoryColor = (category: string) => {
const colors = {
financial: 'bg-green-100 text-green-800 border-green-200',
project: 'bg-blue-100 text-blue-800 border-blue-200',
resource: 'bg-purple-100 text-purple-800 border-purple-200',
risk: 'bg-red-100 text-red-800 border-red-200',
schedule: 'bg-yellow-100 text-yellow-800 border-yellow-200',
executive: 'bg-indigo-100 text-indigo-800 border-indigo-200',
operational: 'bg-gray-100 text-gray-800 border-gray-200',
compliance: 'bg-orange-100 text-orange-800 border-orange-200'
};
return colors[category as keyof typeof colors] || colors.operational;
};

return (
<div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
<div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Report Generator</h2>
  <div className="flex items-center space-x-2">
    {generatedReport && (
      <button 
        onClick={() => setGeneratedReport(null)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-transparent text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Templates</span>
      </button>
    )}
    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
      <FileText className="w-6 h-6 text-gray-500 dark:text-gray-400" />
    </button>
  </div>
</div>

<div className="flex-1 overflow-y-auto p-6">
  {!generatedReport ? (
    // Step 1: Select Template and Generate Report
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Step 1: Generate Report</h3>
        <p className="text-gray-600 dark:text-gray-400">Select a template and generate your report with real data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((template) => {
          const IconComponent = getCategoryIcon(template.category);
          
          return (
            <div 
              key={template.id} 
              className={`border rounded-lg p-6 cursor-pointer transition-all duration-300 ${
                selectedTemplate?.id === template.id 
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <IconComponent className="w-6 h-6 text-orange-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{template.name}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(template.category)}`}>
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{template.description}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span>Version {template.version}</span>
                <span>By {template.createdBy}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {template.dataSource.map((source, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                    {source}
                  </span>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateReport(template);
                }}
                disabled={isGenerating}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    // Step 2: Export Generated Report
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Step 2: Export Report</h3>
        <p className="text-gray-600 dark:text-gray-400">Your report has been generated. Choose your preferred export format.</p>
      </div>

      {/* Generated Report Info */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-green-900 dark:text-green-200">{generatedReport.template.name}</h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Generated on {generatedReport.generatedAt.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setGeneratedReport(null)}
              className="px-3 py-1 text-sm bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-700"
            >
              Generate New
            </button>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {formatOptions.map((format) => {
          const IconComponent = format.icon;
          
          return (
            <button
              key={format.value}
              onClick={() => handleExportReport(format.value)}
              disabled={isExporting}
              className={`flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 text-left ${
                format.color.replace('hover:', '') + ' text-white border-transparent hover:shadow-lg'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <IconComponent className="w-6 h-6" />
              <div>
                <div className="font-medium">{format.label}</div>
                <div className="text-sm opacity-90">{format.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Preview - Collapsible */}
      <div className="mt-8">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <Eye className="w-4 h-4" />
          <span>{showSummary ? 'Hide' : 'Show'} Report Summary</span>
        </button>
        
        {showSummary && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <h4 className="font-semibold mb-2">Report Data Summary</h4>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(generatedReport.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )}
</div>
</div>
</div>
);
};

export default ReportGenerator;