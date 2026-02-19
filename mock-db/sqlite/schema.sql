-- SQLite schema for SSP flow mocking (development only)

CREATE TABLE gvi_filewheel_order_interface (
  gvi_interface_line_id INTEGER PRIMARY KEY,
  context TEXT NOT NULL,
  program TEXT,
  process_flag TEXT NOT NULL DEFAULT 'x',
  error_code TEXT,
  file_name TEXT,
  line_number TEXT,
  requested_delivery_date TEXT,
  requested_quantity REAL,
  creation_date TEXT NOT NULL,
  last_update_date TEXT NOT NULL,
  currency_code TEXT,
  uom_code TEXT,
  customer_order_reference_nbr TEXT,
  net_price REAL,
  mark TEXT,
  ssp_sender_or_recipient TEXT,
  ssp_invoice_type TEXT
);

CREATE TABLE gvi_internal_order_interface (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subsystem TEXT,
  context TEXT NOT NULL,
  creation_date TEXT NOT NULL,
  last_update_date TEXT NOT NULL,
  program TEXT,
  process_flag TEXT DEFAULT 'x',
  error_code TEXT,
  customer_order_number TEXT,
  order_reference TEXT,
  line_number TEXT,
  item_code TEXT,
  requested_quantity REAL,
  requested_date TEXT,
  scheduled_quantity REAL,
  schedule_date TEXT,
  currency_code TEXT,
  net_price REAL,
  gvi_fw_interface_line_id INTEGER,
  direction TEXT,
  customer_order_reference_nbr TEXT
);

CREATE TABLE gom_oe_order_headers_all (
  header_id INTEGER PRIMARY KEY,
  order_number TEXT,
  cust_po_number TEXT,
  ordered_date TEXT,
  flow_status_code TEXT,
  creation_date TEXT NOT NULL
);

CREATE TABLE gom_oe_order_lines_all (
  line_id INTEGER PRIMARY KEY,
  header_id INTEGER NOT NULL,
  line_number TEXT,
  inventory_item_id INTEGER,
  ordered_quantity REAL,
  flow_status_code TEXT,
  request_date TEXT,
  creation_date TEXT NOT NULL,
  FOREIGN KEY (header_id) REFERENCES gom_oe_order_headers_all(header_id)
);

CREATE INDEX ix_gvi_fwoi_track
  ON gvi_filewheel_order_interface (customer_order_reference_nbr, file_name, program, process_flag);

CREATE INDEX ix_gvi_ioi_track
  ON gvi_internal_order_interface (customer_order_reference_nbr, direction, process_flag);

CREATE INDEX ix_gom_headers_po ON gom_oe_order_headers_all (cust_po_number);
CREATE INDEX ix_gom_lines_header ON gom_oe_order_lines_all (header_id);
