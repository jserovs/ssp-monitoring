# SQLite in-memory mock (development only)

Use this for local development while keeping a clean path to Oracle later.

## Why
- Fast startup
- No container dependency during frontend/backend development
- Deterministic seed data for SSP flow testing

## Schema and seed
- `mock-db/sqlite/schema.sql`
- `mock-db/sqlite/seed.sql`

## Runtime pattern (Node/Next.js)
Use SQLite in-memory connection string:
- `:memory:` for per-process ephemeral DB
- `file:ssp-dev?mode=memory&cache=shared` for shared in-memory (if your driver supports it)

On app start (dev mode only):
1. Open SQLite connection
2. Execute `schema.sql`
3. Execute `seed.sql`

## Adapter switch design
Create one repository interface and two implementations:
- `SqliteOrderFlowRepository` (dev)
- `OracleOrderFlowRepository` (prod)

Control via env var:
- `DB_PROVIDER=sqlite` (dev)
- `DB_PROVIDER=oracle` (prod)

## Contract to keep stable
Methods should return the same response shape regardless of provider:
- `getJourney(trackingKey)`
- `getOrderLines(trackingKey)`
- `searchOrders(query)`

## Notes
- Keep date values in ISO8601 text in SQLite.
- Avoid Oracle-specific SQL in shared code.
- Provider-specific SQL can live inside each repository class.
