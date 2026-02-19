# Mock Oracle DB for SSP Monitoring

## Start
```bash
docker compose -f mock-db/docker-compose.yml up -d
```

## Connect
- Host: `localhost`
- Port: `1521`
- Service: `FREEPDB1`
- GVI user: `GVI` / `gvi`
- GOM user: `GOM` / `gom`

## Quick validation

### GVI
```sql
select program, process_flag, customer_order_reference_nbr, file_name
from gvi.gvi_filewheel_order_interface
where customer_order_reference_nbr = '5204-8477833';

select program, direction, process_flag, customer_order_reference_nbr
from gvi.gvi_internal_order_interface
where customer_order_reference_nbr = '5204-8477833';
```

### GOM
```sql
select oeoh.cust_po_number, oeoh.order_number, oeol.line_number, oeol.flow_status_code
from gom.oe_order_headers_all oeoh
join gom.oe_order_lines_all oeol on oeoh.header_id = oeol.header_id
where oeoh.cust_po_number = '5204-8477833';
```
