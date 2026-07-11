import { NextRequest, NextResponse } from 'next/server';

function getDbConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const match = url.match(/postgresql:\/\/(.*):(.*)@(.*):(\d+)\/(.*)/);
  if (!match) throw new Error('DATABASE_URL format invalid');
  return {
    databaseEngine: 'postgresql',
    host: match[3],
    port: parseInt(match[4]),
    databaseName: match[5].split('?')[0],
    username: match[1],
    password: match[2],
  };
}

export async function POST(req: NextRequest) {
  const { 
    tableName, 
    selectedColumns, 
    whereClause, 
    format, 
    relatedTables = [], 
    relatedTableColumns = {} 
  } = await req.json();
  
  if (!tableName || !selectedColumns) {
    return NextResponse.json({ error: 'Missing tableName or selectedColumns' }, { status: 400 });
  }
  
  const dbConn = getDbConnection();
  const reportingUrl = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';
  
  // Check if we have related tables
  const hasRelatedTables = relatedTables && relatedTables.length > 0;
  
  let endpoint;
  let requestBody;
  
  if (hasRelatedTables) {
    // Use relational endpoint
    endpoint = format === 'excel'
      ? '/api/v1/reports/generate-relational-excel-with-columns'
      : '/api/v1/reports/generate-relational-with-columns';
    
    requestBody = {
      connectionDto: dbConn,
      primaryTable: tableName,
      relatedTables: relatedTables,
      primaryTableColumns: selectedColumns,
      relatedTableColumns: relatedTableColumns,
      whereClause: whereClause || null
    };
  } else {
    // Use single table endpoint
    endpoint = format === 'excel'
      ? '/api/v1/reports/generate-excel-with-columns'
      : '/api/v1/reports/generate-with-columns';
    
    requestBody = {
      connectionDto: dbConn,
      tableName,
      selectedColumns,
      whereClause: whereClause || null
    };
  }
  
  try {
    const res = await fetch(`${reportingUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('External API error:', errorText);
      return NextResponse.json({ 
        error: 'External reporting engine error', 
        details: errorText 
      }, { status: res.status });
    }
    
    const fileBuffer = await res.arrayBuffer();
    const contentType = format === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';
      
    return new NextResponse(Buffer.from(fileBuffer), {
      status: res.status === 204 ? 200 : res.status,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=report.${format === 'excel' ? 'xlsx' : 'pdf'}`,
      },
    });
  } catch (error) {
    console.error('Error calling external API:', error);
    return NextResponse.json({ 
      error: 'Failed to generate report', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
