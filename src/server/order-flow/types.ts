export type JourneyStatus = "Completed" | "In Progress" | "Error" | "Not Reached";

export type JourneySource = "GVI" | "GOM" | "FILE" | "SOA";

export interface JourneyStep {
  step: string;
  status: JourneyStatus;
  eventTime: string | null;
  sourceDb: JourneySource;
  lineCount: number | null;
  errorCode: string | null;
  payload: Record<string, unknown>;
  unimplemented?: boolean;
  hideLines?: boolean;
}

export interface OrderLine {
  stage: string;
  program: string | null;
  line_number: string | null;
  process_flag: string | null;
  error_code: string | null;
  item_code: string | null;
  requested_quantity: number | null;
  last_update_date: string | null;
}

export interface SearchOrderResult {
  customer_order_reference_nbr: string;
  file_name: string | null;
  last_update_date: string | null;
}

export interface GetAllOrdersOptions {
  limit?: number;
  offset?: number;
  query?: string;
}

export interface OrderListItem {
  customer_order_reference_nbr: string;
  file_name: string | null;
  creation_date: string | null;
  last_update_date: string | null;
  line_count: number;
  status: JourneyStatus;
  // SSP Order fields
  process_flag: string | null;
  consignee_code: string | null;
  consignee_reference: string | null;
  mark: string | null;
  ssp_invoice_type: string | null;
  customer_name: string | null;
}

export interface OrderDetails {
  customer_order_reference_nbr: string;
  file_name: string | null;
  creation_date: string | null;
  last_update_date: string | null;
  line_count: number;
  // SSP Order fields
  consignee_code: string | null;
  consignee_reference: string | null;
  mark: string | null;
  ssp_invoice_type: string | null;
  customer_name: string | null;
}

export interface OrderFlowRepository {
  getAllOrders(options?: GetAllOrdersOptions): Promise<OrderListItem[]>;
  getOrderDetails(trackingKey: string): Promise<OrderDetails | null>;
  getJourney(trackingKey: string): Promise<JourneyStep[]>;
  getOrderLines(trackingKey: string): Promise<OrderLine[]>;
  searchOrders(query: string): Promise<SearchOrderResult[]>;
}
