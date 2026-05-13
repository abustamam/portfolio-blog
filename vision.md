# URL Shortener — Systems Design Curriculum

A progressive infrastructure curriculum built on the simplest possible application.
The product is intentionally trivial so every phase isolates one infrastructure concept.

Two endpoints. That's the whole app:
- `POST /shorten` — takes a URL, returns a slug
- `GET /:slug` — redirects to the original URL

---

## Development Approach

Code in this project is AI-scaffolded. The posts are written by hand.

**AI-assisted:** boilerplate, schema definitions, middleware implementations, Docker Compose wiring, OTel SDK setup — anything read, understood, and explainable before publishing.

**Always hands-on:** all latency measurements (real VPS, real traffic), chaos experiments and failure observations (exact error messages, recovery steps, actual behavior), configuration decisions and the reasoning behind them.

Each post includes a disclosure: *"Code is AI-scaffolded. All measurements, configuration decisions, and failure observations are from running this on a real VPS."*

---

## Phase 1 — Baseline: Hono + Postgres + Swagger

**Goal:** Ship the simplest possible working URL shortener. No caching, no scaling, nothing clever.

**What this builds:**
- Hono app with two routes: `POST /shorten` and `GET /:slug`
- Schema validation with Zod via `@hono/zod-openapi`
- Swagger UI served at `/docs` — the interactive "frontend"
- Postgres via Drizzle (slugs, original URLs, created_at, hit count)
- Slug generation (nanoid)
- Deployed on a single Hetzner VPS behind Caddy

**The one concept:** Data modeling and baseline performance. Measure redirect latency now — you'll compare it at every subsequent phase.

**Blog post angle:** *"A URL shortener is not just two endpoints — here's the foundation everything else builds on"*
Covers: why Hono over a heavier framework, schema design, slug generation tradeoffs (random vs. hash vs. sequential), OpenAPI as documentation-as-code, why measurement precedes optimization

---

## Phase 2 — Caching with Redis

**Goal:** Stop hitting Postgres on every redirect. A redirect is a pure read — it's the ideal cache candidate.

**What this builds:**
- Redis on the same Hetzner box
- Cache-aside on `GET /:slug` — check Redis first, fall back to Postgres, populate cache on miss
- TTL strategy: what is the right expiry for a shortened URL?

**The one concept:** Cache-aside pattern, TTL decisions, cache invalidation (what happens if someone deletes a URL?)

**Blog post angle:** *"Adding Redis broke the p99 — cache invalidation is harder than it looks"*
Covers: why redirects are perfect cache candidates, the TTL decision, the deletion edge case, before/after latency numbers

---

## Phase 3 — Rate Limiting

**Goal:** Prevent abuse of `POST /shorten` without a database lookup on every request.

**What this builds:**
- Redis-backed rate limiter on the shorten endpoint (sliding window or token bucket)
- Per-IP limiting
- Appropriate error responses (429)

**The one concept:** Rate limiting algorithms — fixed window vs. sliding window vs. token bucket, and why the choice matters

**Blog post angle:** *"Why sliding window rate limiting beats fixed window — and why the algorithm choice matters"*
Covers: the three main algorithms with diagrams, why fixed window has a boundary exploit, Redis as the right store for this (atomic INCR + EXPIRE), what production systems actually use

---

## Phase 4 — Horizontal Scaling

**Goal:** Add a second Hetzner node. Watch what breaks. Fix it.

**What this builds:**
- Second VPS added to Caddy upstream
- Identify what breaks (hint: anything node-local — in-memory state, local file storage if any)
- Verify Redis is doing the right job as shared state

**The one concept:** Stateless application design — why your app needs to treat every node as disposable

**Blog post angle:** *"What breaks when you add a second server — stateless design in practice"*
Covers: what stateless actually means in practice, the difference between application state and data state, why Redis as shared layer makes horizontal scaling almost trivial for this app

---

## Phase 5 — Observability: Metrics, Logs, and Traces

**Goal:** Instrument the full stack. Answer real questions: which slugs get the most hits? Where is latency coming from? What's the cache hit rate?

### The Stack
| Tool | Role |
|------|------|
| **Prometheus** | Metrics (request rate, latency, cache hit/miss ratio) |
| **Loki** | Log aggregation — structured app and infra logs |
| **Tempo** | Distributed traces — follow a redirect through the system |
| **Grafana** | Unified dashboard for all three |
| **OpenTelemetry** | Instrumentation SDK — feeds Tempo and Loki |

**What this builds:**
- OTel SDK instrumented in Hono middleware
- Structured logging with Pino + Loki transport
- A Grafana dashboard answering: redirect latency p50/p95/p99, cache hit rate, top slugs by traffic, error rate

**The one concept:** The three pillars of observability — logs, metrics, traces — and why you need all three

**Blog post angle:** *"Instrumenting a URL shortener with the Grafana LGTM stack — what the metrics reveal"*
Covers: why logs alone are not enough, what a distributed trace actually shows, the cache hit rate metric that makes everything click, the RED method (Rate, Errors, Duration)

---

## Phase 6 — Database Replication (Stretch)

**Goal:** Add a Postgres read replica. Route redirect reads to the replica, writes to primary.

**What this builds:**
- Primary + replica Postgres on separate Hetzner VPSes
- Read/write splitting via two Drizzle client instances
- Intentional chaos: kill the primary, document the failure mode

**The one concept:** Replication, replication lag, and eventual consistency — what they mean when you actually experience them

**Blog post angle:** *"Postgres replication and intentional chaos — what failover actually looks like"*
Covers: why replication exists, what replication lag looks like in practice, the failover behavior, what "eventual consistency" actually feels like vs. how it is usually described

---

## Running Themes Across All Posts

- **Measure first** — establish a baseline in Phase 1 and reference it in every subsequent post
- **Show the failure before the fix** — demonstrate the problem, then solve it
- **One concept per post** — the app is simple enough that nothing competes for attention
- **Map to real systems** — each concept connects to how production systems at scale handle the same problem

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Server | Hono |
| API Docs | Zod OpenAPI + Swagger UI |
| ORM | Drizzle |
| Database | PostgreSQL |
| Cache / Rate Limiting | Redis |
| Reverse Proxy / LB | Caddy |
| Hosting | Hetzner VPS |
| Metrics | Prometheus |
| Logs | Loki |
| Traces | Tempo |
| Visualization | Grafana |
| Instrumentation | OpenTelemetry |

---

## Suggested Reading Alongside Each Phase

| Phase | Reading |
|-------|---------|
| 1 | Alex Xu — Ch. 8 (Design a URL Shortener) |
| 2 | Alex Xu — Ch. 6 (Design a Key-Value Store), DDIA Ch. 1 |
| 3 | Alex Xu — Ch. 4 (Design a Rate Limiter) |
| 4 | DDIA — Ch. 1 (Reliability, Scalability, Maintainability) |
| 5 | OpenTelemetry docs, Grafana LGTM stack guides |
| 6 | DDIA — Ch. 5 (Replication) |

---

## Future: Multiplayer Wordle

Once caching, rate limiting, stateless scaling, observability, and replication are intuitive, Multiplayer Wordle becomes a more interesting build. The infrastructure decisions are already motivated and familiar.