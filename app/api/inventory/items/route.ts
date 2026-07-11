import { NextRequest, NextResponse } from "next/server";

const INVENTORY_API_URL = process.env.INVENTORY_API_URL;
const INVENTORY_API_KEY = process.env.INVENTORY_API_KEY;

/**
 * GET /api/inventory/items
 * Proxies to Inventory API with API key. Query params: page, limit, status, search, stockType, categoryId.
 */
export async function GET(req: NextRequest) {
  if (!INVENTORY_API_URL || !INVENTORY_API_KEY) {
    return NextResponse.json(
      { success: false, error: "Inventory API not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  // Defaults for Resource Center: active items, reasonable page size
  params.set("status", searchParams.get("status") ?? "ACTIVE");
  params.set("limit", searchParams.get("limit") ?? "500");
  const page = searchParams.get("page");
  if (page) params.set("page", page);
  const search = searchParams.get("search");
  if (search) params.set("search", search);
  const stockType = searchParams.get("stockType");
  if (stockType) params.set("stockType", stockType);
  const categoryId = searchParams.get("categoryId");
  if (categoryId) params.set("categoryId", categoryId);

  const url = `${INVENTORY_API_URL.replace(/\/$/, "")}/items?${params.toString()}`;
  // Log outgoing URL only (no API key) for debugging 404 / "Application not found"
  console.log("[Inventory proxy] GET", url);

  try {
    const res = await fetch(url, {
      headers: {
        "X-API-Key": INVENTORY_API_KEY,
        "Content-Type": "application/json",
      },
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const body = data as Record<string, unknown> | null;

    if (!res.ok) {
      const message =
        (body?.error as string) ??
        (body?.message as string) ??
        (typeof body?.details === "string" ? body.details : null) ??
        `Inventory API returned ${res.status}`;
      return NextResponse.json(
        { success: false, error: message, status: res.status },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Inventory items proxy error:", err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch inventory items: ${message}` },
      { status: 502 }
    );
  }
}
