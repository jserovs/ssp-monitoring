import { NextResponse } from "next/server";
import { createOrderFlowRepository } from "../../../server/order-flow";
import { getGviPool, getGomPool } from "../../../server/order-flow/oracleConnection";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const customerOrderReference = url.searchParams.get("customerOrderReference")?.trim();
    const fileName = url.searchParams.get("fileName")?.trim();

    if (customerOrderReference || fileName) {
      if (!customerOrderReference || !fileName) {
        return NextResponse.json(
          {
            error: "customerOrderReference and fileName are required together",
          },
          { status: 400 }
        );
      }

      const gviPool = await getGviPool();
      const gomPool = await getGomPool();

      const repository = await createOrderFlowRepository({
        gviPool,
        gomPool,
      });

      const orderTrackingKey = {
        customer_order_reference_nbr: customerOrderReference,
        file_name: fileName,
      };

      const [orderDetails, journey, lines] = await Promise.all([
        repository.getOrderDetails(orderTrackingKey),
        repository.getJourney(orderTrackingKey),
        repository.getOrderLines(orderTrackingKey),
      ]);

      return NextResponse.json({
        trackingKey: customerOrderReference,
        fileName,
        orderDetails,
        journey,
        lines,
      });
    }

    const limit = parsePositiveInt(url.searchParams.get("limit"), 50);
    const offset = parseNonNegativeInt(url.searchParams.get("offset"), 0);
    const query = (url.searchParams.get("query") || "").trim();

    const gviPool = await getGviPool();
    const gomPool = await getGomPool();

    const repository = await createOrderFlowRepository({
      gviPool,
      gomPool,
    });

    const [orders, total] = await Promise.all([
      repository.getAllOrders({
        limit,
        offset,
        query: query || undefined,
      }),
      repository.getAllOrdersCount(query || undefined),
    ]);

    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      data: orders,
      paging: {
        limit,
        offset,
        returned: orders.length,
        total,
        page,
        totalPages,
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
