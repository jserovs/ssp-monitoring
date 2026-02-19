import fs from "node:fs";
import path from "node:path";

export interface BetterSqlite3Database {
  exec(sql: string): void;
  prepare(sql: string): { all: (...params: unknown[]) => Array<Record<string, unknown>> };
}

function loadSql(relativePath: string): string {
  const fullPath = path.join(process.cwd(), relativePath);
  return fs.readFileSync(fullPath, "utf8");
}

function runSqlScript(db: BetterSqlite3Database, sqlScript: string): void {
  db.exec(sqlScript);
}

export function createSqliteInMemoryDb(): BetterSqlite3Database {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BetterSqlite3 = require("better-sqlite3");
  const db = new BetterSqlite3(":memory:") as BetterSqlite3Database;

  const schemaSql = loadSql("mock-db/sqlite/schema.sql");
  const seedSql = loadSql("mock-db/sqlite/seed.sql");

  runSqlScript(db, schemaSql);
  runSqlScript(db, seedSql);

  return db;
}
