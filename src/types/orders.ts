export interface OrderLine {
  id: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  status: "pending" | "processing" | "completed" | "error";
  errorMessage?: string;
  lastUpdated: string;
}

export interface InterfaceStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "processing" | "completed" | "error" | "warning";
  startTime?: string;
  endTime?: string;
  duration?: string;
  lines: OrderLine[];
  metadata: {
    processedLines: number;
    totalLines: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  fileName: string | null;
  customerName: string;
  customerEmail: string;
  creationDate: string | null;
  orderDate: string;
  totalAmount: number;
  currentStatus: string;
  priority: "low" | "medium" | "high";

  steps: InterfaceStep[];
  // SSP Order fields from database
  processFlag: string | null;
  consigneeCode: string | null;
  consigneeReference: string | null;
  mark: string | null;
  sspInvoiceType: string | null;
  lineCount: number;
}
