import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { WBSTemplateProcessor, wbsTemplateConfig } from '@/lib/wbs-template-utils';

// Function to generate consistent WBS code
function generateWbsCode(level: number, wbsId: number, projectId: number) {
  return `WBS-${level}-${wbsId}-PROJ-${projectId}`;
}

/**
 * @swagger
 * /api/projects/{id}/wbs/template/upload:
 *   post:
 *     summary: Upload WBS template Excel file
 *     description: Upload an Excel file with WBS data to create multiple WBS items
 *     tags:
 *       - WBS
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the project to upload WBS template for
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file containing WBS data
 *     responses:
 *       200:
 *         description: WBS items created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 created_wbs_items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getUserFromHeaders();
    
    if (role !== "PMO" && role !== "ADMIN" && role !== "PJM") {
      return NextResponse.json(
        { error: "Unauthorized role. Only PMO, ADMIN, or PJM can upload templates." },
        { status: 403 }
      );
    }

    const params = await context.params;
    const projectId = parseInt(params.id);
    if (!projectId) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: {
        project_id: true,
        name: true,
        project_code: true,
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer();
    
    // Process the file using the template processor
    let wbsData, processingErrors;
    try {
      const processor = new WBSTemplateProcessor(wbsTemplateConfig);
      const result = processor.processFile(buffer);
      wbsData = result.data;
      processingErrors = result.errors;
      
      // Debug logging
      console.log('Processed WBS data:', JSON.stringify(wbsData, null, 2));
      console.log('Processing errors:', JSON.stringify(processingErrors, null, 2));
      
    } catch (processingError) {
      console.error('Error processing Excel file:', processingError);
      return NextResponse.json({
        error: 'Failed to process Excel file',
        details: processingError instanceof Error ? processingError.message : 'Unknown processing error',
        errorType: 'FILE_PROCESSING_ERROR'
      }, { status: 400 });
    }

    // Security Check: Validate Existing WBS Data
    // This ensures the Excel file contains the current state of existing WBS items
    // Add a temporary bypass for debugging (remove in production)
    const url = new URL(req.url);
    const bypassSecurity = url.searchParams.get('bypassSecurity') === 'true';
    
    if (!bypassSecurity) {
      try {
        // Parse the "Existing WBS" sheet from the Excel file
        const XLSX = require('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        if (!workbook.SheetNames.includes('Existing WBS')) {
          return NextResponse.json({
            error: 'Security validation failed: Missing "Existing WBS" sheet',
            details: 'The Excel file must contain an "Existing WBS" sheet with current WBS data for security validation.',
            errorType: 'SECURITY_VALIDATION_ERROR'
          }, { status: 400 });
        }

      const existingWBSSheet = workbook.Sheets['Existing WBS'];
      const existingWBSFromFile = XLSX.utils.sheet_to_json(existingWBSSheet);

      // Filter out empty rows and header rows from the Excel data
      const filteredExistingWBS = existingWBSFromFile.filter((row: any) => {
        return row && row['WBS ID'] && row['WBS ID'] !== '' && 
               typeof row['WBS ID'] !== 'undefined' && 
               !isNaN(Number(row['WBS ID']));
      });

      console.log('Raw Excel WBS data length:', existingWBSFromFile.length);
      console.log('Filtered Excel WBS data length:', filteredExistingWBS.length);
      console.log('Raw Excel WBS data:', existingWBSFromFile);
      console.log('Filtered Excel WBS data:', filteredExistingWBS);

      // Get current WBS items from database
      const currentWBSFromDB = await prisma.wBS.findMany({
        where: { project_id: projectId },
        select: {
          wbs_id: true,
          name: true,
          wbs_code: true,
          level: true,
          parent_wbs_id: true,
          status: true,
        },
        orderBy: [
          { level: 'asc' },
          { wbs_code: 'asc' }
        ]
      });

      console.log('Database WBS data:', currentWBSFromDB);

      // Validate existing WBS data matches database
      const validationErrors = [];

      // Check if the number of existing items matches
      if (filteredExistingWBS.length !== currentWBSFromDB.length) {
        validationErrors.push({
          field: 'Existing WBS Count',
          error: `Mismatch in existing WBS count. Database has ${currentWBSFromDB.length} items, but Excel file has ${filteredExistingWBS.length} items.`
        });
      }

      // Create a map of database WBS items for efficient lookup
      const dbWBSMap = new Map(currentWBSFromDB.map(wbs => [wbs.wbs_id, wbs]));

      // Validate each existing WBS item in the file matches the database
      for (let i = 0; i < filteredExistingWBS.length; i++) {
        const fileWBS = filteredExistingWBS[i] as any;
        const wbsId = fileWBS['WBS ID'];
        
        if (!wbsId) continue; // Skip header or empty rows

        const dbWBS = dbWBSMap.get(wbsId);
        
        if (!dbWBS) {
          validationErrors.push({
            row: i + 2, // Excel row number
            field: 'WBS ID',
            error: `WBS ID ${wbsId} exists in Excel file but not in database. Please download a fresh template.`
          });
          continue;
        }

        // Validate each field matches
        const fieldsToValidate = [
          { fileField: 'WBS Code', dbValue: dbWBS.wbs_code },
          { fileField: 'WBS Name', dbValue: dbWBS.name },
          { fileField: 'Level', dbValue: dbWBS.level },
          { fileField: 'Parent WBS ID', dbValue: dbWBS.parent_wbs_id },
          { fileField: 'Status', dbValue: dbWBS.status }
        ];

        for (const field of fieldsToValidate) {
          let fileValue = (fileWBS as any)[field.fileField];
          let dbValue = field.dbValue;

          // Handle null/empty values consistently
          if ((fileValue === '' || fileValue === null || fileValue === undefined) && 
              (dbValue === null || dbValue === undefined)) {
            continue; // Both are null/empty, this is OK
          }

          // Special handling for different field types
          if (field.fileField === 'Parent WBS ID') {
            // Normalize both values: treat null, undefined, 0, and empty string as equivalent
            const normalizeParentId = (value: any) => {
              if (value === null || value === undefined || value === '' || value === 0 || value === '0') {
                return '';
              }
              return String(value).trim();
            };
            
            fileValue = normalizeParentId(fileValue);
            dbValue = normalizeParentId(dbValue);
          } else if (field.fileField === 'Level') {
            // Ensure level is compared as numbers
            fileValue = Number(fileValue);
            dbValue = Number(dbValue);
            
            if (fileValue !== dbValue) {
              validationErrors.push({
                row: i + 2,
                field: field.fileField,
                error: `Mismatch for WBS ID ${wbsId}: Excel has "${fileValue}", database has "${dbValue}". Please download a fresh template.`
              });
            }
            continue; // Skip string comparison for numbers
          } else {
            // Convert to string for comparison and normalize
            fileValue = String(fileValue === null || fileValue === undefined ? '' : fileValue).trim();
            dbValue = String(dbValue === null || dbValue === undefined ? '' : dbValue).trim();
          }

          if (fileValue !== dbValue) {
            validationErrors.push({
              row: i + 2,
              field: field.fileField,
              error: `Mismatch for WBS ID ${wbsId}: Excel has "${fileValue}", database has "${dbValue}". Please download a fresh template.`
            });
          }
        }
      }

      // Check for WBS items in database that are missing from file
      for (const dbWBS of currentWBSFromDB) {
        const existsInFile = filteredExistingWBS.some((fileWBS: any) => fileWBS['WBS ID'] === dbWBS.wbs_id);
        if (!existsInFile) {
          validationErrors.push({
            field: 'Missing WBS Item',
            error: `WBS ID ${dbWBS.wbs_id} "${dbWBS.name}" exists in database but is missing from Excel file. Please download a fresh template.`
          });
        }
      }

      // If there are validation errors, return them
      if (validationErrors.length > 0) {
        return NextResponse.json({
          error: 'Security validation failed: Existing WBS data mismatch',
          details: 'The existing WBS data in your Excel file does not match the current database state. This could indicate the template is outdated or has been modified.',
          message: `Found ${validationErrors.length} mismatch(es) in existing WBS data:\n\n${validationErrors.map(err => `• ${err.field}: ${err.error}`).join('\n')}\n\nPlease download a fresh template with the latest WBS data and try again.`,
          validationErrors,
          errorType: 'SECURITY_VALIDATION_ERROR',
          debugInfo: {
            rawFileLength: existingWBSFromFile.length,
            filteredFileLength: filteredExistingWBS.length,
            dbLength: currentWBSFromDB.length,
            validationErrorCount: validationErrors.length,
            fileData: filteredExistingWBS,
            dbData: currentWBSFromDB
          },
          recommendation: 'Download a fresh WBS template to ensure you have the latest existing WBS data, then transfer your new WBS items to the fresh template.'
        }, { status: 400 });
      }

        console.log('Security validation passed: Existing WBS data matches database');

      } catch (securityError) {
        console.error('Error during security validation:', securityError);
        return NextResponse.json({
          error: 'Security validation failed',
          details: securityError instanceof Error ? securityError.message : 'Unknown security validation error',
          errorType: 'SECURITY_VALIDATION_ERROR'
        }, { status: 400 });
      }
    } else {
      console.log('Security validation bypassed for debugging');
    }

    const createdWBSItems = [];
    const errors = [...processingErrors];

    // Get existing WBS items for parent validation
    const existingWBS = await prisma.wBS.findMany({
      where: { project_id: projectId },
      select: {
        wbs_id: true,
        level: true,
        name: true,
      }
    });

    console.log('Existing WBS items in project:', existingWBS);

    // Create a map of existing WBS IDs for quick lookup
    const existingWBSMap = new Map(existingWBS.map(wbs => [wbs.wbs_id, wbs.level]));

    // Separate items by creation strategy
    const itemsWithExistingParents = [];
    const itemsWithNewParents = [];

    // Pre-validate and categorize items
    for (let i = 0; i < wbsData.length; i++) {
      const wbsItem = wbsData[i];
      const rowNumber = i + 2; // Excel row number (accounting for header)

      // Validate that both parent fields are not used together
      if (wbsItem.parent_wbs_id && wbsItem.parent_row_reference) {
        errors.push({
          row: rowNumber,
          field: 'Parent Reference',
          error: 'Cannot use both Parent WBS ID and Parent Row Reference. Use only one.'
        });
        continue;
      }

      // Validate that at least one parent field is provided (no root WBS allowed)
      if (!wbsItem.parent_wbs_id && !wbsItem.parent_row_reference) {
        errors.push({
          row: rowNumber,
          field: 'Parent Reference',
          error: 'Every WBS item must have a parent. Use either Parent WBS ID or Parent Row Reference. Root level WBS creation is not allowed.'
        });
        continue;
      }

      // Validate level is not 0 (no root level allowed)
      if (wbsItem.level === 0) {
        errors.push({
          row: rowNumber,
          field: 'Level',
          error: 'Level 0 (root level) is not allowed. Minimum level is 1.'
        });
        continue;
      }

      if (wbsItem.parent_wbs_id) {
        // Validate existing parent WBS ID
        if (!existingWBSMap.has(parseInt(wbsItem.parent_wbs_id))) {
          const existingIds = existingWBS.length > 0 
            ? `Available WBS IDs: ${existingWBS.map(wbs => wbs.wbs_id).join(', ')}`
            : 'No existing WBS items found in this project';
          
          errors.push({
            row: rowNumber,
            field: 'Parent WBS ID',
            error: `Parent WBS ID ${wbsItem.parent_wbs_id} does not exist in this project. ${existingIds}. Either use an existing WBS ID or remove this reference and use Parent Row Reference instead.`
          });
          continue;
        }

        // Validate level consistency with existing parent
        const parentLevel = existingWBSMap.get(parseInt(wbsItem.parent_wbs_id));
        if (parentLevel && wbsItem.level !== parentLevel + 1) {
          errors.push({
            row: rowNumber,
            field: 'Level',
            error: `Level ${wbsItem.level} is not consistent with parent level ${parentLevel}. Child level should be ${parentLevel + 1}`
          });
          continue;
        }

        itemsWithExistingParents.push({ ...wbsItem, originalRowIndex: i, rowNumber });
      } else if (wbsItem.parent_row_reference) {
        // Validate row reference is within bounds
        const parentRowIndex = parseInt(wbsItem.parent_row_reference) - 2; // Convert to 0-based index
        if (parentRowIndex < 0 || parentRowIndex >= wbsData.length) {
          errors.push({
            row: rowNumber,
            field: 'Parent Row Reference',
            error: `Parent Row Reference ${wbsItem.parent_row_reference} is out of range. Must be between 2 and ${wbsData.length + 1}`
          });
          continue;
        }

        // Validate parent row comes before current row
        if (parentRowIndex >= i) {
          errors.push({
            row: rowNumber,
            field: 'Parent Row Reference',
            error: `Parent Row Reference ${wbsItem.parent_row_reference} must reference a row that comes before this one`
          });
          continue;
        }

        // Validate level consistency with referenced parent
        const parentItem = wbsData[parentRowIndex];
        if (parentItem && wbsItem.level !== parentItem.level + 1) {
          errors.push({
            row: rowNumber,
            field: 'Level',
            error: `Level ${wbsItem.level} is not consistent with parent level ${parentItem.level}. Child level should be ${parentItem.level + 1}`
          });
          continue;
        }

        itemsWithNewParents.push({ 
          ...wbsItem, 
          originalRowIndex: i, 
          rowNumber, 
          parentRowIndex 
        });
      }
    }

    // If there are validation errors, return early
    if (errors.length > 0) {
      // Add helpful context about existing WBS items if parent ID errors exist
      const hasParentIdErrors = errors.some(error => error.field === 'Parent WBS ID');
      let additionalInfo = '';
      
      if (hasParentIdErrors) {
        if (existingWBS.length === 0) {
          additionalInfo = `\n\nYour project currently has no existing WBS items. You have two options:\n1. Remove all parent WBS ID references and use parent row references instead\n2. Create root WBS items manually first, then reference them in your upload`;
        } else {
          const existingIds = existingWBS.map(wbs => `ID ${wbs.wbs_id}: "${wbs.name}" (Level ${wbs.level})`).join('\n  ');
          additionalInfo = `\n\nExisting WBS items in your project:\n  ${existingIds}\n\nPlease use one of these existing IDs as parent references, or use parent row references instead.`;
        }
      }
      
      return NextResponse.json({
        message: 'Validation errors found' + additionalInfo,
        created_wbs_items: [],
        errors,
        errorType: 'VALIDATION_ERROR',
        existingWBSItems: existingWBS,
        summary: {
          total_processed: wbsData.length,
          successful: 0,
          failed: errors.length
        }
      }, { status: 400 });
    }

    // Track created items by their original row index for parent reference resolution
    const createdItemsByRowIndex = new Map();

    // Phase 1: Create items with existing parents first
    const itemsToCreateFirst = [...itemsWithExistingParents];
    
    for (const wbsItem of itemsToCreateFirst) {
      try {
        // Use database transaction for creating WBS item
        const createdWBS = await prisma.$transaction(async (tx) => {
          // Create the WBS item
          const newWBS = await tx.wBS.create({
            data: {
              project_id: projectId,
              parent_wbs_id: wbsItem.parent_wbs_id ? parseInt(wbsItem.parent_wbs_id) : null,
              name: wbsItem.name,
              description: wbsItem.description || '',
              level: wbsItem.level,
              start_date: new Date(wbsItem.start_date),
              end_date: new Date(wbsItem.end_date),
              progress_percentage: 0,
              status: wbsItem.status || 'not_started',
              wbs_code: '', // Will be updated after creation
            }
          });

          // Generate and update WBS code
          const wbsCode = generateWbsCode(wbsItem.level, newWBS.wbs_id, projectId);
          await tx.wBS.update({
            where: { wbs_id: newWBS.wbs_id },
            data: { wbs_code: wbsCode }
          });

          return { ...newWBS, wbs_code: wbsCode };
        });

        // Track this created item for parent reference resolution
        createdItemsByRowIndex.set(wbsItem.originalRowIndex, createdWBS);

        // Add to existing WBS map for subsequent parent validation
        existingWBSMap.set(createdWBS.wbs_id, createdWBS.level);

        createdWBSItems.push({
          wbs_id: createdWBS.wbs_id,
          name: createdWBS.name,
          wbs_code: createdWBS.wbs_code,
          level: createdWBS.level,
          parent_wbs_id: createdWBS.parent_wbs_id,
          status: createdWBS.status
        });

      } catch (error) {
        console.error(`Error creating WBS item at row ${wbsItem.rowNumber}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          row: wbsItem.rowNumber,
          field: 'General',
          error: `Failed to create WBS item: ${errorMessage}`
        });
      }
    }

    // Phase 2: Create items with new parent references
    // Sort by level to ensure parents are created before children
    itemsWithNewParents.sort((a, b) => a.level - b.level);

    for (const wbsItem of itemsWithNewParents) {
      try {
        // Get the parent WBS ID from the created items
        const parentWBS = createdItemsByRowIndex.get(wbsItem.parentRowIndex);
        if (!parentWBS) {
          errors.push({
            row: wbsItem.rowNumber,
            field: 'Parent Row Reference',
            error: `Parent row ${wbsItem.parent_row_reference} was not successfully created`
          });
          continue;
        }

        // Use database transaction for creating WBS item
        const createdWBS = await prisma.$transaction(async (tx) => {
          // Create the WBS item
          const newWBS = await tx.wBS.create({
            data: {
              project_id: projectId,
              parent_wbs_id: parentWBS.wbs_id,
              name: wbsItem.name,
              description: wbsItem.description || '',
              level: wbsItem.level,
              start_date: new Date(wbsItem.start_date),
              end_date: new Date(wbsItem.end_date),
              progress_percentage: 0,
              status: wbsItem.status || 'not_started',
              wbs_code: '', // Will be updated after creation
            }
          });

          // Generate and update WBS code
          const wbsCode = generateWbsCode(wbsItem.level, newWBS.wbs_id, projectId);
          await tx.wBS.update({
            where: { wbs_id: newWBS.wbs_id },
            data: { wbs_code: wbsCode }
          });

          return { ...newWBS, wbs_code: wbsCode };
        });

        // Track this created item for potential further references
        createdItemsByRowIndex.set(wbsItem.originalRowIndex, createdWBS);

        // Add to existing WBS map
        existingWBSMap.set(createdWBS.wbs_id, createdWBS.level);

        createdWBSItems.push({
          wbs_id: createdWBS.wbs_id,
          name: createdWBS.name,
          wbs_code: createdWBS.wbs_code,
          level: createdWBS.level,
          parent_wbs_id: createdWBS.parent_wbs_id,
          status: createdWBS.status
        });

      } catch (error) {
        console.error(`Error creating WBS item at row ${wbsItem.rowNumber}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          row: wbsItem.rowNumber,
          field: 'General',
          error: `Failed to create WBS item: ${errorMessage}`
        });
      }
    }

    // Recalculate project progress if WBS items were created
    if (createdWBSItems.length > 0) {
      try {
        // Update project progress based on WBS items
        const allWBS = await prisma.wBS.findMany({
          where: { project_id: projectId },
          select: { progress_percentage: true }
        });

        if (allWBS.length > 0) {
          const totalProgress = allWBS.reduce((sum, wbs) => sum + wbs.progress_percentage, 0);
          const averageProgress = totalProgress / allWBS.length;

          await prisma.project.update({
            where: { project_id: projectId },
            data: { progress_percentage: Math.round(averageProgress * 100) / 100 }
          });
        }
      } catch (error) {
        console.error('Error updating project progress:', error);
      }
    }

    const response = {
      message: `${createdWBSItems.length} WBS items created successfully`,
      created_wbs_items: createdWBSItems,
      errors: errors,
      summary: {
        total_processed: wbsData.length,
        successful: createdWBSItems.length,
        failed: errors.length
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error processing WBS template upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json({
      error: 'Failed to process WBS template upload',
      details: errorMessage,
      errorType: 'SYSTEM_ERROR',
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  }
}
