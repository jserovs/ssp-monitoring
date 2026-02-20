import { notFound } from "next/navigation";
import { OrderTracking } from "@/components/OrderTracking";
import { type InterfaceStep, type Order, type OrderLine } from "@/types/orders";
import { type JourneyStatus, type JourneyStep, type OrderLine as FlowOrderLine } from "@/server/order-flow";

interface ApiOrderDetails {
  trackingKey: string;
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

  const orderDate =
    data.journey.find((step) => step.eventTime)?.eventTime ||
    data.lines.find((line) => line.last_update_date)?.last_update_date ||
    new Date().toISOString();

  return {
    id: data.trackingKey,
    orderNumber: data.trackingKey,
    fileName: null,
    customerName: "-",
    creationDate: orderDate,
    orderDate,
    currentStatus: mapStatus(
      data.journey.find((step) => step.status === "Error")?.status ||
        data.journey.find((step) => step.status === "In Progress")?.status ||
        data.journey.find((step) => step.status === "Completed")?.status ||
        "Not Reached"
    ),
    steps,
    processFlag: null,
    consigneeCode: null,
    consigneeReference: null,
    mark: null,
    sspInvoiceType: null,
    lineCount: data.lines.length,
  };
}

function mapJourneyStep(step: JourneyStep, allLines: FlowOrderLine[]): InterfaceStep {
  const isInternalStep = 
    step.payload?.stepKey === "gvi_internal_inbound" || 
    step.payload?.stepKey === "gvi_internal_outbound";
  const isFilewheelStep = 
    step.payload?.stepKey === "gvi_filewheel_ssp" || 
    step.payload?.stepKey === "gvi_filewheel_normal";

  let stepLines: FlowOrderLine[] = [];
  if (isInternalStep) {
    stepLines = allLines.filter((line) => line.stage === "GVI_INTERNAL");
  } else if (isFilewheelStep) {
    stepLines = allLines.filter((line) => line.stage === "GVI_FILEWHEEL");
  }
  
  const lines = stepLines.map(mapOrderLine);

  return {
    id: String(step.payload?.stepKey || step.step),
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
  };
}

function getPayloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mapOrderLine(line: FlowOrderLine): OrderLine {
  return {
    id: `${line.stage}-${line.line_number || "unknown"}`,
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
