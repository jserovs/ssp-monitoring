# Order Flow Repository Usage

## Environment
- Development: `DB_PROVIDER=sqlite`
- Integration/Production: `DB_PROVIDER=oracle`

## Example (Next.js route handler, TypeScript)
```ts
import { createOrderFlowRepository } from "@/server/order-flow";

export async function GET(_request: Request, context: { params: { trackingKey: string } }) {
  const repository = await createOrderFlowRepository({
    provider: process.env.DB_PROVIDER,
    // Only for Oracle mode:
    // gviPool,
    // gomPool,
  });

  const journey = await repository.getJourney(context.params.trackingKey);
  return Response.json({ trackingKey: context.params.trackingKey, journey });
}
```

## Required packages (when wiring into app)
- SQLite mode: `better-sqlite3`
- Oracle mode: `oracledb`

Install with pnpm:
```bash
pnpm add better-sqlite3 oracledb
```
