import { OrderList } from "@/components/OrderList";
import { Order } from "@/types/orders";
import { OrderListItem, JourneyStatus } from "@/server/order-flow";

async function getOrders(): Promise<Order[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/orders`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    
    const data = await response.json();
    const items: OrderListItem[] = data.data || [];
    
    // Transform API data to match Order type
    return items.map((item): Order => ({
      id: `${item.customer_order_reference_nbr}-${item.file_name}`,
      orderNumber: item.customer_order_reference_nbr,
      fileName: item.file_name,
      customerName: "",
      customerEmail: "",
      creationDate: item.creation_date,
      orderDate: item.last_update_date || new Date().toISOString(),
      totalAmount: 0,
      currentStatus: getStatusText(item.status),
      priority: getPriority(item.status),
      steps: [],
      processFlag: item.process_flag,
      consigneeCode: item.consignee_code,
      consigneeReference: item.consignee_reference,
      mark: item.mark,
      sspInvoiceType: item.ssp_invoice_type,
      lineCount: item.line_count,
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
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

function getPriority(status: JourneyStatus): "low" | "medium" | "high" {
  switch (status) {
    case "Error":
      return "high";
    case "Completed":
      return "low";
    default:
      return "medium";
  }
}

export default async function OrdersPage() {
  const orders = await getOrders();

  return <OrderList orders={orders} />;
}
