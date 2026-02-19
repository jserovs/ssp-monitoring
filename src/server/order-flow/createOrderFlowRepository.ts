import { OracleOrderFlowRepository } from "./repositories/OracleOrderFlowRepository";
import type { OrderFlowRepository } from "./types";

interface OracleConnection {
  execute: (
    sql: string,
    bindParams: Record<string, unknown>,
    options: { outFormat: number }
  ) => Promise<{ rows?: Array<Record<string, unknown>> }>;
  close: () => Promise<void>;
}

interface OraclePool {
  getConnection: () => Promise<OracleConnection>;
}

interface CreateOrderFlowRepositoryOptions {
  gviPool: OraclePool;
  gomPool: OraclePool;
}

export async function createOrderFlowRepository(
  options: CreateOrderFlowRepositoryOptions
): Promise<OrderFlowRepository> {
  if (!options.gviPool || !options.gomPool) {
    throw new Error("Oracle pools (gviPool and gomPool) are required");
  }
  
  return new OracleOrderFlowRepository(options.gviPool, options.gomPool);
}
