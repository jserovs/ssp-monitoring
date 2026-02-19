# DB Provider Switch Plan (SQLite -> Oracle)

## Objective
Use in-memory SQLite for development now, then switch to Oracle with minimal code changes.

## Implementation

### 1) Provider selector
Read `DB_PROVIDER` from env and instantiate repository:
- `sqlite` => SQLite repository
- `oracle` => Oracle repository

### 2) Repository interface
Define one interface used by API/routes:
- `getJourney(trackingKey: string)`
- `getOrderLines(trackingKey: string)`
- `searchOrders(params)`

### 3) Shared mapping
Centralize status mapping:
- `P` => `Completed`
- `x` => `In Progress`
- `E*` => `Error`

### 4) SQL ownership
- SQLite SQL stays in SQLite repository
- Oracle SQL stays in Oracle repository
- API handlers never contain raw SQL

### 5) Development startup flow
In `DB_PROVIDER=sqlite` mode:
1. Initialize in-memory DB
2. Run `mock-db/sqlite/schema.sql`
3. Run `mock-db/sqlite/seed.sql`
4. Start app

## Benefits
- Frontend and API can be developed before Oracle connectivity is ready.
- Oracle cutover is mostly config + Oracle repository completion.
- Lower risk of large refactor at integration time.
