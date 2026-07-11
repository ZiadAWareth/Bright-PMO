'use client';

import React, { useState } from 'react';
import { ReportTemplate, ReportFormat } from '@/lib/reporting/types';
import { X, FileText, Download, FileSpreadsheet, FileImage, FileBarChart, FilePieChart } from 'lucide-react';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ReportTemplate[];
}

const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({ isOpen, onClose, templates }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const formatOptions: { value: ReportFormat; label: string; icon: any; description: string }[] = [
    { value: 'pdf', label: 'PDF Report', icon: FileText, description: 'Professional document format' },
    { value: 'excel', label: 'Excel Spreadsheet', icon: FileSpreadsheet, description: 'Data analysis and calculations' },
    { value: 'powerpoint', label: 'PowerPoint Presentation', icon: FileImage, description: 'Presentation format' },
    { value: 'csv', label: 'CSV Data Export', icon: FileBarChart, description: 'Raw data export' },
    { value: 'dashboard', label: 'Interactive Dashboard', icon: FilePieChart, description: 'Real-time dashboard view' }
  ];

  const handleGenerateReport = async (template: ReportTemplate, format: ReportFormat) => {
    setIsGenerating(true);
    try {
      if (format === 'powerpoint') {
        const response = await fetch('/api/reports/pptx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template, data: {} }) // You may want to fetch real data here
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
      } else {
        // For other formats, show a toast for now
        window.alert('Only PowerPoint export is supported in this modal for now.');
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getFormatIcon = (format: ReportFormat) => {
    const option = formatOptions.find(opt => opt.value === format);
    return option ? option.icon : FileText;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Template Library</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-700">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-6 h-6 text-orange-500" />
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
                </div>

                {/* Format Selection */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Format:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {formatOptions.map((format) => {
                      const IconComponent = format.icon;
                      const isSelected = format.value === selectedFormat;
                      
                      return (
                        <button
                          key={format.value}
                          onClick={() => setSelectedFormat(format.value)}
                          className={`flex items-center space-x-2 p-3 rounded-lg border transition-all duration-200 text-left ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' 
                              : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                          <div>
                            <div className="text-sm font-medium">{format.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{format.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleGenerateReport(template, selectedFormat)}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Download size={16} className="mr-2" />
                    )}
                    Generate {selectedFormat.toUpperCase()}
                  </button>
                  
                  {template.lastGenerated && (
                    <button className="px-3 py-3 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                      <FileText size={16} />
                    </button>
                  )}
                </div>

                {/* Data Sources */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Data Sources:</h5>
                  <div className="flex flex-wrap gap-1">
                    {template.dataSource.map((source, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateLibraryModal; 