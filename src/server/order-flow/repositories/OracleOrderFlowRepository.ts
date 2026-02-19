import { BaseOrderFlowRepository } from "./BaseOrderFlowRepository";
import { mapFlagsToStatus } from "../status";
import type { JourneySource, JourneyStep, OrderLine, SearchOrderResult } from "../types";

interface OraclePool {
  getConnection: () => Promise<OracleConnection>;
}

interface OracleConnection {
  execute: (
    sql: string,
    bindParams: Record<string, unknown>,
    options: { outFormat: number }
  ) => Promise<{ rows?: Array<Record<string, unknown>> }>;
  close: () => Promise<void>;
}

interface JourneyStepDef {
  key: string;
  name: string;
  sourceDb: JourneySource;
}

const JOURNEY_STEPS: JourneyStepDef[] = [
  { key: "file_received", name: "File Received", sourceDb: "FILE" },
  { key: "soa_archived", name: "SOA Archived", sourceDb: "SOA" },
  { key: "gvi_ssp", name: "GVI Filewheel (SSP)", sourceDb: "GVI" },
  { key: "gvi_non_ssp", name: "GVI Filewheel (non-SSP)", sourceDb: "GVI" },
  { key: "gvi_internal_inbound", name: "GVI Internal (inbound)", sourceDb: "GVI" },
  { key: "gvi_internal_outbound", name: "GVI Internal (OUTBOUND)", sourceDb: "GVI" },
  { key: "gom_order_created", name: "GOM Order Created", sourceDb: "GOM" },
];

export class OracleOrderFlowRepository extends BaseOrderFlowRepository {
  constructor(
    private readonly gviPool: OraclePool,
    private readonly gomPool: OraclePool
  ) {
    super();
  }

  async getJourney(trackingKey: string): Promise<JourneyStep[]> {
    const sspRows = await this.queryGvi(
      `select process_flag, error_code, creation_date, last_update_date
       from gvi_filewheel_order_interface
       where customer_order_reference_nbr = :trackingKey and program = 'SSP'`,
      { trackingKey }
    );

    const nonSspRows = await this.queryGvi(
      `select process_flag, error_code, creation_date, last_update_date
       from gvi_filewheel_order_interface
       where customer_order_reference_nbr = :trackingKey and program <> 'SSP'`,
      { trackingKey }
    );

    const inboundRows = await this.queryGvi(
      `select process_flag, error_code, creation_date, last_update_date
       from gvi_internal_order_interface
       where customer_order_reference_nbr = :trackingKey and direction is null`,
      { trackingKey }
    );

    const outboundRows = await this.queryGvi(
      `select process_flag, error_code, creation_date, last_update_date
       from gvi_internal_order_interface
       where customer_order_reference_nbr = :trackingKey and direction = 'OUTBOUND'`,
      { trackingKey }
    );

    const gomRows = await this.queryGom(
      `select oeoh.creation_date as creation_date, oeol.creation_date as line_creation_date
       from oe_order_headers_all oeoh
       join oe_order_lines_all oeol on oeoh.header_id = oeol.header_id
       where oeoh.cust_po_number = :trackingKey`,
      { trackingKey }
    );

    const computed = {
      file_received: this.syntheticDone(),
      soa_archived: this.syntheticDone(),
      gvi_ssp: this.buildStep(sspRows),
      gvi_non_ssp: this.buildStep(nonSspRows),
      gvi_internal_inbound: this.buildStep(inboundRows),
      gvi_internal_outbound: this.buildStep(outboundRows),
      gom_order_created: {
        status: mapFlagsToStatus(gomRows.length ? ["P"] : []),
        eventTime: latestTime(gomRows, ["LINE_CREATION_DATE", "CREATION_DATE"]),
        lineCount: gomRows.length,
        errorCode: null,
      },
    };

    return JOURNEY_STEPS.map((step) => ({
      step: step.name,
      sourceDb: step.sourceDb,
      status: computed[step.key as keyof typeof computed].status,
      eventTime: toIso(computed[step.key as keyof typeof computed].eventTime),
      lineCount: computed[step.key as keyof typeof computed].lineCount,
      errorCode: computed[step.key as keyof typeof computed].errorCode,
      payload: { stepKey: step.key },
    }));
  }

  async getOrderLines(trackingKey: string): Promise<OrderLine[]> {
    const rows = await this.queryGvi(
      `select program, line_number, process_flag, error_code, item_code, requested_quantity, last_update_date
       from gvi_internal_order_interface
       where customer_order_reference_nbr = :trackingKey
       order by line_number`,
      { trackingKey }
    );

    return rows.map((row) => ({
      stage: "GVI_INTERNAL",
      program: toStr(row.PROGRAM),
      line_number: toStr(row.LINE_NUMBER),
      process_flag: toStr(row.PROCESS_FLAG),
      error_code: toStr(row.ERROR_CODE),
      item_code: toStr(row.ITEM_CODE),
      requested_quantity: toNum(row.REQUESTED_QUANTITY),
      last_update_date: toIso(row.LAST_UPDATE_DATE),
    }));
  }

  async searchOrders(query: string): Promise<SearchOrderResult[]> {
    const likeValue = `%${query}%`;

    const rows = await this.queryGvi(
      `select customer_order_reference_nbr, file_name, max(last_update_date) as last_update_date
       from gvi_filewheel_order_interface
       where customer_order_reference_nbr like :likeValue or file_name like :likeValue
       group by customer_order_reference_nbr, file_name
       order by max(last_update_date) desc`,
      { likeValue }
    );

    return rows.map((row) => ({
      customer_order_reference_nbr: String(row.CUSTOMER_ORDER_REFERENCE_NBR ?? ""),
      file_name: toStr(row.FILE_NAME),
      last_update_date: toIso(row.LAST_UPDATE_DATE),
    }));
  }

  private async queryGvi(sql: string, bindParams: Record<string, unknown>) {
    const connection = await this.gviPool.getConnection();
    try {
      const result = await connection.execute(sql, bindParams, { outFormat: 4002 });
      return result.rows || [];
    } finally {
      await connection.close();
    }
  }

  private async queryGom(sql: string, bindParams: Record<string, unknown>) {
    const connection = await this.gomPool.getConnection();
    try {
      const result = await connection.execute(sql, bindParams, { outFormat: 4002 });
      return result.rows || [];
    } finally {
      await connection.close();
    }
  }

  private syntheticDone() {
    return {
      status: "Completed" as const,
      eventTime: null,
      lineCount: 1,
      errorCode: null,
    };
  }

  private buildStep(rows: Array<Record<string, unknown>>) {
    const flags = rows.map((row) => toStr(row.PROCESS_FLAG));
    const errorCodeRow = rows.find((row) => row.ERROR_CODE);

    return {
      status: mapFlagsToStatus(flags),
      eventTime: latestTime(rows, ["LAST_UPDATE_DATE", "CREATION_DATE"]),
      lineCount: rows.length,
      errorCode: errorCodeRow ? toStr(errorCodeRow.ERROR_CODE) : null,
    };
  }
}

function latestTime(rows: Array<Record<string, unknown>>, keys: string[]) {
  let max: string | Date | null = null;

  for (const row of rows) {
    for (const key of keys) {
      const value = row[key] as string | Date | null | undefined;
      if (!value) {
        continue;
      }
      const comparable = value instanceof Date ? value.getTime() : String(value);
      if (!max) {
        max = value;
        continue;
      }
      const maxComparable = max instanceof Date ? max.getTime() : String(max);
      if (comparable > maxComparable) {
        max = value;
      }
    }
  }

  return max;
}

function toIso(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

function toNum(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}
