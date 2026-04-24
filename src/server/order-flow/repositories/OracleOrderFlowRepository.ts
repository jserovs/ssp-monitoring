import { BaseOrderFlowRepository } from "./BaseOrderFlowRepository";
import { mapFlagsToStatus } from "../status";
import type {
  JourneySource,
  JourneyStep,
  OrderLine,
  SearchOrderResult,
  GetAllOrdersOptions,
  OrderTrackingKey,
  OrderListItem,
  OrderDetails,
} from "../types";

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
  unimplemented?: boolean;
}

interface ComputedStep {
  status: "Completed" | "In Progress" | "Error" | "Not Reached";
  eventTime: string | Date | null;
  lineCount: number | null;
  errorCode: string | null;
  payload?: Record<string, unknown>;
}

const JOURNEY_STEPS: JourneyStepDef[] = [
  { key: "file_received", name: "File Received (ACCESS NEEDED)", sourceDb: "FILE", unimplemented: true },
  { key: "soa_processed", name: "SOA Processed (ACCESS NEEDED)", sourceDb: "FILE", unimplemented: true },
  { key: "proof_of_delivery", name: "Proof Of Delivery (ACCESS NEEDED)", sourceDb: "FILE" },
  { key: "gvi_filewheel_ssp", name: "GVI Filewheel (Before Split)", sourceDb: "GVI" },
  { key: "gvi_filewheel_normal", name: "GVI Filewheel (After Split)", sourceDb: "GVI" },
  { key: "gvi_internal_inbound", name: "GVI Internal (GVI Validation)", sourceDb: "GVI" },
  { key: "gvi_internal_outbound", name: "GVI Internal (GVI Outbound)", sourceDb: "GVI" },
  { key: "gom_order_statas", name: "GOM Order Status", sourceDb: "GOM" },
];

export class OracleOrderFlowRepository extends BaseOrderFlowRepository {
  constructor(
    private readonly gviPool: OraclePool,
    private readonly gomPool: OraclePool
  ) {
    super();
  }

  async getAllOrders(options: GetAllOrdersOptions = {}): Promise<OrderListItem[]> {
    const limit = Number.isFinite(options.limit) ? Number(options.limit) : 50;
    const offset = Number.isFinite(options.offset) ? Number(options.offset) : 0;
    const query = options.query?.trim();

    if (query) {
      const likeValue = `%${query}%`;
      //DEBUG
      console.log("query:", likeValue);
      const rows = await this.queryGvi(
        `select
           customer_order_reference_nbr,
           file_name,
           min(creation_date) as creation_date,
           max(last_update_date) as last_update_date,
            count(case when program = 'SSP' then 1 end) as line_count,
           listagg(process_flag, ',') within group (order by process_flag) as process_flags,
            max(consignee_code) as consignee_code,
            max(case when program = 'SSP' then consignee_reference end) as consignee_reference,
            max(mark) as mark,
            max(ssp_invoice_type) as ssp_invoice_type,
            max(interchange_sender) as interchange_sender
          from gvimgr.gvi_filewheel_order_int_ssp_v
          where customer_order_reference_nbr like :likeValue or file_name like :likeValue
          group by customer_order_reference_nbr, file_name
         order by max(last_update_date) desc
          offset :offsetRows rows fetch next :limitRows rows only`,       { likeValue, offsetRows: offset, limitRows: limit }
      );

      return rows.map((row) => mapOrderListRow(row));
    }

    const rows = await this.queryGvi(
      `select
         customer_order_reference_nbr,
         file_name,
         min(creation_date) as creation_date,
         max(last_update_date) as last_update_date,
          count(case when program = 'SSP' then 1 end) as line_count,
          listagg(process_flag, ',') within group (order by process_flag) as process_flags,
           max(consignee_code) as consignee_code,
           max(case when program = 'SSP' then consignee_reference end) as consignee_reference,
           max(mark) as mark,
           max(ssp_invoice_type) as ssp_invoice_type,
           max(interchange_sender) as interchange_sender
         from gvimgr.gvi_filewheel_order_int_ssp_v
         group by customer_order_reference_nbr, file_name
        order by 4 desc
         offset :offsetRows rows fetch next :limitRows rows only`,
      { offsetRows: offset, limitRows: limit }
    );

    return rows.map((row) => mapOrderListRow(row));
  }

  async getOrderDetails(trackingKey: OrderTrackingKey): Promise<OrderDetails | null> {
    const bindParams = toBindParams(trackingKey);
    const rows = await this.queryGvi(
      `select
         customer_order_reference_nbr,
         file_name,
         min(creation_date) as creation_date,
         max(last_update_date) as last_update_date,
         count(*) as line_count,
         max(consignee_code) as consignee_code,
         max(case when program = 'SSP' then consignee_reference end) as consignee_reference,
         max(mark) as mark,
         max(ssp_invoice_type) as ssp_invoice_type,
         max(interchange_sender) as interchange_sender
       from gvimgr.gvi_filewheel_order_int_ssp_v
       where customer_order_reference_nbr = :customer_order_reference_nbr
         and file_name = :file_name
       group by customer_order_reference_nbr, file_name`,
      bindParams
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      customer_order_reference_nbr: String(row.CUSTOMER_ORDER_REFERENCE_NBR ?? ""),
      file_name: toStr(row.FILE_NAME),
      creation_date: toIso(row.CREATION_DATE),
      last_update_date: toIso(row.LAST_UPDATE_DATE),
      line_count: toNum(row.LINE_COUNT) ?? 0,
      consignee_code: toStr(row.CONSIGNEE_CODE),
      consignee_reference: toStr(row.CONSIGNEE_REFERENCE),
      mark: toStr(row.MARK),
      ssp_invoice_type: toStr(row.SSP_INVOICE_TYPE),
      customer_name: getCustomerName(toStr(row.INTERCHANGE_SENDER)),
    };
  }

  async getJourney(trackingKey: OrderTrackingKey): Promise<JourneyStep[]> {
    const bindParams = toBindParams(trackingKey);
    const internalCorrelationClause = buildInternalFilewheelCorrelationClause("internal_rows");

    console.log("getJourney trackingKey:", trackingKey);

    const sspRows = await this.queryGvi(
      `select process_flag, error_code, creation_date, last_update_date
       from gvimgr.gvi_filewheel_order_int_ssp_v
       where customer_order_reference_nbr = :customer_order_reference_nbr
         and file_name = :file_name
         and program = 'SSP'`,
      bindParams
    );

    const nonSspRows = await this.queryGvi(
      `select process_flag, error_code, creation_date, last_update_date, program
       from gvimgr.gvi_filewheel_order_int_ssp_v
       where customer_order_reference_nbr = :customer_order_reference_nbr
         and file_name = :file_name
         and program <> 'SSP'`,
      bindParams
    );

    const inboundRows = await this.queryGvi(
      `select internal_rows.process_flag, internal_rows.error_code, internal_rows.creation_date, internal_rows.last_update_date, internal_rows.program
       from gvimgr.gvi_internal_order_int_ssp_v internal_rows
       where internal_rows.customer_order_reference_nbr = :customer_order_reference_nbr
         and internal_rows.direction is null
         and ${internalCorrelationClause}`,
      bindParams
    );

    const outboundRows = await this.queryGvi(
      `select internal_rows.process_flag, internal_rows.error_code, internal_rows.creation_date, internal_rows.last_update_date, internal_rows.program, internal_rows.subs_order_number_from
       from gvimgr.gvi_internal_order_int_ssp_v internal_rows
       where internal_rows.customer_order_reference_nbr = :customer_order_reference_nbr
         and internal_rows.direction = 'OUTBOUND'
         and ${internalCorrelationClause}`,
      bindParams
    );

    // Query for distinct programs from both filewheel and internal to show order split
    const [filewheelProgramRows, internalProgramRows] = await Promise.all([
      this.queryGvi(
        `select distinct program 
         from gvimgr.gvi_filewheel_order_int_ssp_v 
         where customer_order_reference_nbr = :customer_order_reference_nbr
           and file_name = :file_name
           and program <> 'SSP'`,
        bindParams
      ),
      this.queryGvi(
        `select distinct internal_rows.program 
         from gvimgr.gvi_internal_order_int_ssp_v internal_rows
         where internal_rows.customer_order_reference_nbr = :customer_order_reference_nbr
           and ${internalCorrelationClause}`,
        bindParams
      ),
    ]);
    
    const filewheelPrograms = filewheelProgramRows.map(r => toStr(r.PROGRAM)).filter(p => p) as string[];
    const internalPrograms = internalProgramRows.map(r => toStr(r.PROGRAM)).filter(p => p) as string[];
    const programs = [...new Set([...filewheelPrograms, ...internalPrograms])];

    // If no programs found, use default steps
    const hasSplit = programs.length > 0;

    const gomLookup = buildGomLookup(bindParams, outboundRows);
    const gomRows = gomLookup
      ? await this.queryGom(
          `select distinct oeoh.creation_date as creation_date, oeol.creation_date as line_creation_date, oeoh.flow_status_code as flow_status_code, oeoh.attribute13 as attribute13
           from oe_order_headers_all oeoh
           join oe_order_lines_all oeol on oeoh.header_id = oeol.header_id
           where oeoh.cust_po_number = :customer_order_reference_nbr
             and oeoh.orig_sys_document_ref in (${gomLookup.origSysDocumentRefPlaceholders.join(", ")})`,
          gomLookup.bindParams
        )
      : [];

    const proofOfDeliveryUrl = "/api/mock-files/order1.pdf";

    const computed: Record<string, ComputedStep> = {
      file_received: {
        status: "Not Reached",
        eventTime: null,
        lineCount: null,
        errorCode: null,
      },
      soa_processed: {
        status: "Not Reached",
        eventTime: null,
        lineCount: null,
        errorCode: null,
      },
      proof_of_delivery: {
        status: sspRows.length > 0 ? "Completed" : "Not Reached",
        eventTime: latestTime([...sspRows, ...outboundRows], ["LAST_UPDATE_DATE", "CREATION_DATE"]),
        lineCount: null,
        errorCode: null,
        payload: {
          documentUrl: proofOfDeliveryUrl,
        },
      },
      
      gvi_filewheel_ssp: this.buildStep(sspRows),
      gvi_filewheel_normal: this.buildStep(nonSspRows),
      gvi_internal_inbound: this.buildStep(inboundRows),
      gvi_internal_outbound: this.buildStep(outboundRows),
      gom_order_statas: {
        status: this.buildGomStep(gomRows).status,
        eventTime: latestTime(gomRows, ["LINE_CREATION_DATE", "CREATION_DATE"]),
        lineCount: gomRows.length,
        errorCode: null,
      },
    };

    const gomRowsByProgram = gomRows.reduce<Record<string, Array<Record<string, unknown>>>>((acc, row) => {
      const program = extractProgramFromAttribute13(row.ATTRIBUTE13);
      if (!program) {
        return acc;
      }
      if (!acc[program]) {
        acc[program] = [];
      }
      acc[program].push(row);
      return acc;
    }, {});

    // Build journey steps dynamically
    const journeySteps: JourneyStep[] = [];

    // Add pre-split steps
    journeySteps.push({
      step: "File Received (ACCESS NEEDED)",
      sourceDb: "FILE",
      status: computed.file_received.status,
      eventTime: toIso(computed.file_received.eventTime),
      lineCount: computed.file_received.lineCount,
      errorCode: computed.file_received.errorCode,
      payload: { stepKey: "file_received" },
      unimplemented: true,
    });

    journeySteps.push({
      step: "SOA Processed (ACCESS NEEDED)",
      sourceDb: "FILE",
      status: computed.soa_processed.status,
      eventTime: toIso(computed.soa_processed.eventTime),
      lineCount: computed.soa_processed.lineCount,
      errorCode: computed.soa_processed.errorCode,
      payload: { stepKey: "soa_processed" },
      unimplemented: true,
    });

    journeySteps.push({
      step: "Proof Of Delivery (ACCESS NEEDED)",
      sourceDb: "FILE",
      status: computed.proof_of_delivery.status,
      eventTime: toIso(computed.proof_of_delivery.eventTime),
      lineCount: computed.proof_of_delivery.lineCount,
      errorCode: computed.proof_of_delivery.errorCode,
      payload: computed.proof_of_delivery.payload ?? { stepKey: "proof_of_delivery" },
      hideLines: true,
    });

    // Filewheel steps
    journeySteps.push({
      step: "GVI Filewheel (SSP)",
      sourceDb: "GVI",
      status: computed.gvi_filewheel_ssp.status,
      eventTime: toIso(computed.gvi_filewheel_ssp.eventTime),
      lineCount: computed.gvi_filewheel_ssp.lineCount,
      errorCode: computed.gvi_filewheel_ssp.errorCode,
      payload: { stepKey: "gvi_filewheel_ssp" },
    });

    // Add split indicator if there are multiple programs
    if (hasSplit && programs.length > 1) {
      journeySteps.push({
        step: `Order Split (${programs.length} branches)`,
        sourceDb: "GVI",
        status: "Completed",
        eventTime: null,
        lineCount: null,
        errorCode: null,
        payload: { stepKey: "order_split", programs },
        hideLines: true,
      });

      // Add filewheel (non-SSP) steps for each program
      for (const program of programs) {
        const programFilewheelRows = nonSspRows.filter(r => toStr(r.PROGRAM) === program);
        
        journeySteps.push({
          step: `GVI Filewheel (${program})`,
          sourceDb: "GVI",
          status: this.buildStep(programFilewheelRows).status,
          eventTime: toIso(latestTime(programFilewheelRows, ["CREATION_DATE", "LAST_UPDATE_DATE"])),
          lineCount: programFilewheelRows.length,
          errorCode: null,
          payload: { stepKey: "gvi_filewheel_normal", program },
        });
      }

      // Add steps for each program branch
      for (const program of programs) {
        const programInboundRows = inboundRows.filter(r => toStr(r.PROGRAM) === program);
        const programOutboundRows = outboundRows.filter(r => toStr(r.PROGRAM) === program);
        const programGomRows = gomRowsByProgram[program] ?? [];

        journeySteps.push({
          step: `GVI Validation (${program})`,
          sourceDb: "GVI",
          status: this.buildStep(programInboundRows).status,
          eventTime: toIso(latestTime(programInboundRows, ["CREATION_DATE", "LAST_UPDATE_DATE"])),
          lineCount: programInboundRows.length,
          errorCode: null,
          payload: { stepKey: "gvi_internal_inbound", program },
        });

        journeySteps.push({
          step: `GVI Outbound (${program})`,
          sourceDb: "GVI",
          status: this.buildStep(programOutboundRows).status,
          eventTime: toIso(latestTime(programOutboundRows, ["CREATION_DATE", "LAST_UPDATE_DATE"])),
          lineCount: programOutboundRows.length,
          errorCode: null,
          payload: { stepKey: "gvi_internal_outbound", program },
        });

        journeySteps.push({
          step: `GOM Order Status (${program})`,
          sourceDb: "GOM",
          status: this.buildGomStep(programGomRows).status,
          eventTime: toIso(latestTime(programGomRows, ["LINE_CREATION_DATE", "CREATION_DATE"])),
          lineCount: programGomRows.length,
          errorCode: null,
          payload: { stepKey: "gom_order_statas", program },
        });
      }
    } else {
      // No split - add regular filewheel (non-SSP) step
      journeySteps.push({
        step: "GVI Filewheel (non-SSP)",
        sourceDb: "GVI",
        status: computed.gvi_filewheel_normal.status,
        eventTime: toIso(computed.gvi_filewheel_normal.eventTime),
        lineCount: computed.gvi_filewheel_normal.lineCount,
        errorCode: computed.gvi_filewheel_normal.errorCode,
        payload: { stepKey: "gvi_filewheel_normal" },
      });

      // No split - add regular internal steps
      journeySteps.push({
        step: "GVI Internal (GVI Validation)",
        sourceDb: "GVI",
        status: computed.gvi_internal_inbound.status,
        eventTime: toIso(computed.gvi_internal_inbound.eventTime),
        lineCount: computed.gvi_internal_inbound.lineCount,
        errorCode: computed.gvi_internal_inbound.errorCode,
        payload: { stepKey: "gvi_internal_inbound" },
      });

      journeySteps.push({
        step: "GVI Internal (GVI Outbound)",
        sourceDb: "GVI",
        status: computed.gvi_internal_outbound.status,
        eventTime: toIso(computed.gvi_internal_outbound.eventTime),
        lineCount: computed.gvi_internal_outbound.lineCount,
        errorCode: computed.gvi_internal_outbound.errorCode,
        payload: { stepKey: "gvi_internal_outbound" },
      });
      
      // No split - add single GOM step
      journeySteps.push({
        step: "GOM Order Status",
        sourceDb: "GOM",
        status: computed.gom_order_statas.status,
        eventTime: toIso(computed.gom_order_statas.eventTime),
        lineCount: computed.gom_order_statas.lineCount,
        errorCode: computed.gom_order_statas.errorCode,
        payload: { stepKey: "gom_order_statas" },
      });
    }

    return journeySteps;
  }

  async getOrderLines(trackingKey: OrderTrackingKey): Promise<OrderLine[]> {
    const bindParams = toBindParams(trackingKey);
    const internalCorrelationClause = buildInternalFilewheelCorrelationClause("internal_rows");
    const [internalRows, filewheelRows] = await Promise.all([
      this.queryGvi(
        `select internal_rows.program, internal_rows.direction, internal_rows.line_number, internal_rows.process_flag, internal_rows.error_code, internal_rows.item_code, internal_rows.requested_quantity, internal_rows.last_update_date
         from gvimgr.gvi_internal_order_int_ssp_v internal_rows
         where internal_rows.customer_order_reference_nbr = :customer_order_reference_nbr
           and ${internalCorrelationClause}
         order by internal_rows.line_number`,
        bindParams
      ),
      this.queryGvi(
        `select program, line_number, process_flag, error_code, manufacturers_article_code, buyers_article_code, requested_quantity, last_update_date
         from gvimgr.gvi_filewheel_order_int_ssp_v
         where customer_order_reference_nbr = :customer_order_reference_nbr
           and file_name = :file_name
         order by line_number`,
        bindParams
      ),
    ]);

    const internalLines = internalRows.map((row) => ({
      stage: "GVI_INTERNAL" as const,
      program: toStr(row.PROGRAM),
      direction: toStr(row.DIRECTION),
      line_number: toStr(row.LINE_NUMBER),
      process_flag: toStr(row.PROCESS_FLAG),
      error_code: toStr(row.ERROR_CODE),
      item_code: toStr(row.ITEM_CODE),
      requested_quantity: toNum(row.REQUESTED_QUANTITY),
      last_update_date: toIso(row.LAST_UPDATE_DATE),
    }));

    const filewheelLines = filewheelRows.map((row) => ({
      stage: "GVI_FILEWHEEL" as const,
      program: toStr(row.PROGRAM),
      direction: null,
      line_number: toStr(row.LINE_NUMBER),
      process_flag: toStr(row.PROCESS_FLAG),
      error_code: toStr(row.ERROR_CODE),
      item_code: toStr(row.MANUFACTURERS_ARTICLE_CODE) || toStr(row.BUYERS_ARTICLE_CODE) || null,
      requested_quantity: toNum(row.REQUESTED_QUANTITY),
      last_update_date: toIso(row.LAST_UPDATE_DATE),
    }));

    return [...internalLines, ...filewheelLines];
  }

  async searchOrders(query: string): Promise<SearchOrderResult[]> {
    const likeValue = `%${query}%`;

    const rows = await this.queryGvi(
      `select customer_order_reference_nbr, file_name, max(last_update_date) as last_update_date
       from gvimgr.gvi_filewheel_order_int_ssp_v
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
      console.log("buildStep" + rows.toString());
    return {
      status: mapFlagsToStatus(flags),
      eventTime: latestTime(rows, ["LAST_UPDATE_DATE", "CREATION_DATE"]),
      lineCount: rows.length,
      errorCode: errorCodeRow ? toStr(errorCodeRow.ERROR_CODE) : null,
    };
  }

  private buildGomStep(rows: Array<Record<string, unknown>>) {
    if (rows.length === 0) {
      return {
        status: "Not Reached" as const,
      };
    }

    const flowStatuses = rows
      .map((row) => toStr(row.FLOW_STATUS_CODE))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toUpperCase());

    const allClosed = flowStatuses.length > 0 && flowStatuses.every((status) => status === "CLOSED");
    return {
      status: allClosed ? ("Completed" as const) : ("In Progress" as const),
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

function toBindParams(trackingKey: OrderTrackingKey): Record<string, unknown> {
  return {
    customer_order_reference_nbr: trackingKey.customer_order_reference_nbr,
    file_name: trackingKey.file_name,
  };
}

function buildGomLookup(
  baseBindParams: Record<string, unknown>,
  outboundRows: Array<Record<string, unknown>>
): { bindParams: Record<string, unknown>; origSysDocumentRefPlaceholders: string[] } | null {
  const origSysDocumentRefs = [...new Set(
    outboundRows
      .map((row) => toStr(row.SUBS_ORDER_NUMBER_FROM))
      .filter((value): value is string => Boolean(value))
  )];

  if (origSysDocumentRefs.length === 0) {
    return null;
  }

  const bindParams: Record<string, unknown> = {
    customer_order_reference_nbr: baseBindParams.customer_order_reference_nbr,
  };
  const origSysDocumentRefPlaceholders = origSysDocumentRefs.map((value, index) => {
    const bindName = `orig_sys_document_ref_${index}`;
    bindParams[bindName] = value;
    return `:${bindName}`;
  });

  return {
    bindParams,
    origSysDocumentRefPlaceholders,
  };
}

function buildInternalFilewheelCorrelationClause(internalAlias: string): string {
  return `exists (
    select 1
    from gvimgr.gvi_filewheel_order_int_ssp_v filewheel_rows
    where filewheel_rows.gvi_interface_line_id = ${internalAlias}.gvi_fw_interface_line_id
      and filewheel_rows.customer_order_reference_nbr = :customer_order_reference_nbr
      and filewheel_rows.file_name = :file_name
      and filewheel_rows.program <> 'SSP'
  )`;
}

function extractProgramFromAttribute13(value: unknown): string | null {
  const text = toStr(value);
  if (!text) {
    return null;
  }

  const match = text.match(/PROGRAM:\s*([^;]+)/i);
  if (!match?.[1]) {
    return null;
  }

  return match[1].trim().toUpperCase();
}

// Customer name lookup - can be replaced with database query later
function getCustomerName(interchangeSender: string | null): string | null {
  if (!interchangeSender) return null;
  const mapping: Record<string, string> = {
    "7047353003": "ATD",
    "8004904929": "USAF",
    "7047353003T": "ATD",
    "8004904929T": "USAF",
  };
  return mapping[interchangeSender] ?? null;
}

function mapOrderListRow(row: Record<string, unknown>): OrderListItem {
  const rawFlags = toStr(row.PROCESS_FLAGS) ?? "";
  const flags = rawFlags ? rawFlags.split(",") : [];

  return {
    customer_order_reference_nbr: String(row.CUSTOMER_ORDER_REFERENCE_NBR ?? ""),
    file_name: toStr(row.FILE_NAME),
    creation_date: toIso(row.CREATION_DATE),
    last_update_date: toIso(row.LAST_UPDATE_DATE),
    line_count: toNum(row.LINE_COUNT) ?? 0,
    status: mapFlagsToStatus(flags),
    process_flag: toStr(row.PROCESS_FLAGS),
    consignee_code: toStr(row.CONSIGNEE_CODE),
    consignee_reference: toStr(row.CONSIGNEE_REFERENCE),
    mark: toStr(row.MARK),
    ssp_invoice_type: toStr(row.SSP_INVOICE_TYPE),
    customer_name: getCustomerName(toStr(row.INTERCHANGE_SENDER)),
  };
}
