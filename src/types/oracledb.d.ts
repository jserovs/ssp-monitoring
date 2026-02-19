declare module "oracledb" {
  export interface Connection {
    execute(
      sql: string,
      bindParams?: Record<string, unknown>,
      options?: { outFormat?: number }
    ): Promise<{ rows?: Array<Record<string, unknown>> }>;
    close(): Promise<void>;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
    close(drainTime?: number): Promise<void>;
  }

  export interface CreatePoolOptions {
    user: string;
    password: string;
    connectString: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
  }

  interface Oracledb {
    createPool(options: CreatePoolOptions): Promise<Pool>;
  }

  const oracledb: Oracledb;
  export default oracledb;
}
