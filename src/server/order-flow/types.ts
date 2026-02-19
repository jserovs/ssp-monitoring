export type JourneyStatus = "Completed" | "In Progress" | "Error" | "Not Reached";

export type JourneySource = "GVI" | "GOM" | "FILE" | "SOA";

export interface JourneyStep {
  step: string;
  status: JourneyStatus;
  eventTime: string | null;
  sourceDb: JourneySource;
  lineCount: number;
  errorCode: string | null;
  payload: Record<string, unknown>;
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

export interface OrderFlowRepository {
  getJourney(trackingKey: string): Promise<JourneyStep[]>;
  getOrderLines(trackingKey: string): Promise<OrderLine[]>;
  searchOrders(query: string): Promise<SearchOrderResult[]>;
}
