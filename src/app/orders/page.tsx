import { OrderList } from "@/components/OrderList";
import { Order } from "@/types/orders";
import { OrderListItem, JourneyStatus } from "@/server/order-flow";

interface OrdersApiResponse {
  data?: OrderListItem[];
  paging?: {
    limit: number;
    offset: number;
    returned: number;
    total: number;
    page: number;
    totalPages: number;
  };
}

interface GetOrdersResult {
  orders: Order[];
  returned: number;
  total: number;
  page: number;
  totalPages: number;
}

async function getOrders(options: { query?: string; limit: number; offset: number }): Promise<GetOrdersResult> {
  try {
    const params = new URLSearchParams({
      limit: String(options.limit),
      offset: String(options.offset),
    });
    if (options.query) {
      params.set("query", options.query);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/orders?${params.toString()}`,
      {
        cache: "no-store",
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch orders");
    }
    
    const data = (await response.json()) as OrdersApiResponse;
    const items: OrderListItem[] = data.data || [];
    
    // Transform API data to match Order type
    const orders = items.map((item): Order => ({
      id: `${item.customer_order_reference_nbr}-${item.file_name}`,
      orderNumber: item.customer_order_reference_nbr,
      fileName: item.file_name,
      customerName: item.customer_name ?? "-",
      creationDate: item.creation_date,
      orderDate: item.last_update_date || new Date().toISOString(),
      currentStatus: getStatusText(item.status),
      steps: [],
      processFlag: item.process_flag,
      consigneeCode: item.consignee_code,
      consigneeReference: item.consignee_reference,
      mark: item.mark,
      sspInvoiceType: item.ssp_invoice_type,
      lineCount: item.line_count,
    }));

    return {
      orders,
      returned: data.paging?.returned ?? orders.length,
      total: data.paging?.total ?? orders.length,
      page: data.paging?.page ?? 1,
      totalPages: data.paging?.totalPages ?? 1,
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      orders: [],
      returned: 0,
      total: 0,
      page: 1,
      totalPages: 1,
    };
  }
}

function getStatusText(status: JourneyStatus): string {
  switch (status) {
    case "Completed":
      return "Completed";
    case "In Progress":
      return "Processing";
    case "Error":
      return "Error";
    case "Not Reached":
      return "Pending";
    default:
      return "Unknown";
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
    pageSize?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = parsePositiveInt(resolvedSearchParams.page, 1);
  const pageSize = parsePositiveInt(resolvedSearchParams.pageSize, 50);
  const query = resolvedSearchParams.query?.trim() || undefined;
  const offset = (page - 1) * pageSize;

  const { orders, total, totalPages } = await getOrders({
    query,
    limit: pageSize,
    offset,
  });

  return (
    <OrderList
      orders={orders}
      initialQuery={query || ""}
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={totalPages}
    />
  );
}
