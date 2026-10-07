export interface ReportData {
  projects?: any[];
  portfolios?: any[];
  resources?: any[];
  tasks?: any[];
  budgets?: any[];
  risks?: any[];
  procurements?: any[];
  equipment?: any[];
  maintenance?: any[];
  sites?: any[];
  users?: any[];
  transactions?: any[];
  evms?: any[];
  lessons?: any[];
  documents?: any[];
}

// Direct API calls for specific data types
export const fetchProjectsDirect = async () => {
  try {
    const response = await fetch('/api/projects', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching projects directly:', error);
    return [];
  }
};

export const fetchBudgetsDirect = async () => {
  try {
    const response = await fetch('/api/budget', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch budgets: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching budgets directly:', error);
    return [];
  }
};

export const fetchResourcesDirect = async () => {
  try {
    const response = await fetch('/api/resources', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch resources: ${response.status}`);
    }

    const data = await response.json();
    return data.allResources || [];
  } catch (error) {
    console.error('Error fetching resources directly:', error);
    return [];
  }
};

export const fetchRisksDirect = async () => {
  try {
    const response = await fetch('/api/risks', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch risks: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching risks directly:', error);
    return [];
  }
};

export const fetchTasksDirect = async () => {
  try {
    const response = await fetch('/api/tasks', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching tasks directly:', error);
    return [];
  }
};

export const fetchPortfoliosDirect = async () => {
  try {
    const response = await fetch('/api/portfolios', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch portfolios: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching portfolios directly:', error);
    return [];
  }
};

export const fetchDocumentsDirect = async () => {
  try {
    const response = await fetch('/api/documents', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching documents directly:', error);
    return [];
  }
};

export const fetchTransactionsDirect = async () => {
  try {
    const response = await fetch('/api/transactions', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching transactions directly:', error);
    return [];
  }
};

export const fetchEquipmentSiteLogsDirect = async () => {
  try {
    console.log('fetchEquipmentSiteLogsDirect: Starting API call...');
    
    const response = await fetch('/api/equipment-site-logs', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('fetchEquipmentSiteLogsDirect: Response status:', response.status);
    console.log('fetchEquipmentSiteLogsDirect: Response ok:', response.ok);

    if (!response.ok) {
      throw new Error(`Failed to fetch equipment site logs: ${response.status}`);
    }

    const data = await response.json();
    console.log('fetchEquipmentSiteLogsDirect: Raw data received:', data);
    console.log('fetchEquipmentSiteLogsDirect: Data type:', typeof data);
    console.log('fetchEquipmentSiteLogsDirect: Data length:', Array.isArray(data) ? data.length : 'Not an array');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('fetchEquipmentSiteLogsDirect: First record:', data[0]);
      console.log('fetchEquipmentSiteLogsDirect: Resource types in data:', data.map(item => item.resource?.type).filter(Boolean));
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching equipment site logs directly:', error);
    return [];
  }
};

// Updated functions using direct API calls
export const getProjectSummary = async () => {
  try {
    console.log('getProjectSummary called - using direct API');
    const projects = await fetchProjectsDirect();
    console.log('Projects fetched directly:', projects);
    return projects;
  } catch (error) {
    console.error('Error fetching project summary:', error);
    return [];
  }
};

export const getResourceUtilization = async () => {
  try {
    console.log('getResourceUtilization called - using direct API');
    const resources = await fetchResourcesDirect();
    const tasks = await fetchTasksDirect();
    
    // Combine resources with their task assignments
    const resourcesWithAssignments = resources.map((resource: any) => ({
      ...resource,
      assignments: tasks.filter((task: any) => 
        task.resourceAssignments?.some((assignment: any) => 
          assignment.resource_id === resource.resource_id
        )
      )
    }));
    
    console.log('Resources with assignments:', resourcesWithAssignments);
    return resourcesWithAssignments;
  } catch (error) {
    console.error('Error fetching resource utilization:', error);
    return [];
  }
};

export const getFinancialSummary = async () => {
  try {
    console.log('getFinancialSummary called - using direct API');
    const budgets = await fetchBudgetsDirect();
    
    // Calculate summary metrics
    const totalPlanned = budgets.reduce((sum: number, budget: any) => 
      sum + (budget.planned_amount || 0), 0
    );
    const totalActual = budgets.reduce((sum: number, budget: any) => 
      sum + (budget.actual_amount || 0), 0
    );
    
    const summary = {
      totalPlanned,
      totalActual,
      totalVariance: totalPlanned - totalActual,
      totalBudgets: budgets.length
    };
    
    console.log('Financial summary calculated:', { budgets, summary });
    return { budgets, summary };
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    return { budgets: [], summary: {} };
  }
};

export const getRiskAnalysis = async () => {
  try {
    console.log('getRiskAnalysis called - using direct API');
    const risks = await fetchRisksDirect();
    console.log('Risks fetched directly:', risks);
    return risks;
  } catch (error) {
    console.error('Error fetching risk analysis:', error);
    return [];
  }
};

// Keep the original centralized function for backward compatibility
export const fetchReportData = async (dataSources: string[]): Promise<ReportData> => {
  try {
    console.log('fetchReportData called with sources:', dataSources);
    
    const response = await fetch('/api/reports/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataSources,
        reportType: 'raw'
      }),
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch report data: ${response.status}`);
    }

    const result = await response.json();
    console.log('API response data:', result);
    
    return result.data || {};
  } catch (error) {
    console.error('Error fetching report data:', error);
    // Return empty object as fallback
    return {};
  }
}; 