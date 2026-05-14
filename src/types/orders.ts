export interface OrderLine {
  id: string;
  lineNumber: string | null;
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
  program?: string;
  status: "pending" | "processing" | "completed" | "error" | "warning";
  statusLabel?: string;
  orderNumberLabel?: string;
  invoiceNumberLabel?: string;
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
  proofOfDeliveryUrl?: string;
  unimplemented?: boolean;
  hideLines?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  fileName: string | null;
  customerName: string;
  creationDate: string | null;
  orderDate: string;
  currentStatus: string;

  steps: InterfaceStep[];
  // SSP Order fields from database
  processFlag: string | null;
  consigneeCode: string | null;
  consigneeReference: string | null;
  mark: string | null;
  sspInvoiceType: string | null;
  lineCount: number;
}
