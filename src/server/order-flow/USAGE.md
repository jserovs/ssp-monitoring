# Order Flow Repository Usage

## Environment
- Development: `DB_PROVIDER=oracle`
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

## Example (orders list page data)
```ts
const repository = await createOrderFlowRepository({ provider: process.env.DB_PROVIDER });
const orders = await repository.getAllOrders({ limit: 50, offset: 0, query: "" });
```

## Required packages (when wiring into app)
- Oracle mode: `oracledb`

Install with pnpm:
```bash
pnpm add oracledb
```
