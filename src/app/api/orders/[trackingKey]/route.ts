import { NextResponse } from "next/server";
import { createOrderFlowRepository } from "../../../../server/order-flow";
import { getGviPool, getGomPool } from "../../../../server/order-flow/oracleConnection";

interface RouteContext {
  params: Promise<{
    trackingKey: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const trackingKey = params.trackingKey?.trim();
  if (!trackingKey) {
    return NextResponse.json({ error: "trackingKey is required" }, { status: 400 });
  }

  try {
    const gviPool = await getGviPool();
    const gomPool = await getGomPool();

    const repository = await createOrderFlowRepository({
      gviPool,
      gomPool,
    });

    const [journey, lines] = await Promise.all([
      repository.getJourney(trackingKey),
      repository.getOrderLines(trackingKey),
    ]);

    return NextResponse.json({
      trackingKey,
      journey,
      lines,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch order details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
