---
title: "I built a URL shortener in a weekend — here's the boring foundation that makes everything else possible"
description: "Phase 1 of Systems Design in Practice: a Hono + Postgres URL shortener with two endpoints, Swagger UI, and a baseline latency measurement you'll reference for every phase that follows."
pubDate: '2026-03-04'
series: url-shortener-systems-design
seriesOrder: 1
draft: true
---

<!-- [YOUR VOICE] Open with 1–2 sentences on why you started this project. What were you trying to learn? Why a URL shortener specifically? -->

The goal of this series is to learn infrastructure concepts hands-on — not through tutorials, but by building something real and breaking it. A URL shortener is the perfect vehicle: it's trivial enough to understand in five minutes, and interesting enough to keep adding layers to.

This first post covers the foundation. No Redis, no load balancers, nothing clever. Just the app itself — and a latency measurement that will become a reference point for every post that follows.

---

## The app in two endpoints

```
POST /shorten   — takes a URL, returns a slug
GET  /:slug     — looks up the slug, redirects to the original URL
```

That's it. Everything in this series is about making these two endpoints faster, more resilient, and more observable. Keeping the app trivial is a feature — it means every new concept gets your full attention.

<!-- [VISUAL AID: simple request/response diagram — POST /shorten returns {"slug": "abc123"}, GET /abc123 returns 301 to original URL] -->

---

## Why Hono

<!-- [YOUR VOICE] Add your actual reasoning here. Did you evaluate anything else? Express.js? Fastify? What made Hono feel right for this? -->

Hono is a small, fast web framework that runs on any JS runtime — Node, Bun, Cloudflare Workers, Deno. For this project, it has two things I care about:

1. **First-class TypeScript** — no ceremony, no workarounds
2. **`@hono/zod-openapi`** — schema validation and OpenAPI spec generation from the same source

That second point matters a lot, which I'll get to in a moment.

---

## Schema design

The database has one table:

```sql
CREATE TABLE urls (
  id         SERIAL PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count  INTEGER NOT NULL DEFAULT 0
);
```

<!-- [YOUR VOICE] Why these columns? Walk through any decisions you made — for example, why hit_count in the same table vs. a separate analytics table? Any tradeoffs you considered? -->

A few design decisions worth noting:

- `slug` has a `UNIQUE` constraint — the database enforces no collisions, which simplifies the application layer
- `hit_count` is a rough analytics field; it's not atomic-safe under high concurrency, but it's good enough for a baseline

<!-- [VISUAL AID: simple ERD / table diagram showing the urls table columns and types] -->

---

## Slug generation: three approaches

There are three common ways to generate slugs, each with different tradeoffs:

| Approach | Example | Pros | Cons |
|----------|---------|------|------|
| **Random (nanoid)** | `gV5kXp` | No coordination needed, unpredictable | Slightly longer for the same collision resistance |
| **Hash of URL** | `sha256(url)[:7]` | Deterministic — same URL, same slug | Hash collisions require handling; leaks URL structure |
| **Sequential** | `0001`, `0002` | Short, predictable length | Requires coordination; enumerable (privacy concern) |

I went with nanoid (random). Here's why:

<!-- [YOUR VOICE] Fill in your actual reasoning. The table gives them the tradeoffs — now tell them what tipped the decision for you. -->

```ts
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 7);
```

A 7-character slug from a 36-character alphabet gives you ~78 billion possible combinations. At a million slugs created per day, you'd expect your first collision after roughly 200 years. Safe enough.

---

## OpenAPI as documentation-as-code

`@hono/zod-openapi` lets you define your request/response schemas once, and get two things for free: **runtime validation** and **an OpenAPI spec**. The Swagger UI at `/docs` becomes your interactive frontend — no separate frontend needed while you're building.

```ts
const shortenRoute = createRoute({
  method: 'post',
  path: '/shorten',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({ url: z.string().url() }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ slug: z.string(), short_url: z.string() }),
        },
      },
      description: 'Shortened URL',
    },
  },
});
```

<!-- [YOUR VOICE] Did you find this approach useful? Any friction with the library? -->

<!-- [VISUAL AID: screenshot of the Swagger UI at /docs showing the two endpoints] -->

---

## Deployment: single VPS behind Caddy

<!-- [YOUR VOICE] Describe your actual setup — VPS size, OS, how you provisioned it. What does your Caddy config look like? -->

The deployment is intentionally simple: one Hetzner VPS, Caddy as a reverse proxy. Caddy handles TLS automatically. The app runs in a Docker container.

<!-- [VISUAL AID: architecture diagram — browser → Caddy → Hono app → Postgres, all on one VPS. Keep it simple, one box.] -->

A single-node setup is exactly right for Phase 1. It makes the baseline latency measurement meaningful — there's no load balancer, no network hops between services, nothing to confuse the numbers.

---

## Measuring the baseline

Before doing anything else, I measured redirect latency. This number will be referenced in every subsequent phase — it's the thing every optimization gets compared against.

<!-- [YOUR VOICE] This is the most important section to fill in. Report your actual numbers here. -->

I used [tool you used — wrk, k6, hey, curl loop] to send [N] requests to `GET /:slug` against the live VPS.

| Percentile | Latency |
|------------|---------|
| p50 | — |
| p95 | — |
| p99 | — |

<!-- [YOUR VOICE] What do these numbers tell you? Are they what you expected? What does Postgres query time look like compared to network overhead? EXPLAIN ANALYZE output if you ran it. -->

The important thing isn't the absolute numbers — it's having them. Every subsequent phase will change something about the system and we'll compare against this baseline.

---

## What's next

Phase 2 adds Redis. Every redirect currently hits Postgres — but a redirect is a pure read, and the slug-to-URL mapping almost never changes. It's the ideal cache candidate.

Before that: measure, measure, measure. The baseline you establish here is the only honest way to know whether the next change actually helped.

---

*I used AI to scaffold the implementation. All measurements, configuration decisions, and failure observations are from running this on a real VPS.*
