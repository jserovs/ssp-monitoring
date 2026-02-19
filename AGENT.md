# Project overall

this project is tend to monitor the SSP transactions

# Technology
- Oracle DB
- pnpm
- Nextjs
- TypeScript

## Development Notes
- Use TypeScript for application code (prefer `.ts` / `.tsx` in `src/`).
- Keep database access behind provider/repository abstractions so development can use SQLite and later switch to Oracle without API-level rewrites.

## UI and UX
UI should be able to track the oreders which came in for SSP program and help to track with ease the status of the order, visual representation of order flow, where order is currently what lines it has and help match 

## Step by step data flow
1. file arrives to shared folder
```
/ntmoveE/ftp/integration/na/321_B2B_NA_SSP
```

2. processed by SOA, and stored to archive
```
/ntmoveE/ftp/integration/na/321_B2B_NA_SSP/arrive
```

starting from this point status of order can be checked accoring to process_flag. Process_flag is set to 'P' when order, 'x' means in progress and 'E%' means error

3. lines inserted into gvi_filewheel_order_interface
```
select * from gvi_filewheel_order_interface
where CUSTOMER_ORDER_REFERENCE_NBR = :order_tracking_key
and file_name = :order_tracking_key_2
and program = 'SSP'
```
4. lines processed by SSP-interface towards normal filewheel order
```
select * from gvi_filewheel_order_interface
where CUSTOMER_ORDER_REFERENCE_NBR = :order_tracking_key
and file_name = :order_tracking_key_2
and program <> 'SSP'
```
we should be making sure that file_name (:order_tracking_key_2) and CUSTOMER_ORDER_REFERENCE_NBR (:order_tracking_key) are the ones that we could match towards the gvi_internal_order_interface

5. lines processed inside gvi_internal_order_interface

select * from gvi_internal_order_interface
where CUSTOMER_ORDER_REFERENCE_NBR = :order_tracking_key
and  direction is null

6. lines prepared for sending to GOM
select * from gvi_internal_order_interface
where CUSTOMER_ORDER_REFERENCE_NBR = :order_tracking_key
and  direction = 'OUTBOUND'

## 

7. order arrives to GOM
select * from oe_order_headers_all oeoh, oe_order_lines_all oeol
where oeoh.cust_po_number = :order_tracking_key
and oeoh.header_id = oeol.header_id

    
