# Mock Oracle DB for SSP Monitoring

## Start
```bash
docker compose -f mock-db/docker-compose.yml up -d
```

### Podman (without compose provider)
```bash
podman run -d \
  --name ssp-oracle-mock \
  -p 1521:1521 \
  -e ORACLE_PASSWORD=oracle \
  -e APP_USER=app \
  -e APP_USER_PASSWORD=app \
  -v /home/js/dev/ssp-monitoring/mock-db/init:/container-entrypoint-initdb.d:Z \
  docker.io/gvenzl/oracle-free:23-slim
```

Use the fully qualified image name (`docker.io/gvenzl/oracle-free:23-slim`) when Podman short-name resolution is not configured.

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
from gvi_filewheel_order_interface
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


wget https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.deb
sudo dpkg -i jdk-21_linux-x64_bin.deb
~/Downloads/sqlcl/bin/sql app@localhost:1521/FREEPDB1



select
         customer_order_reference_nbr,
         file_name,
         min(creation_date) as creation_date,
         max(last_update_date) as last_update_date,
         count(*) as line_count,
         listagg(process_flag, ',') within group (order by process_flag) as process_flags,
         max(consignee_code) as consignee_code,
         max(consignee_reference) as consignee_reference,
         max(mark) as mark,
         max(ssp_invoice_type) as ssp_invoice_type
       from gvi_filewheel_order_interface
       group by customer_order_reference_nbr, file_name



select
         customer_order_reference_nbr,
         file_name,
         min(creation_date) as creation_date,
         max(last_update_date) as last_update_date,
         count(*) as line_count,
         listagg(process_flag, ',') within group (order by process_flag) as process_flags,
                  max(mark) as mark,
         max(ssp_invoice_type) as ssp_invoice_type
       from gvi_filewheel_order_interface
       group by customer_order_reference_nbr, file_name;       