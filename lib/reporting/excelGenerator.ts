import * as XLSX from 'xlsx';
import { ReportTemplate } from './types';

export const generateExcel = (template: ReportTemplate, data: any) => {
  const workbook = XLSX.utils.book_new();
  
  // Set workbook properties
  workbook.Props = {
    Title: template.name,
    Author: template.createdBy,
    CreatedDate: new Date()
  };

  // Helper function to clean data by removing primary key IDs but keeping foreign keys
  const cleanDataForExport = (items: any[]) => {
    return items.map(item => {
      const cleaned: any = {};
      Object.entries(item).forEach(([key, value]) => {
        // Keep foreign keys (ends with _id but not primary keys like project_id, user_id, etc.)
        // Remove primary keys (like id, project_id, user_id, etc.)
        if (key === 'id' || key === 'project_id' || key === 'user_id' || key === 'task_id' || 
            key === 'resource_id' || key === 'budget_id' || key === 'risk_id' || 
            key === 'portfolio_id' || key === 'wbs_id' || key === 'document_id') {
          return; // Skip primary keys
        }
        
        // Keep foreign keys and other data
        cleaned[key] = value;
      });
      return cleaned;
    });
  };

  // Helper function to format field names
  const formatFieldName = (fieldName: string) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  // Helper function to create summary data
  const createSummaryData = (data: any) => {
    const summary = [];
    summary.push(['Report Information', '']);
    summary.push(['Report Name', template.name]);
    summary.push(['Category', template.category]);
    summary.push(['Version', template.version]);
    summary.push(['Created By', template.createdBy]);
    summary.push(['Generated On', new Date().toLocaleString()]);
    summary.push(['Data Sources', template.dataSource.join(', ')]);
    summary.push(['', '']);
    summary.push(['Executive Summary', '']);

    // Projects Summary
    if (data.projects) {
      const projects = Array.isArray(data.projects) ? data.projects : [];
      summary.push(['Total Projects', projects.length]);
      summary.push(['Active Projects', projects.filter((p: any) => p.status === 'active' || p.status === 'execution').length]);
      summary.push(['Completed Projects', projects.filter((p: any) => p.status === 'completed').length]);
    }

    // Financial Summary
    if (data.budgets || data.transactions || data.procurements) {
      const budgets = data.budgets || [];
      const transactions = data.transactions || [];
      const procurements = data.procurements || [];
      
      const totalBudget = budgets.reduce((sum: number, budget: any) => sum + (budget.planned_amount || 0), 0);
      const totalSpent = budgets.reduce((sum: number, budget: any) => sum + (budget.actual_amount || 0), 0) +
                        transactions.reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0) +
                        procurements.reduce((sum: number, procurement: any) => sum + (procurement.actual_cost || 0), 0);
      
      summary.push(['Total Budget', `OMR ${totalBudget.toLocaleString()}`]);
      summary.push(['Total Spent', `OMR ${totalSpent.toLocaleString()}`]);
      summary.push(['Remaining Budget', `OMR ${(totalBudget - totalSpent).toLocaleString()}`]);
    }

    // Resources Summary
    if (data.resources) {
      const resources = Array.isArray(data.resources) ? data.resources : [];
      summary.push(['Total Resources', resources.length]);
      summary.push(['Available Resources', resources.filter((r: any) => !r.assignments || r.assignments.length === 0).length]);
      summary.push(['Allocated Resources', resources.filter((r: any) => r.assignments && r.assignments.length > 0).length]);
    }

    // Tasks Summary
    if (data.tasks) {
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      summary.push(['Total Tasks', tasks.length]);
      summary.push(['Completed Tasks', tasks.filter((t: any) => t.status === 'completed').length]);
      summary.push(['In Progress Tasks', tasks.filter((t: any) => t.status === 'in_progress' || t.status === 'active').length]);
    }

    return summary;
  };

  // Create Summary Sheet
  const summaryData = createSummaryData(data);
  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Executive Summary');

  // Create detailed worksheets for each data type
  if (data.projects && data.projects.length > 0) {
    const cleanedProjects = cleanDataForExport(data.projects);
    const projectWorksheet = XLSX.utils.json_to_sheet(cleanedProjects);
    
    // Format headers
    const range = XLSX.utils.decode_range(projectWorksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const header = projectWorksheet[cellAddress];
      if (header) {
        header.v = formatFieldName(header.v);
      }
    }
    
    projectWorksheet['!cols'] = Object.keys(cleanedProjects[0]).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, projectWorksheet, 'Projects');
  }

  if (data.budgets && data.budgets.length > 0) {
    const cleanedBudgets = cleanDataForExport(data.budgets);
    const budgetWorksheet = XLSX.utils.json_to_sheet(cleanedBudgets);
    
    // Format headers
    const range = XLSX.utils.decode_range(budgetWorksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const header = budgetWorksheet[cellAddress];
      if (header) {
        header.v = formatFieldName(header.v);
      }
    }
    
    budgetWorksheet['!cols'] = Object.keys(cleanedBudgets[0]).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, budgetWorksheet, 'Budgets');
  }

  if (data.transactions && data.transactions.length > 0) {
    const cleanedTransactions = cleanDataForExport(data.transactions);
    const transactionWorksheet = XLSX.utils.json_to_sheet(cleanedTransactions);
    
    // Format headers
    const range = XLSX.utils.decode_range(transactionWorksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const header = transactionWorksheet[cellAddress];
      if (header) {
        header.v = formatFieldName(header.v);
      }
    }
    
    transactionWorksheet['!cols'] = Object.keys(cleanedTransactions[0]).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, transactionWorksheet, 'Transactions');
  }

  if (data.resources && data.resources.length > 0) {
    const cleanedResources = cleanDataForExport(data.resources);
    const resourceWorksheet = XLSX.utils.json_to_sheet(cleanedResources);
    
    // Format headers
    const range = XLSX.utils.decode_range(resourceWorksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const header = resourceWorksheet[cellAddress];
      if (header) {
        header.v = formatFieldName(header.v);
      }
    }
    
    resourceWorksheet['!cols'] = Object.keys(cleanedResources[0]).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, resourceWorksheet, 'Resources');
  }

  if (data.tasks && data.tasks.length > 0) {
    const cleanedTasks = cleanDataForExport(data.tasks);
    const taskWorksheet = XLSX.utils.json_to_sheet(cleanedTasks);
    
    // Format headers
    const range = XLSX.utils.decode_range(taskWorksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const header = taskWorksheet[cellAddress];
      if (header) {
        header.v = formatFieldName(header.v);
      }
    }
    
    taskWorksheet['!cols'] = Object.keys(cleanedTasks[0]).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, taskWorksheet, 'Tasks');
  }

  if (data.portfolios && data.portfolios.length > 0) {
    const cleanedPortfolios = cleanDataForExport(data.portfolios);
    const portfolioWorksheet = XLSX.utils.json_to_sheet(cleanedPortfolios);
    
    // Format headers
    const range = XLSX.utils.decode_range(portfolioWorksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const header = portfolioWorksheet[cellAddress];
      if (header) {
        header.v = formatFieldName(header.v);
      }
    }
    
    portfolioWorksheet['!cols'] = Object.keys(cleanedPortfolios[0]).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, portfolioWorksheet, 'Portfolios');
  }

  if (data.risks && data.risks.length > 0) {
    const cleanedRisks = cleanDataForExport(data.risks);
    const riskWorksheet = XLSX.utils.json_to_sheet(cleanedRisks);
    
    // Format headers
    const range = XLSX.utils.decode_range(riskWorksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const header = riskWorksheet[cellAddress];
      if (header) {
        header.v = formatFieldName(header.v);
      }
    }
    
    riskWorksheet['!cols'] = Object.keys(cleanedRisks[0]).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, riskWorksheet, 'Risks');
  }

  XLSX.writeFile(workbook, `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const generateCsv = (template: ReportTemplate, data: any) => {
  let csvContent = '';
  
  // Add header information
  csvContent += `Report: ${template.name}\n`;
  csvContent += `Category: ${template.category}\n`;
  csvContent += `Generated: ${new Date().toLocaleString()}\n`;
  csvContent += `Created By: ${template.createdBy}\n`;
  csvContent += `\n`;

  if (Array.isArray(data)) {
    // Handle array data
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      csvContent += headers.join(',') + '\n';
      
      data.forEach(item => {
        const row = headers.map(header => {
          const value = item[header];
          // Escape commas and quotes in CSV
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        });
        csvContent += row.join(',') + '\n';
      });
    } else {
      csvContent += 'No data available\n';
    }
  } else if (typeof data === 'object' && data !== null) {
    // Handle object data
    Object.entries(data).forEach(([key, value]) => {
      csvContent += `\n${key}:\n`;
      
      if (Array.isArray(value)) {
        if (value.length > 0) {
          const headers = Object.keys(value[0]);
          csvContent += headers.join(',') + '\n';
          
          value.forEach(item => {
            const row = headers.map(header => {
              const itemValue = item[header];
              const stringValue = String(itemValue).replace(/"/g, '""');
              return `"${stringValue}"`;
            });
            csvContent += row.join(',') + '\n';
          });
        } else {
          csvContent += 'No data available\n';
        }
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          csvContent += `"${subKey}","${subValue}"\n`;
        });
      } else {
        csvContent += `"${key}","${value}"\n`;
      }
    });
  } else {
    csvContent += `Data: ${data}\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 