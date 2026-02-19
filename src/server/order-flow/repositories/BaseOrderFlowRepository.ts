import type {
  OrderFlowRepository,
  JourneyStep,
  OrderLine,
  SearchOrderResult,
  GetAllOrdersOptions,
  OrderListItem,
} from "../types";

export abstract class BaseOrderFlowRepository implements OrderFlowRepository {
  abstract getAllOrders(options?: GetAllOrdersOptions): Promise<OrderListItem[]>;

  abstract getJourney(trackingKey: string): Promise<JourneyStep[]>;

  abstract getOrderLines(trackingKey: string): Promise<OrderLine[]>;

  abstract searchOrders(query: string): Promise<SearchOrderResult[]>;
}
