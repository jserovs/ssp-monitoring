# SSP Order Flow Monitoring Solution

## 1) Goal
Build a user-friendly monitoring UI in Next.js that shows where an SSP order is in the end-to-end flow across Oracle `GVI` and `GOM`, with line-level diagnostics and fast error isolation.

## 2) User-friendly Data Flow Representation

### Main screen: Order Journey Timeline
For each `order_tracking_key` (`CUSTOMER_ORDER_REFERENCE_NBR`) show a horizontal timeline with statuses:

1. `File Received` (shared folder event)
2. `SOA Archived`
3. `GVI Filewheel (SSP)`
4. `GVI Filewheel (non-SSP)`
5. `GVI Internal (inbound)`
6. `GVI Internal (OUTBOUND)`
7. `GOM Order Created`

Each step should show:
- `Status`: `Completed`, `In Progress`, `Error`, `Not Reached`
- `Timestamp`: latest known event (`CREATION_DATE` / `LAST_UPDATE_DATE`)
- `Record count`: number of lines found
- `Error summary`: top `ERROR_CODE` (if any)

### Details panel (click on timeline step)
- Header-level metadata: order key, file name, program, source/target subsystem
- Line table: line number, item, qty, process flag, error code, last update
- Filters: `Errors only`, `Program`, `Direction`, `Date range`

### Search and drilldown
- Search by `CUSTOMER_ORDER_REFERENCE_NBR`, `FILE_NAME`, `ORDER_NUMBER`
- Deep-link URL: `/orders/[trackingKey]`
- Correlation badge showing match between `FILE_NAME` and `CUSTOMER_ORDER_REFERENCE_NBR`

## 3) Technical Implementation (Next.js + Oracle)

### 3.1 Backend access layer
Create a service module (server-side only) using Oracle client (`oracledb`) with two pools:
- `GVI_POOL`
- `GOM_POOL`

Expose API routes:
- `GET /api/orders?trackingKey=...`
- `GET /api/orders/:trackingKey/journey`
- `GET /api/orders/:trackingKey/lines`

### 3.2 Canonical event model
Map raw DB records to one canonical event shape:
- `step`
- `status`
- `eventTime`
- `sourceDb` (`GVI` | `GOM`)
- `lineCount`
- `errorCode`
- `payload`

Status mapping from `PROCESS_FLAG`:
- `P` => `Completed`
- `x` => `In Progress`
- `E%` => `Error`

### 3.3 Query strategy (aligned with AGENT.md)
Use the exact checkpoints:
- `gvi_filewheel_order_interface` with `program = 'SSP'`
- `gvi_filewheel_order_interface` with `program <> 'SSP'`
- `gvi_internal_order_interface` with `direction is null`
- `gvi_internal_order_interface` with `direction = 'OUTBOUND'`
- `oe_order_headers_all` + `oe_order_lines_all` in GOM

### 3.4 Performance and reliability
- Add indexes for test/prod parity:
  - `gvi_filewheel_order_interface(customer_order_reference_nbr, file_name, program, process_flag)`
  - `gvi_internal_order_interface(customer_order_reference_nbr, direction, process_flag)`
  - `oe_order_headers_all(cust_po_number)`
  - `oe_order_lines_all(header_id)`
- API timeout + graceful partial response if one DB is down
- Cache hot queries for short TTL (30-60s)

## 4) Mock Database Strategy for Testing
Primary recommendation for your requirement: use in-memory mock for development, and Oracle for integration/UAT.

### 4.1 Development mode (in-memory mock)
Use these files:
- `mock-db/schema.sql`
- `mock-db/seed.sql`
- `mock-db/README.md`

This allows fast local startup with deterministic data and no Oracle dependency.

### 4.2 Integration mode (Oracle container)
Use Oracle Free container and initialize two schemas:
- `GVI`
- `GOM`


This gives reproducible Oracle-like validation before production cutover.

## 5) Test Scenarios to Validate UI
1. Happy path: order reaches GOM (`Completed` all the way).
2. In-progress path: stop at `GVI Internal OUTBOUND`.
3. Error path: set one line `PROCESS_FLAG='E1'` with `ERROR_CODE`.
4. Correlation mismatch: same tracking key with wrong file name.
5. Multi-line order: mixed line statuses (one completed, one error).

## 6) Minimal rollout plan
1. Build DB pools + read-only queries.
2. Implement canonical event mapping and `/journey` endpoint.
3. Build timeline UI + line details grid.
4. Add error highlighting and filters.
5. Add synthetic monitoring + dashboards.
