import type { OrderFlowRepository, JourneyStep, OrderLine, SearchOrderResult } from "../types";

export abstract class BaseOrderFlowRepository implements OrderFlowRepository {
  abstract getJourney(trackingKey: string): Promise<JourneyStep[]>;

  abstract getOrderLines(trackingKey: string): Promise<OrderLine[]>;

  abstract searchOrders(query: string): Promise<SearchOrderResult[]>;
}
