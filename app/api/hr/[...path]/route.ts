/**
 * Proxy to HR API – avoids CORS by calling HR from the server (same pattern as auth callback).
 * GET /api/hr/organization/units?type=department
 * GET /api/hr/employees
 * GET /api/hr/employees/:id
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const HR_URL = (process.env.NEXT_PUBLIC_HR_URL || "").trim();

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = request.cookies.get("auth-token");
  return cookie?.value ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!HR_URL) {
    return NextResponse.json(
      { error: "HR URL not configured" },
      { status: 500 }
    );
  }

  const token = getToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { path } = await params;
  const pathStr = path?.length ? path.join("/") : "";
  const url = `${HR_URL.replace(/\/$/, "")}/${pathStr}`;
  const search = request.nextUrl.searchParams.toString();
  const fullUrl = search ? `${url}?${search}` : url;

  try {
    const res = await axios.get(fullUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    return NextResponse.json(res.data);
  } catch (err: any) {
    const status = err.response?.status ?? 500;
    const data = err.response?.data;
    return NextResponse.json(data ?? { error: "HR request failed" }, {
      status,
    });
  }
}
