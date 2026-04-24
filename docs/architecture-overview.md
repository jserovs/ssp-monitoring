# SSP Monitoring Architecture

This diagram reflects the current implementation in this repository.

```mermaid
flowchart TB
  %% Clients
  U[User Browser] -->|HTTPS GET /orders| N[Next.js App Server]
  U -->|HTTPS GET /orders/:id| N

  %% Next.js pages to internal API
  subgraph APP[Next.js Application Container]
    direction TB
    P1[Orders Page\nsrc/app/orders/page.tsx]
    P2[Order Details Page\nsrc/app/orders/[id]/page.tsx]
    A1[API Route\nGET /api/orders]
    A2[API Route\nGET /api/orders/:trackingKey]
    A3[API Route\nGET /api/mock-files/:fileName]
    R[OracleOrderFlowRepository]
    O1[GVI Oracle Pool\nsingleton]
    O2[GOM Oracle Pool\nsingleton]
    F[(mock-files/*.pdf)]
  end

  N --> P1
  N --> P2
  P1 -->|server-side fetch| A1
  P2 -->|server-side fetch| A2
  A1 --> O1
  A2 --> O1
  A2 --> O2
  A1 --> R
  A2 --> R
  R -->|gvi_filewheel_order_int_ssp_v,\ngvi_internal_order_int_ssp_v| O1
  R -->|oe_order_headers_all,\noe_order_lines_all| O2
  A3 --> F
  P2 -->|Proof of Delivery URL| A3

  %% External systems
  O1 --> GVI[(Oracle DB - GVI schema)]
  O2 --> GOM[(Oracle DB - GOM schema)]

  %% Deployment
  subgraph DEPLOY[Deployment Pipeline]
    direction LR
    SRC[Source Code] --> D1[Docker multi-stage build]
    D1 --> IMG[Runtime image\nNext.js standalone]
    IMG --> RUN[Container runtime\nPORT=3000, USER=node]
  end
  RUN -.hosts.-> N

  %% Security
  subgraph SEC[Security Aspects]
    direction TB
    S1[Secrets via env vars:\nGVI_DB_*, GOM_DB_*]
    S2[No secrets committed:\n.env* ignored, .env.example allowed]
    S3[Least privilege runtime:\ncontainer runs as non-root node user]
    S4[Input hardening:\ntrackingKey required,\nmock-file route restricts to .pdf + path.basename]
    S5[DB safety:\nSQL uses bind params]
    S6[Operational risk:\nerror details currently returned in 500 responses]
  end

  S1 -.applies to.-> O1
  S1 -.applies to.-> O2
  S2 -.repo policy.-> SRC
  S3 -.runtime policy.-> RUN
  S4 -.applies to.-> A2
  S4 -.applies to.-> A3
  S5 -.applies to.-> R
  S6 -.applies to.-> A1
  S6 -.applies to.-> A2
```

## Data Flow Summary

1. Browser requests `/orders` or `/orders/:id`.
2. Server-rendered pages call internal API routes (`/api/orders`, `/api/orders/:trackingKey`).
3. API routes initialize/reuse singleton Oracle pools for GVI and GOM.
4. Repository executes read queries:
   - GVI: `gvi_filewheel_order_int_ssp_v`, `gvi_internal_order_int_ssp_v`
   - GOM: `oe_order_headers_all`, `oe_order_lines_all`
5. API aggregates response into order list/details/journey/lines JSON.
6. UI renders timeline and line diagnostics.
7. Proof of delivery uses `/api/mock-files/:fileName` to stream PDF from `mock-files/`.

## Deployment Summary

1. Docker stage `dependencies`: install packages from lockfile.
2. Docker stage `builder`: build Next.js in standalone mode.
3. Docker stage `runner`: copy standalone output, run `node server.js` as `node` user on port `3000`.
4. Environment variables are injected at runtime (`--env-file`).

## Security Notes

- Good controls already present:
  - Environment-based DB credentials, not hardcoded.
  - `.env` and `.env.*` ignored in git (with `.env.example` explicitly allowed).
  - Non-root container runtime (`USER node`).
  - Parameterized SQL (bind variables), reducing SQL injection risk.
  - Mock file endpoint prevents path traversal via `path.basename`.
- Gaps worth addressing:
  - API error responses expose raw `error.message`; consider generic client errors and detailed server-only logs.
  - No auth/rate limiting visible on API routes; add if deployed outside trusted network.
  - Consider network policy/TLS requirements between app and Oracle DB endpoints.

