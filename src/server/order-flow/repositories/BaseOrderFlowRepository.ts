import type {
  OrderFlowRepository,
  JourneyStep,
  OrderLine,
  SearchOrderResult,
  GetAllOrdersOptions,
  OrderTrackingKey,
  OrderListItem,
  OrderDetails,
} from "../types";

export abstract class BaseOrderFlowRepository implements OrderFlowRepository {
  abstract getAllOrders(options?: GetAllOrdersOptions): Promise<OrderListItem[]>;

  abstract getOrderDetails(trackingKey: OrderTrackingKey): Promise<OrderDetails | null>;

  abstract getJourney(trackingKey: OrderTrackingKey): Promise<JourneyStep[]>;

  abstract getOrderLines(trackingKey: OrderTrackingKey): Promise<OrderLine[]>;

  abstract searchOrders(query: string): Promise<SearchOrderResult[]>;
}
