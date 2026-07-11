import React, { useState, useEffect } from 'react';
import { FileText, Download, Loader2, X, Plus, Trash2, BarChart3, PieChart, Table, Calendar, Users, DollarSign, AlertTriangle, Briefcase, Settings } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface SelectiveReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (report: any) => void;
}

const dataSources = [
  { value: 'projects', label: 'Projects', icon: Briefcase, color: 'text-blue-500' },
  { value: 'portfolios', label: 'Portfolios', icon: BarChart3, color: 'text-purple-500' },
  { value: 'resources', label: 'Resources', icon: Users, color: 'text-green-500' },
  { value: 'budgets', label: 'Budgets', icon: DollarSign, color: 'text-emerald-500' },
  { value: 'tasks', label: 'Tasks', icon: Calendar, color: 'text-orange-500' },
  { value: 'risks', label: 'Risks', icon: AlertTriangle, color: 'text-red-500' },
  { value: 'documents', label: 'Documents', icon: FileText, color: 'text-gray-500' },
  { value: 'equipment', label: 'Equipment', icon: Settings, color: 'text-indigo-500' },
];

const exportFormats = [
  { value: 'pdf', label: 'PDF Report', icon: FileText, color: 'bg-red-500' },
  { value: 'excel', label: 'Excel Spreadsheet', icon: Table, color: 'bg-green-500' },
  { value: 'powerpoint', label: 'PowerPoint Presentation', icon: BarChart3, color: 'bg-orange-500' },
  { value: 'csv', label: 'CSV Data Export', icon: Table, color: 'bg-blue-500' },
];

interface ReportSection {
  id: string;
  title: string;
  dataSource: string;
  chartType: 'table' | 'bar' | 'pie' | 'line';
  includeNotes: boolean;
}

const SelectiveReportGenerator: React.FC<SelectiveReportGeneratorProps> = ({ isOpen, onClose, onGenerate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Get current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data && response.data.user) {
          setCurrentUser(response.data.user);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    if (isOpen) {
      fetchCurrentUser();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addSection = () => {
    const newSection: ReportSection = {
      id: Date.now().toString(),
      title: `Section ${sections.length + 1}`,
      dataSource: selectedDataSources[0] || 'projects',
      chartType: 'table',
      includeNotes: false,
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(section => section.id !== id));
  };

  const updateSection = (id: string, updates: Partial<ReportSection>) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, ...updates } : section
    ));
  };

  // Handle generate report
  const handleGenerate = async () => {
    if (!name.trim() || !currentUser || sections.length === 0) {
      console.error('Name, user, and at least one section are required');
      return;
    }

    setIsGenerating(true);
    
    try {
      // First, create the report in the database
      const reportData = {
        name: name.trim(),
        description: description.trim() || null,
        type: 'custom_report',
        template: {
          created_at: new Date().toISOString(),
          format: exportFormat,
          dataSources: selectedDataSources,
          sections: sections,
        },
        created_by: currentUser.user_id,
      };

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/reports', reportData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 201) {
        console.log('Custom report created successfully:', response.data);
        
        // Show success toast instead of generating and downloading
        toast.success('Report successfully added!');
        
        onGenerate(response.data);
        onClose();
        
        // Reset form
        setName('');
        setDescription('');
        setSelectedDataSources([]);
        setSections([]);
        setExportFormat('pdf');
      }
    } catch (error) {
      console.error('Failed to create custom report:', error);
      toast.error('Failed to create report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAndDownloadReport = async (reportData: any) => {
    try {
      // Fetch data for all selected data sources
      const dataResponse = await axios.post('/api/reports/data', {
        dataSources: selectedDataSources,
        reportType: 'custom',
        filters: {}
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (dataResponse.status === 200) {
        const reportContent = dataResponse.data.data;
        
        // Generate the report based on export format
        let downloadUrl = '';
        
        switch (exportFormat) {
          case 'pdf':
            downloadUrl = await generatePDFReport(reportData, reportContent);
            break;
          case 'excel':
            downloadUrl = await generateExcelReport(reportData, reportContent);
            break;
          case 'powerpoint':
            downloadUrl = await generatePowerPointReport(reportData, reportContent);
            break;
          case 'csv':
            downloadUrl = await generateCSVReport(reportData, reportContent);
            break;
          default:
            downloadUrl = await generatePDFReport(reportData, reportContent);
        }

        // Download the file
        if (downloadUrl) {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error('Failed to generate report file:', error);
    }
  };

  const generatePDFReport = async (reportData: any, content: any): Promise<string> => {
    // This would integrate with your PDF generation service
    // For now, we'll create a simple text-based PDF
    const { generatePdf } = await import('@/lib/reporting/pdfGenerator');
    
    // Create a template object for the PDF generator
    const template = {
      id: `custom-${Date.now()}`,
      name: reportData.name,
      description: reportData.description,
      category: 'operational' as const,
      format: 'pdf' as const,
      dataSource: selectedDataSources,
      version: '1.0',
      createdBy: currentUser.first_name + ' ' + currentUser.last_name,
      createdAt: new Date(),
    };

    generatePdf(template, content);
    return ''; // PDF generator handles the download
  };

  const generateExcelReport = async (reportData: any, content: any): Promise<string> => {
    const { generateExcel } = await import('@/lib/reporting/excelGenerator');
    
    const template = {
      id: `custom-${Date.now()}`,
      name: reportData.name,
      description: reportData.description,
      category: 'operational' as const,
      format: 'excel' as const,
      dataSource: selectedDataSources,
      version: '1.0',
      createdBy: currentUser.first_name + ' ' + currentUser.last_name,
      createdAt: new Date(),
    };

    generateExcel(template, content);
    return ''; // Excel generator handles the download
  };

  const generatePowerPointReport = async (reportData: any, content: any): Promise<string> => {
    const template = {
      id: `custom-${Date.now()}`,
      name: reportData.name,
      description: reportData.description,
      category: 'operational' as const,
      format: 'powerpoint' as const,
      dataSource: selectedDataSources,
      version: '1.0',
      createdBy: currentUser.first_name + ' ' + currentUser.last_name,
      createdAt: new Date(),
    };

    // Call the server-side API route to generate PPTX
    const pptxResponse = await fetch('/api/reports/pptx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, data: content })
    });
    if (!pptxResponse.ok) throw new Error('Failed to generate PPTX');
    const blob = await pptxResponse.blob();
    const url = window.URL.createObjectURL(blob);
    return url;
  };

  const generateCSVReport = async (reportData: any, content: any): Promise<string> => {
    const { generateCsv } = await import('@/lib/reporting/excelGenerator');
    
    const template = {
      id: `custom-${Date.now()}`,
      name: reportData.name,
      description: reportData.description,
      category: 'operational' as const,
      format: 'csv' as const,
      dataSource: selectedDataSources,
      version: '1.0',
      createdBy: currentUser.first_name + ' ' + currentUser.last_name,
      createdAt: new Date(),
    };

    generateCsv(template, content);
    return ''; // CSV generator handles the download
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/10 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" /> 
            Universal Report Builder
          </h2>
          <button 
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" 
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Name *
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 p-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter report name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Format
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 p-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                {exportFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              className="w-full min-h-[80px] rounded-lg border border-gray-300 dark:border-slate-700 p-3 text-sm resize-y bg-white dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter report description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Data Sources */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Data Sources *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {dataSources.map((source) => {
                const isSelected = selectedDataSources.includes(source.value);
                const IconComponent = source.icon;
                
                return (
                  <button
                    key={source.value}
                    type="button"
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDataSources(selectedDataSources.filter(s => s !== source.value));
                      } else {
                        setSelectedDataSources([...selectedDataSources, source.value]);
                      }
                    }}
                  >
                    <IconComponent className={`w-6 h-6 mx-auto mb-2 ${source.color}`} />
                    <span className="text-sm font-medium">{source.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report Sections */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Report Sections *
              </label>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                onClick={addSection}
                disabled={selectedDataSources.length === 0}
              >
                <Plus className="w-4 h-4" />
                Add Section
              </button>
            </div>
            
            {sections.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No sections added yet. Select data sources and add sections to build your report.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section, index) => (
                  <div key={section.id} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        className="flex-1 mr-3 text-sm font-medium bg-transparent border-none focus:ring-0"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="Section title"
                      />
                      <button
                        type="button"
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        onClick={() => removeSection(section.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Source</label>
                        <select
                          className="w-full text-sm rounded border border-gray-200 dark:border-slate-600 p-2 bg-white dark:bg-slate-800"
                          value={section.dataSource}
                          onChange={(e) => updateSection(section.id, { dataSource: e.target.value })}
                        >
                          {selectedDataSources.map(source => (
                            <option key={source} value={source}>
                              {dataSources.find(ds => ds.value === source)?.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Chart Type</label>
                        <select
                          className="w-full text-sm rounded border border-gray-200 dark:border-slate-600 p-2 bg-white dark:bg-slate-800"
                          value={section.chartType}
                          onChange={(e) => updateSection(section.id, { chartType: e.target.value as any })}
                        >
                          <option value="table">Table</option>
                          <option value="bar">Bar Chart</option>
                          <option value="pie">Pie Chart</option>
                          <option value="line">Line Chart</option>
                        </select>
                      </div> */}
                      
                      <div className="flex items-center">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={section.includeNotes}
                            onChange={(e) => updateSection(section.id, { includeNotes: e.target.checked })}
                          />
                          Include Notes
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-slate-700 p-6 bg-gray-50 dark:bg-slate-800/50">
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleGenerate}
              disabled={isGenerating || !name.trim() || !currentUser || sections.length === 0 || selectedDataSources.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectiveReportGenerator;
