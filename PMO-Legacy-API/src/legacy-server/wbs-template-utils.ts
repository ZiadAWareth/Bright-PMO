import * as XLSX from 'xlsx';

export interface WBSTemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
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

export interface WBSTemplateConfig {
  entity: string;
  fields: WBSTemplateField[];
  sampleData?: any[];
  referenceSheets?: {
    name: string;
    data: any[];
    keyField: string;
    displayField: string;
  }[];
  instructions?: string[];
}

export class WBSTemplateGenerator {
  private config: WBSTemplateConfig;

  constructor(config: WBSTemplateConfig) {
    this.config = config;
  }

  generateTemplate(): ArrayBuffer {
    const wb = XLSX.utils.book_new();

    // Instructions sheet first
    if (this.config.instructions) {
      const instructionsData = [
        ['WBS BULK UPLOAD INSTRUCTIONS'],
        ...this.config.instructions.map(instruction => [instruction])
      ];
      const instructionsWS = XLSX.utils.aoa_to_sheet(instructionsData);
      instructionsWS['!cols'] = [{ width: 100 }];
      
      // Style the header
      if (instructionsWS['A1']) {
        instructionsWS['A1'].s = {
          font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2563EB" } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      
      XLSX.utils.book_append_sheet(wb, instructionsWS, 'Instructions');
    }

    // Main data sheet
    const headers = this.config.fields.map(field => 
      field.required ? `${field.label}*` : field.label
    );
    
    const sampleData = this.config.sampleData || [
      this.config.fields.map(field => field.example || '')
    ];

    const mainWS = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    
    // Set column widths
    const colWidths = this.config.fields.map(() => ({ width: 20 }));
    mainWS['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, mainWS, this.config.entity);

    // Add reference sheets
    if (this.config.referenceSheets) {
      this.config.referenceSheets.forEach(refSheet => {
        if (refSheet.data && refSheet.data.length > 0) {
          const refHeaders = Object.keys(refSheet.data[0]);
          const refData = [
            refHeaders,
            ...refSheet.data.map(item => refHeaders.map(header => item[header] || ''))
          ];
          const refWS = XLSX.utils.aoa_to_sheet(refData);
          refWS['!cols'] = refHeaders.map(() => ({ width: 15 }));
          XLSX.utils.book_append_sheet(wb, refWS, refSheet.name);
        }
      });
    }

    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  }
}

export class WBSTemplateProcessor {
  private config: WBSTemplateConfig;

  constructor(config: WBSTemplateConfig) {
    this.config = config;
  }

  processFile(buffer: ArrayBuffer): {
    data: any[];
    errors: { row: number; field: string; error: string }[];
  } {
    try {
      const workbook = XLSX.read(buffer);
      
      // Log available sheet names for debugging
      console.log('Available sheets:', workbook.SheetNames);
      console.log('Looking for sheet:', this.config.entity);
      
      const worksheet = workbook.Sheets[this.config.entity];
      
      if (!worksheet) {
        throw new Error(`No "${this.config.entity}" sheet found in the uploaded file. Available sheets: ${workbook.SheetNames.join(', ')}`);
      }

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('Raw JSON data from sheet:', jsonData);
      
      if (jsonData.length < 2) {
        throw new Error(`No data found in the ${this.config.entity} sheet. The sheet appears to be empty or contains only headers.`);
      }

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as any[][];

      console.log('Headers found:', headers);
      console.log('Data rows count:', dataRows.length);

      const fieldMapping = this.createFieldMapping(headers);
      console.log('Field mapping created:', fieldMapping);
      
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
        const isEmpty = value === undefined || value === null || 
                       (typeof value === 'string' && value.toString().trim() === '');
        
        if (field.required && isEmpty) {
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
    
    } catch (error) {
      console.error('Error in processFile:', error);
      throw error;
    }
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

  private processFieldValue(value: any, field: WBSTemplateField): any {
    if (value === undefined || value === null || 
        (typeof value === 'string' && value.toString().trim() === '')) {
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

  private validateField(value: any, field: WBSTemplateField): string | null {
    const isEmpty = value === undefined || value === null || 
                   (typeof value === 'string' && value.toString().trim() === '');
                   
    if (isEmpty && !field.required) {
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
    }

    return null;
  }
}

// WBS-specific template configuration
export const wbsTemplateConfig: WBSTemplateConfig = {
  entity: 'WBS Items',
  fields: [
    {
      key: 'name',
      label: 'WBS Name',
      type: 'text',
      required: true,
      description: 'The name of the WBS item',
      example: 'Design Phase'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      required: true,
      description: 'Detailed description of the WBS item',
      example: 'Complete architectural and engineering design'
    },
    {
      key: 'level',
      label: 'Level',
      type: 'number',
      required: true,
      validation: { min: 1, max: 10 },
      description: 'Hierarchical level (1 = first level, 2 = second level, etc.)',
      example: '2'
    },
    {
      key: 'parent_wbs_id',
      label: 'Parent WBS ID',
      type: 'number',
      required: false,
      description: 'ID of existing parent WBS item (required if not using Parent Row Reference)',
      example: '1'
    },
    {
      key: 'parent_row_reference',
      label: 'Parent Row Reference',
      type: 'number',
      required: false,
      description: 'Row number of parent WBS in this same upload (required if not using Parent WBS ID)',
      example: '2'
    },
    {
      key: 'start_date',
      label: 'Start Date',
      type: 'date',
      required: true,
      description: 'WBS item start date in YYYY-MM-DD format',
      example: '2025-01-01'
    },
    {
      key: 'end_date',
      label: 'End Date',
      type: 'date',
      required: true,
      description: 'WBS item end date in YYYY-MM-DD format',
      example: '2025-03-31'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: false,
      options: ['not_started', 'in_progress', 'completed', 'on_hold', 'delayed'],
      description: 'Current status of the WBS item',
      example: 'not_started'
    }
  ],
  sampleData: [
    [
      'Requirements Analysis', 
      'Detailed requirements analysis and documentation',
      '2',
      '1',
      '',
      '2025-01-01',
      '2025-01-31',
      'not_started'
    ],
    [
      'Design Phase',
      'System design and architecture planning',
      '2', 
      '1',
      '',
      '2025-02-01',
      '2025-02-28',
      'not_started'
    ],
    [
      'UI Design',
      'User interface design and prototyping',
      '3', 
      '',
      '2',
      '2025-01-01',
      '2025-01-15',
      'not_started'
    ]
  ],
  instructions: [
    '',
    '🚨 IMPORTANT: ROOT WBS CREATION NOT ALLOWED 🚨',
    'You cannot create root level (Level 0) WBS items through bulk upload.',
    'All WBS items must have a parent assigned using one of the methods below.',
    '',
    '📋 PARENT ASSIGNMENT METHODS:',
    '1. Parent WBS ID: Reference an existing WBS item in your project',
    '2. Parent Row Reference: Reference another row in this same upload file',
    '',
    '⚠️  VALIDATION RULES:',
    '• Every WBS item MUST have either Parent WBS ID OR Parent Row Reference',
    '• You cannot use both Parent WBS ID and Parent Row Reference together',
    '• Parent Row Reference must point to a row that comes before it',
    '• Level must be exactly parent level + 1',
    '• Minimum level is 1 (no level 0 allowed)',
    '',
    '📝 HOW TO USE:',
    '1. Fill in the "WBS Items" sheet with your WBS data',
    '2. Required fields are marked with * (asterisk)',
    '3. Use the "Existing WBS Items" sheet to find Parent WBS IDs',
    '4. Use "Parent Row Reference" to create hierarchies within this upload',
    '5. Date format: YYYY-MM-DD (e.g., 2025-01-01)',
    '6. Remove all sample data rows before uploading',
    '7. Status options: not_started, in_progress, completed, on_hold, delayed',
    '8. Budget amounts will be set separately from the budget management page',
    '',
    '💡 EXAMPLE USAGE:',
    'Row 2: "Requirements" (Level 2, Parent WBS ID: 1)',
    'Row 3: "Design" (Level 2, Parent WBS ID: 1)', 
    'Row 4: "UI Design" (Level 3, Parent Row Reference: 3)',
    'Row 5: "Backend Design" (Level 3, Parent Row Reference: 3)',
    '',
    '🔍 FIELD DESCRIPTIONS:',
    '• WBS Name: Descriptive name for the work package',
    '• Description: Detailed explanation of the work to be done',
    '• Level: Hierarchical level (1, 2, 3, etc.) - must be parent level + 1',
    '• Parent WBS ID: ID of existing WBS item (from reference sheet)',
    '• Parent Row Reference: Row number in this file (counting from header)',
    '• Start/End Date: Work package timeline',
    '• Status: Current status of the work package'
  ]
};
