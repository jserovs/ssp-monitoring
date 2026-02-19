import { BaseOrderFlowRepository } from "./BaseOrderFlowRepository";
import { mapFlagsToStatus } from "../status";
import type { BetterSqlite3Database } from "../initSqliteInMemory";
import type { JourneySource, JourneyStep, OrderLine, SearchOrderResult } from "../types";

interface RawStepRow {
  process_flag?: string | null;
  error_code?: string | null;
  creation_date?: string | null;
  last_update_date?: string | null;
}

interface RawGomRow {
  creation_date?: string | null;
  line_creation_date?: string | null;
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

export class SqliteOrderFlowRepository extends BaseOrderFlowRepository {
  constructor(private readonly db: BetterSqlite3Database) {
    super();
  }

  async getJourney(trackingKey: string): Promise<JourneyStep[]> {
    const sspRows = this.db
      .prepare(
        `select process_flag, error_code, creation_date, last_update_date
         from gvi_filewheel_order_interface
         where customer_order_reference_nbr = ? and program = 'SSP'`
      )
      .all(trackingKey) as RawStepRow[];

    const nonSspRows = this.db
      .prepare(
        `select process_flag, error_code, creation_date, last_update_date
         from gvi_filewheel_order_interface
         where customer_order_reference_nbr = ? and program <> 'SSP'`
      )
      .all(trackingKey) as RawStepRow[];

    const internalInboundRows = this.db
      .prepare(
        `select process_flag, error_code, creation_date, last_update_date
         from gvi_internal_order_interface
         where customer_order_reference_nbr = ? and direction is null`
      )
      .all(trackingKey) as RawStepRow[];

    const internalOutboundRows = this.db
      .prepare(
        `select process_flag, error_code, creation_date, last_update_date
         from gvi_internal_order_interface
         where customer_order_reference_nbr = ? and direction = 'OUTBOUND'`
      )
      .all(trackingKey) as RawStepRow[];

    const gomRows = this.db
      .prepare(
        `select h.creation_date as creation_date, l.creation_date as line_creation_date
         from gom_oe_order_headers_all h
         join gom_oe_order_lines_all l on h.header_id = l.header_id
         where h.cust_po_number = ?`
      )
      .all(trackingKey) as RawGomRow[];

    const gomFlags = gomRows.length > 0 ? ["P"] : [];

    const computed = {
      file_received: this.syntheticDone(),
      soa_archived: this.syntheticDone(),
      gvi_ssp: this.buildStep(sspRows),
      gvi_non_ssp: this.buildStep(nonSspRows),
      gvi_internal_inbound: this.buildStep(internalInboundRows),
      gvi_internal_outbound: this.buildStep(internalOutboundRows),
      gom_order_created: {
        status: mapFlagsToStatus(gomFlags),
        eventTime: latestTime(gomRows, ["line_creation_date", "creation_date"]),
        lineCount: gomRows.length,
        errorCode: null,
      },
    };

    return JOURNEY_STEPS.map((step) => ({
      step: step.name,
      sourceDb: step.sourceDb,
      status: computed[step.key as keyof typeof computed].status,
      eventTime: computed[step.key as keyof typeof computed].eventTime,
      lineCount: computed[step.key as keyof typeof computed].lineCount,
      errorCode: computed[step.key as keyof typeof computed].errorCode,
      payload: { stepKey: step.key },
    }));
  }

  async getOrderLines(trackingKey: string): Promise<OrderLine[]> {
    const rows = this.db
      .prepare(
        `select 'GVI_FILEWHEEL' as stage, program, line_number, process_flag, error_code, item_code, requested_quantity, last_update_date
           from (
             select program, line_number, process_flag, error_code, null as item_code, requested_quantity, last_update_date, customer_order_reference_nbr
             from gvi_filewheel_order_interface
           )
          where customer_order_reference_nbr = ?
          union all
         select 'GVI_INTERNAL' as stage, program, line_number, process_flag, error_code, item_code, requested_quantity, last_update_date
         from gvi_internal_order_interface
         where customer_order_reference_nbr = ?
         order by stage, line_number`
      )
      .all(trackingKey, trackingKey) as OrderLine[];

    return rows;
  }

  async searchOrders(query: string): Promise<SearchOrderResult[]> {
    const likeValue = `%${query}%`;

    return this.db
      .prepare(
        `select distinct customer_order_reference_nbr, file_name, max(last_update_date) as last_update_date
         from gvi_filewheel_order_interface
         where customer_order_reference_nbr like ? or file_name like ?
         group by customer_order_reference_nbr, file_name
         order by last_update_date desc`
      )
      .all(likeValue, likeValue) as SearchOrderResult[];
  }

  private syntheticDone() {
    return {
      status: "Completed" as const,
      eventTime: null,
      lineCount: 1,
      errorCode: null,
    };
  }

  private buildStep(rows: RawStepRow[]) {
    const flags = rows.map((row) => row.process_flag ?? null);
    const errorCodeRow = rows.find((row) => row.error_code);

    return {
      status: mapFlagsToStatus(flags),
      eventTime: latestTime(rows, ["last_update_date", "creation_date"]),
      lineCount: rows.length,
      errorCode: errorCodeRow ? (errorCodeRow.error_code ?? null) : null,
    };
  }
}

function latestTime<T extends Record<string, string | null | undefined>>(rows: T[], keys: string[]): string | null {
  let max: string | null = null;

  for (const row of rows) {
    for (const key of keys) {
      const value = row[key];
      if (!value) {
        continue;
      }
      if (!max || value > max) {
        max = value;
      }
    }
  }

  return max;
}
