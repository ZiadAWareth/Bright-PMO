import * as XLSX from 'xlsx';

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'email' | 'phone' | 'url';
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  description?: string;
  example?: string;
}

export interface TemplateConfig {
  entity: string;
  fields: TemplateField[];
  sampleData?: any[];
  referenceSheets?: {
    name: string;
    data: any[];
    keyField: string;
    displayField: string;
  }[];
  instructions?: string[];
}

export class TemplateGenerator {
  private config: TemplateConfig;

  constructor(config: TemplateConfig) {
    this.config = config;
  }

  generateTemplate(): ArrayBuffer {
    const wb = XLSX.utils.book_new();

    // Main data sheet
    const headers = this.config.fields.map(field => 
      field.required ? `${field.label}*` : field.label
    );
    
    const sampleData = this.config.sampleData || [
      this.config.fields.map(field => field.example || '')
    ];

    const mainWS = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    
    // Set column widths
    const colWidths = this.config.fields.map(field => ({
      wch: Math.max(field.label.length, field.example?.length || 0, 15)
    }));
    mainWS['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, mainWS, this.config.entity);

    // Reference sheets
    if (this.config.referenceSheets) {
      this.config.referenceSheets.forEach(refSheet => {
        const refWS = XLSX.utils.json_to_sheet(refSheet.data);
        XLSX.utils.book_append_sheet(wb, refWS, refSheet.name);
      });
    }

    // Instructions sheet
    if (this.config.instructions) {
      const instructions = [
        [`${this.config.entity} Template Instructions`],
        [''],
        ...this.config.instructions.map(instruction => [instruction]),
        [''],
        ['Field Details:'],
        ...this.config.fields.map(field => [
          `${field.label}${field.required ? '*' : ''}: ${field.description || field.type}${
            field.options ? ` (Options: ${field.options.join(', ')})` : ''
          }`
        ])
      ];

      const instructionsWS = XLSX.utils.aoa_to_sheet(instructions);
      XLSX.utils.book_append_sheet(wb, instructionsWS, 'Instructions');
    }

    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  }
}

export class TemplateProcessor {
  private config: TemplateConfig;

  constructor(config: TemplateConfig) {
    this.config = config;
  }

  processFile(buffer: ArrayBuffer): {
    data: any[];
    errors: { row: number; field: string; error: string }[];
  } {
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[this.config.entity];
    
    if (!worksheet) {
      throw new Error(`No "${this.config.entity}" sheet found in the uploaded file`);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error(`No data found in the ${this.config.entity} sheet`);
    }

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1) as any[][];

    const fieldMapping = this.createFieldMapping(headers);
    const processedData = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;

      // Skip empty rows
      if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
        continue;
      }

      const processedRow: { [key: string]: any } = {};
      let hasErrors = false;

      for (const field of this.config.fields) {
        const columnIndex = fieldMapping[field.key];
        const value = columnIndex !== undefined ? row[columnIndex] : undefined;

        // Validate required fields
        if (field.required && (!value || value.toString().trim() === '')) {
          errors.push({
            row: rowNumber,
            field: field.label,
            error: `${field.label} is required`
          });
          hasErrors = true;
          continue;
        }

        // Process value based on type
        let processedValue = this.processFieldValue(value, field);

        // Validate processed value
        const validationError = this.validateField(processedValue, field);
        if (validationError) {
          errors.push({
            row: rowNumber,
            field: field.label,
            error: validationError
          });
          hasErrors = true;
          continue;
        }

        processedRow[field.key] = processedValue;
      }

      if (!hasErrors) {
        processedData.push(processedRow);
      }
    }

    return { data: processedData, errors };
  }

  private createFieldMapping(headers: string[]): { [key: string]: number } {
    const mapping: { [key: string]: number } = {};
    
    for (const field of this.config.fields) {
      const requiredLabel = field.required ? `${field.label}*` : field.label;
      const index = headers.findIndex(h => 
        h && (h.trim() === field.label || h.trim() === requiredLabel)
      );
      if (index !== -1) {
        mapping[field.key] = index;
      }
    }

    return mapping;
  }

  private processFieldValue(value: any, field: TemplateField): any {
    if (!value || value.toString().trim() === '') {
      return null;
    }

    const stringValue = value.toString().trim();

    switch (field.type) {
      case 'number':
        const numValue = parseFloat(stringValue);
        return isNaN(numValue) ? null : numValue;
      
      case 'date':
        const dateValue = new Date(stringValue);
        return isNaN(dateValue.getTime()) ? null : dateValue;
      
      case 'boolean':
        return ['true', '1', 'yes', 'on'].includes(stringValue.toLowerCase());
      
      case 'select':
        return field.options?.includes(stringValue) ? stringValue : null;
      
      default:
        return stringValue;
    }
  }

  private validateField(value: any, field: TemplateField): string | null {
    if (!value && !field.required) {
      return null;
    }

    switch (field.type) {
      case 'number':
        if (typeof value !== 'number') {
          return `${field.label} must be a valid number`;
        }
        if (field.validation?.min !== undefined && value < field.validation.min) {
          return `${field.label} must be at least ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && value > field.validation.max) {
          return `${field.label} must be at most ${field.validation.max}`;
        }
        break;

      case 'date':
        if (!(value instanceof Date)) {
          return `${field.label} must be a valid date (YYYY-MM-DD format)`;
        }
        break;

      case 'select':
        if (!field.options?.includes(value)) {
          return `${field.label} must be one of: ${field.options?.join(', ')}`;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${field.label} must be a valid email address`;
        }
        break;

      case 'phone':
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
          return `${field.label} must be a valid phone number`;
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return `${field.label} must be a valid URL`;
        }
        break;
    }

    return null;
  }
}

// Project-specific template configuration
export const projectTemplateConfig: TemplateConfig = {
  entity: 'Projects',
  fields: [
    {
      key: 'name',
      label: 'Project Name',
      type: 'text',
      required: true,
      description: 'The name of the project',
      example: 'New Office Building'
    },
    {
      key: 'client',
      label: 'Client Name',
      type: 'text',
      required: true,
      description: 'The client or customer name',
      example: 'ABC Corporation'
    },
    {
      key: 'location',
      label: 'Location',
      type: 'text',
      required: true,
      description: 'Project location',
      example: 'New York, NY'
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      required: true,
      options: ['high', 'medium', 'low'],
      description: 'Project priority level',
      example: 'high'
    },
    {
      key: 'start_date',
      label: 'Start Date',
      type: 'date',
      required: true,
      description: 'Project start date in YYYY-MM-DD format',
      example: '2025-01-01'
    },
    {
      key: 'description',
      label: 'Project Description',
      type: 'text',
      required: true,
      description: 'Detailed project description',
      example: 'Construction of a new office building with modern facilities'
    },
    {
      key: 'type',
      label: 'Project Type',
      type: 'select',
      required: true,
      options: ['residential', 'commercial', 'industrial', 'infrastructure', 'healthcare', 'educational', 'government', 'mixed_use', 'renovation', 'religious'],
      description: 'Type of project',
      example: 'commercial'
    },
    {
      key: 'project_size',
      label: 'Project Size',
      type: 'select',
      required: true,
      options: ['small', 'medium', 'large', 'extra_large'],
      description: 'Size of the project',
      example: 'medium'
    },
    {
      key: 'size',
      label: 'Size (m²)',
      type: 'number',
      required: false,
      description: 'Project size in square meters',
      example: '5000'
    },
    {
      key: 'strategic_value',
      label: 'Strategic Value',
      type: 'select',
      required: false,
      options: ['high', 'medium', 'low'],
      description: 'Strategic value of the project',
      example: 'medium'
    },
    {
      key: 'portfolio_id',
      label: 'Portfolio ID',
      type: 'number',
      required: true,
      description: 'ID of the portfolio this project belongs to',
      example: '1'
    },
    {
      key: 'eps_level_id',
      label: 'EPS ID',
      type: 'number',
      required: true,
      description: 'ID of the EPS level',
      example: '1'
    },
    {
      key: 'methodology',
      label: 'Methodology',
      type: 'text',
      required: true,
      description: 'Project methodology (e.g., Agile, Waterfall)',
      example: 'Agile'
    },
    {
      key: 'department',
      label: 'Department',
      type: 'text',
      required: true,
      description: 'Department responsible for the project',
      example: 'Engineering'
    },
    {
      key: 'budget_amount',
      label: 'Total Project Budget',
      type: 'number',
      required: true,
      description: 'Total project budget amount',
      example: '1000000'
    },
    {
      key: 'expected_roi',
      label: 'Expected ROI',
      type: 'number',
      required: true,
      description: 'Expected return on investment (percentage)',
      example: '15'
    },
    {
      key: 'planned_end_date',
      label: 'End Date',
      type: 'date',
      required: true,
      description: 'Project planned end date in YYYY-MM-DD format',
      example: '2025-12-31'
    },
    {
      key: 'governance_reporting_frequency',
      label: 'Governance Reporting Frequency',
      type: 'select',
      required: true,
      options: ['weekly', 'bi-weekly', 'monthly', 'quarterly'],
      description: 'How often governance reports are generated',
      example: 'monthly'
    },
    {
      key: 'governance_gates',
      label: 'Governance Gates',
      type: 'text',
      required: true,
      description: 'Project governance gates (comma-separated)',
      example: 'Planning Gate, Design Gate, Implementation Gate'
    },
    {
      key: 'manager_id',
      label: 'Project Manager ID',
      type: 'number',
      required: true,
      description: 'ID of the project manager (must be from Project Managers sheet)',
      example: '1'
    }
  ],
  instructions: [
    '1. Fill in the Projects sheet with your project data',
    '2. Required fields are marked with *',
    '3. Use the reference sheets for valid IDs',
    '4. Date format: YYYY-MM-DD (e.g., 2025-01-01)',
    '5. Project Manager ID must be from the "Project Managers" reference sheet',
    '6. Remove the sample data row before uploading',
    '7. Ensure all referenced Portfolio, EPS, and Project Manager IDs exist in the system'
  ]
};
