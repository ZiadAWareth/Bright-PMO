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
  const dbConn = getDbConnection();
  const reportingUrl = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';
  const res = await fetch(`${reportingUrl}/api/v1/reports/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dbConn),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
