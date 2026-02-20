import { notFound } from "next/navigation";
import { OrderTracking } from "@/components/OrderTracking";
import { type InterfaceStep, type Order, type OrderLine } from "@/types/orders";
import { type JourneyStatus, type JourneyStep, type OrderLine as FlowOrderLine, type OrderDetails } from "@/server/order-flow";

interface ApiOrderDetails {
  trackingKey: string;
  orderDetails: OrderDetails | null;
  journey: JourneyStep[];
  lines: FlowOrderLine[];
}

async function getOrder(trackingKey: string): Promise<Order | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/orders/${trackingKey}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch order");
    }

    const data = (await response.json()) as ApiOrderDetails;
    return mapOrderResponse(data);
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

function mapOrderResponse(data: ApiOrderDetails): Order {
  const steps = data.journey.map((step) => mapJourneyStep(step, data.lines));
  const details = data.orderDetails;

  const orderDate =
    data.journey.find((step) => step.eventTime)?.eventTime ||
    data.lines.find((line) => line.last_update_date)?.last_update_date ||
    new Date().toISOString();

  return {
    id: data.trackingKey,
    orderNumber: data.trackingKey,
    fileName: details?.file_name ?? null,
    customerName: details?.customer_name ?? "-",
    creationDate: details?.creation_date ?? orderDate,
    orderDate,
    currentStatus: mapStatus(
      data.journey.find((step) => step.status === "Error")?.status ||
        data.journey.find((step) => step.status === "In Progress")?.status ||
        data.journey.find((step) => step.status === "Completed")?.status ||
        "Not Reached"
    ),
    steps,
    processFlag: null,
    consigneeCode: details?.consignee_code ?? null,
    consigneeReference: details?.consignee_reference ?? null,
    mark: details?.mark ?? null,
    sspInvoiceType: details?.ssp_invoice_type ?? null,
    lineCount: details?.line_count ?? data.lines.length,
  };
}

function mapJourneyStep(step: JourneyStep, allLines: FlowOrderLine[]): InterfaceStep {
  const stepKey = step.payload?.stepKey as string | undefined;
  const program = step.payload?.program as string | undefined;
  const isInternalStep = stepKey === "gvi_internal_inbound" || stepKey === "gvi_internal_outbound";

  let stepLines: FlowOrderLine[] = [];
  if (isInternalStep && program) {
    const directionFilter = stepKey === "gvi_internal_outbound" ? "OUTBOUND" : null;
    // Program-specific internal step (after split): filter by program + direction
    stepLines = allLines.filter(
      (line) =>
        line.stage === "GVI_INTERNAL" &&
        line.program === program &&
        (directionFilter === null ? line.direction === null : line.direction === directionFilter)
    );
  } else if (isInternalStep) {
    const directionFilter = stepKey === "gvi_internal_outbound" ? "OUTBOUND" : null;
    // Regular internal step (before split or no split): filter by direction
    stepLines = allLines.filter(
      (line) =>
        line.stage === "GVI_INTERNAL" &&
        (directionFilter === null ? line.direction === null : line.direction === directionFilter)
    );
  } else if (stepKey === "gvi_filewheel_ssp") {
    stepLines = allLines.filter((line) => line.stage === "GVI_FILEWHEEL" && line.program === "SSP");
  } else if (stepKey === "gvi_filewheel_normal" && program) {
    // Program-specific filewheel step (after split)
    stepLines = allLines.filter((line) => line.stage === "GVI_FILEWHEEL" && line.program === program);
  } else if (stepKey === "gvi_filewheel_normal") {
    // Regular filewheel step (before split or no split)
    stepLines = allLines.filter((line) => line.stage === "GVI_FILEWHEEL" && line.program !== "SSP");
  }
  
  const lines = stepLines.map((line, index) => mapOrderLine(line, index));

  return {
    id: step.payload?.program 
      ? `${step.payload?.stepKey}-${step.payload.program}` 
      : String(step.payload?.stepKey || step.step),
    name: step.step,
    description: `${step.sourceDb} processing step`,
    status: mapStatus(step.status),
    startTime: step.eventTime || undefined,
    endTime: step.eventTime || undefined,
    duration: undefined,
    lines,
    metadata: {
      processedLines: step.status === "Not Reached" ? 0 : (step.lineCount ?? 0),
      totalLines: step.lineCount ?? 0,
      errorCount: step.status === "Error" ? 1 : 0,
      warningCount: 0,
    },
    proofOfDeliveryUrl: getPayloadString(step.payload, "documentUrl"),
    unimplemented: step.unimplemented,
    hideLines: step.hideLines,
  };
}

function getPayloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mapOrderLine(line: FlowOrderLine, index: number): OrderLine {
  return {
    id: `${line.stage}-${line.line_number || "unknown"}-${index}`,
    itemName: line.item_code || "Unknown item",
    itemCode: line.item_code || "-",
    quantity: line.requested_quantity || 0,
    status: mapLineStatus(line.process_flag),
    errorMessage: line.error_code ? `Error code: ${line.error_code}` : undefined,
    lastUpdated: line.last_update_date || "-",
  };
}

function mapStatus(status: JourneyStatus): InterfaceStep["status"] {
  switch (status) {
    case "Completed":
      return "completed";
    case "In Progress":
      return "processing";
    case "Error":
      return "error";
    default:
      return "pending";
  }
}

function mapLineStatus(processFlag: string | null): OrderLine["status"] {
  const flag = (processFlag || "").toUpperCase();

  if (flag.startsWith("E")) {
    return "error";
  }
  if (flag === "P") {
    return "completed";
  }
  if (flag === "X") {
    return "processing";
  }
  return "pending";
}

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    notFound();
  }

  return <OrderTracking order={order} />;
}
