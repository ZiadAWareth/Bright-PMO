import { ReportTemplate } from './types';
import { generatePdf } from './pdfGenerator';
import { generateExcel, generateCsv } from './excelGenerator';
import { fetchReportData, getProjectSummary, getResourceUtilization, getFinancialSummary, getRiskAnalysis } from './dataService';
import { toast } from 'sonner';

export const generateReport = async (template: ReportTemplate) => {
  toast.info(`Generating ${template.format.toUpperCase()} report: ${template.name}`);

  try {
    // Fetch real data based on template data sources
    const data = await fetchReportData(template.dataSource);
    
    // Get specific data summaries for different report types
    let reportData: any = data;
    
    switch (template.category) {
      case 'project':
        reportData = await getProjectSummary();
        break;
      case 'resource':
        reportData = await getResourceUtilization();
        break;
      case 'financial':
        reportData = await getFinancialSummary();
        break;
      case 'risk':
        reportData = await getRiskAnalysis();
        break;
      default:
        // Use the raw data for other categories
        break;
    }

    switch (template.format) {
      case 'pdf':
        generatePdf(template, reportData);
        break;
      case 'excel':
        generateExcel(template, reportData);
        break;
      case 'powerpoint': {
        // POST to the API route and trigger download
        const response = await fetch('/api/reports/pptx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template, data: reportData })
        });
        if (!response.ok) throw new Error('Failed to generate PPTX');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name.replace(/\s+/g, '_')}.pptx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        break;
      }
      case 'csv':
        generateCsv(template, reportData);
        break;
      case 'dashboard':
        toast.error('Dashboard view is not an exportable format.');
        break;
      default:
        toast.error(`Unsupported report format: ${template.format}`);
        return;
    }
    toast.success('Report generated successfully!');
  } catch (error) {
    console.error('Error generating report:', error);
    toast.error('Failed to generate report.');
  }
}; 