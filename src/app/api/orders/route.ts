import { NextResponse } from "next/server";
import { createOrderFlowRepository } from "../../../server/order-flow";
import { getGviPool, getGomPool } from "../../../server/order-flow/oracleConnection";

export async function GET(request: Request) {
  try {
    //DEBUG
    console.log("Request to get ALL:", request.url);
    const url = new URL(request.url);
    const limit = parsePositiveInt(url.searchParams.get("limit"), 50);
    const offset = parseNonNegativeInt(url.searchParams.get("offset"), 0);
    const query = (url.searchParams.get("query") || "").trim();
    //DEBUG
    console.log("Fetching orders:", {
      limit,
      offset,
      query,
    });

    const gviPool = await getGviPool();
    const gomPool = await getGomPool();



    const repository = await createOrderFlowRepository({
      gviPool,
      gomPool,
    });

    const orders = await repository.getAllOrders({
      limit,
      offset,
      query: query || undefined,
    });

    return NextResponse.json({
      data: orders,
      paging: {
        limit,
        offset,
        returned: orders.length,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return n;
}

function parseNonNegativeInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return n;
}
