-- Seed data mapped from Oracle samples

INSERT INTO gvi_filewheel_order_interface (
  gvi_interface_line_id, context, program, process_flag, error_code, file_name, line_number,
  requested_delivery_date, requested_quantity, creation_date, last_update_date,
  currency_code, uom_code, customer_order_reference_nbr, net_price, mark,
  ssp_sender_or_recipient, ssp_invoice_type
) VALUES
  (401131, 'ORDER', 'SSP', 'P', NULL, 'S214131398', '1', '2026-02-19T08:11:19Z', 4, '2026-02-19T08:11:19Z', '2026-02-19T08:11:19Z', NULL, 'pcs', '5204-8477833', 194.01, 'S214131398', NULL, 'CN'),
  (401137, 'ORDER', 'ATD', 'P', NULL, 'S214131398', '1', '2026-02-19T08:11:19Z', 4, '2026-02-19T08:11:19Z', '2026-02-19T08:14:20Z', NULL, 'pcs', '5204-8477833', 194.01, NULL, 'SENDER', 'CN'),
  (401138, 'ORDER', 'BIGBRAND', 'P', NULL, 'S214131398', '1', '2026-02-19T08:11:19Z', 4, '2026-02-19T08:11:19Z', '2026-02-19T08:14:20Z', NULL, 'pcs', '5204-8477833', 194.01, 'S214131398', 'RECIPIENT', 'CN');

INSERT INTO gvi_internal_order_interface (
  subsystem, context, creation_date, last_update_date, program, process_flag,
  error_code, customer_order_number, order_reference, line_number, item_code,
  requested_quantity, requested_date, scheduled_quantity, schedule_date,
  currency_code, net_price, gvi_fw_interface_line_id, direction, customer_order_reference_nbr
) VALUES
  ('GVI', 'ORDER_11', '2026-02-19T08:14:20Z', '2026-02-19T08:14:20Z', 'ATD', 'P', NULL, '5204-8477833', 'SSP ATD S214131398 1000841454', '1', 'T432197', 4, '2026-02-19T23:59:00Z', 4, '2026-02-19T23:59:00Z', NULL, 194.01, 401137, NULL, '5204-8477833'),
  ('GVI', 'ORDER_11', '2026-02-19T08:14:20Z', '2026-02-19T08:19:56Z', 'ATD', 'P', NULL, '5204-8477833', 'SSP ATD S214131398 1000841454', '1.1', 'T432197', 4, '2026-02-19T23:59:00Z', 4, '2026-02-19T23:59:00Z', NULL, 194.01, 401137, 'OUTBOUND', '5204-8477833'),
  ('GVI', 'ORDER_11', '2026-02-19T08:14:20Z', '2026-02-19T08:14:20Z', 'BIGBRAND', 'P', NULL, '5204-8477833', 'SSP ATD', '1', 'T432197', 4, '2026-02-19T23:59:00Z', 4, '1999-12-31T00:00:00Z', NULL, 194.01, 401138, NULL, '5204-8477833'),
  ('GVI', 'ORDER_11', '2026-02-19T08:14:20Z', '2026-02-19T08:20:01Z', 'BIGBRAND', 'P', NULL, '5204-8477833', 'SSP ATD', '1.1', 'T432197', 4, '2026-02-19T23:59:00Z', 4, '1999-12-31T00:00:00Z', NULL, 194.01, 401138, 'OUTBOUND', '5204-8477833');

INSERT INTO gom_oe_order_headers_all (
  header_id, order_number, cust_po_number, ordered_date, flow_status_code, creation_date
) VALUES
  (910001, 'GOM-1000841454', '5204-8477833', '2026-02-19T08:25:00Z', 'BOOKED', '2026-02-19T08:25:00Z');

INSERT INTO gom_oe_order_lines_all (
  line_id, header_id, line_number, inventory_item_id, ordered_quantity, flow_status_code, request_date, creation_date
) VALUES
  (920001, 910001, '1', 1000841454, 4, 'AWAITING_SHIPPING', '2026-02-19T23:59:00Z', '2026-02-19T08:26:00Z');
