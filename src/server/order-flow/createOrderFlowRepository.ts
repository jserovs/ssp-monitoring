import { createSqliteInMemoryDb, type BetterSqlite3Database } from "./initSqliteInMemory";
import { SqliteOrderFlowRepository } from "./repositories/SqliteOrderFlowRepository";
import { OracleOrderFlowRepository } from "./repositories/OracleOrderFlowRepository";
import type { OrderFlowRepository } from "./types";

interface OraclePool {
  getConnection: () => Promise<unknown>;
}

interface CreateOrderFlowRepositoryOptions {
  provider?: string;
  sqliteDb?: BetterSqlite3Database;
  gviPool?: OraclePool;
  gomPool?: OraclePool;
}

export async function createOrderFlowRepository(
  options: CreateOrderFlowRepositoryOptions = {}
): Promise<OrderFlowRepository> {
  const provider = (options.provider || process.env.DB_PROVIDER || "sqlite").toLowerCase();

  if (provider === "sqlite") {
    const db = options.sqliteDb || createSqliteInMemoryDb();
    return new SqliteOrderFlowRepository(db);
  }

  if (provider === "oracle") {
    if (!options.gviPool || !options.gomPool) {
      throw new Error("Oracle provider requires gviPool and gomPool");
    }
    return new OracleOrderFlowRepository(options.gviPool, options.gomPool);
  }

  throw new Error(`Unsupported DB provider: ${provider}`);
}
