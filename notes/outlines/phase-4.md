# Post 4 Draft — Horizontal Scaling

> *I used AI to scaffold the implementation. All measurements, configuration decisions, and failure observations are from running this on a real VPS.*

---

**Title:** *What breaks when you add a second server — stateless design in practice*

**TL;DR:**
<!-- YOUR WORDS: 2-3 sentences. Something like: "Adding a second server was straightforward because every earlier decision
     treated state as external. Redis holds the cache and rate limit counters. Postgres holds the data.
     The only real 'what broke' moment was discovering that localhost URLs obviously don't work from node 2 —
     and that realization clarified what statelessness actually means in practice." -->

---

**Who this is for:** This post assumes you've followed the series. You should understand what a reverse proxy does and have basic familiarity with Linux services. No prior distributed systems experience required.

*No new application dependencies. Infrastructure change only: a second VPS, an updated Caddyfile.*

---

**Intro hook:**
Horizontal scaling sounds scary until you understand what it actually requires. For this app, adding a second server was almost trivially easy — because of decisions made in earlier phases. Here is what those decisions were, and what would have broken if different ones had been made.

---

## What "Stateless" Actually Means

The textbook definition: any request can be handled by any server.

The practical definition: no server stores anything that another server can't access.

If a server holds state that isn't shared — an in-memory session map, a local file, a process-level cache — requests must be routed to the specific server that holds that state. The ability to route anywhere is lost.

Here is what breaks when adding a second server to a stateful app:

- **In-memory session store:** a user logs into node 1, session lives in node 1's memory. Node 2 has no record. The user's next request hits node 2 and appears logged out.
- **Node-local cache:** node 1 warms its cache with Redis lookups. Node 2 starts cold. Every request to node 2 is a cache miss that goes to Postgres — adding load instead of relieving it.
- **In-memory rate limiter:** each node tracks its own per-IP counter. An attacker splits 20 requests evenly across both nodes — each node sees 10, neither triggers the limit. The rate limit is silently broken.

This list isn't theoretical. These are real failure modes that bite real teams.

<!-- YOUR WORDS: Have you seen any of these in the wild? Was there a moment reading this list where something clicked?
     Set up the comparison for your readers: now audit this app and see whether any of these apply. -->

---

## Auditing the App's State

Before adding a second node, run an explicit audit: what state does this app hold, and where does it live?

| State | Lives in | Accessible by both nodes? | Notes |
|-------|----------|--------------------------|-------|
| URL records | Postgres | ✅ Yes | Both nodes connect to the same instance |
| Redirect cache | Redis | ✅ Yes | Populated by either node, read by either |
| Rate limit counters | Redis | ✅ Yes | Redis was chosen over in-memory in Phase 3 for exactly this reason |
| In-flight HTTP request | Process memory | N/A | Stateless HTTP — no cross-request state |
| OpenAPI spec | Compiled into the binary | ✅ Yes (same code, same spec) | |

Result: nothing node-local. Every piece of mutable state is in Postgres or Redis.

<!-- YOUR WORDS: Go through the actual codebase and confirm this audit is complete.
     Are there any global variables, module-level Maps, or in-process caches you added along the way?
     Document what was observed. -->

This is the payoff of Phase 2 and Phase 3. The cache could have been implemented as an in-process `Map<slug, url>` — simpler, zero network overhead, one less dependency. Rate limiting could have used a `Map<ip, timestamps[]>`. Both would have worked fine on a single node. Neither works correctly on two.

---

## The Architecture Change

Before:

```mermaid
graph LR
  Client --> Caddy
  Caddy --> App["App (node 1)"]
  App --> Redis
  App --> Postgres
```

After:

```mermaid
graph LR
  Client --> Caddy
  Caddy --> AppA["App (node 1)"]
  Caddy --> AppB["App (node 2)"]
  AppA --> Redis
  AppB --> Redis
  AppA --> Postgres
  AppB --> Postgres
```

Caddy distributes requests across both nodes. Redis and Postgres remain on node 1 (or a dedicated host — network-accessible from both).

---

## The Health Check Endpoint

Caddy needs a way to know whether a node is alive. Add a `GET /health` endpoint:

```typescript
// src/routes/health.ts
import { OpenAPIHono } from '@hono/zod-openapi'

export const healthRouter = new OpenAPIHono()

healthRouter.get('/health', (c) => c.json({ status: 'ok' }))
```

```typescript
// src/index.ts
import { healthRouter } from './routes/health'
// ...
app.route('/', healthRouter)
```

This endpoint intentionally does nothing except return 200. Database connectivity is not checked here — that's a deeper health check (sometimes called a "readiness probe") with different tradeoffs. For the load balancer's purposes, 200 means the process is alive and accepting connections.

<!-- YOUR WORDS: Did you consider a deeper health check (e.g., pinging Redis and Postgres)?
     What's the argument for keeping it simple? What would a false positive look like
     (process alive, database unreachable)? -->

---

## The Caddyfile Update

```caddy
yourdomain.com {
  reverse_proxy node1_ip:3000 node2_ip:3000 {
    health_uri     /health
    health_interval 10s
    health_timeout  5s
  }
}
```

`health_uri /health` tells Caddy to ping this path on each upstream every `health_interval`. If the check fails, the upstream is removed from rotation until it recovers.

`round_robin` is the default load balancing policy — requests are distributed evenly, one at a time, across all healthy upstreams. This is the right choice when response times are similar across nodes, which they are here.

<!-- YOUR WORDS: Replace node1_ip and node2_ip with your actual private network IPs.
     Did you use Hetzner's private network feature, or public IPs with firewall rules?
     Note: for production, you wouldn't want app nodes publicly reachable — traffic should only come through the load balancer. -->

---

## What Broke (And How I Fixed It)

Adding the second node wasn't as smooth as the architecture diagram suggests. Here are the real failures I hit:

**Failure 1: `DATABASE_URL` missing on node 2**

The node 2 `docker-compose.yml` only had `REDIS_URL` and `PORT`. The app needs `DATABASE_URL` to connect to Postgres on node 1. Without it, the container crashed with:

```
Error: Please provide required params for Postgres driver:
    [x] url: undefined
```

Fix: add `DATABASE_URL=postgresql://postgres:PASSWORD@node1_ip:5432/urlshortener` to node 2's environment.

**Failure 2: Redis URL pointed to a local container that doesn't exist**

The original compose used `REDIS_URL: redis://redis:6379`, which works on node 1 where the `redis` container lives. On node 2, there's no `redis` container — that hostname doesn't resolve.

Fix: change node 2's `REDIS_URL` to `redis://node1_ip:6379`.

**Failure 3: Postgres wasn't listening on the private network**

Even with the right `DATABASE_URL`, node 2 got `ECONNREFUSED 10.0.0.2:5432`. Postgres inside Docker was only bound to localhost. Node 2 couldn't reach it.

Fix: add a port binding to node 1's `docker-compose.yml`:

```yaml
postgres:
  # ... existing config ...
  ports:
    - "10.0.0.2:5432:5432"
```

Then restart Postgres on node 1.

**Failure 4: Redis also wasn't listening on the private network**

The exact same problem as Postgres. Node 2 got hanging connections to `10.0.0.2:6379`. Redis had no host port binding.

Fix: add a port binding to node 1's `docker-compose.yml`:

```yaml
redis:
  # ... existing config ...
  ports:
    - "10.0.0.2:6379:6379"
```

**Failure 5: Caddy inside Docker can't reach node 1 via private IP**

The Caddy container runs on a Docker bridge network. From inside that container, `10.0.0.2:8082` (node 1's private IP) is unreachable — it times out. But `10.0.0.3:8082` (node 2) works because that traffic routes externally.

The fix is to use Docker's internal DNS for node 1. Since the Caddy container and node 1's url-shortener container share the same Docker network on node 1, use the service name:

```caddy
shrtn.bustamam.tech {
    reverse_proxy url-shortener:8082 10.0.0.3:8082 {
        health_uri     /health
        health_interval 10s
        health_timeout 5s
    }
}
```

`url-shortener:8082` resolves via Docker's embedded DNS to the container on node 1. `10.0.0.3:8082` reaches node 2 over the private network.

**Failure 6: Another container was already using port 5432**

When trying to add the Postgres port binding, Docker complained `failed to listen on TCP socket: address already in use`. A container called `neon_sync` was already bound to port 5432. I had forgotten about it.

Fix: stop the conflicting container, then recreate Postgres with the port binding.

---

## Working Configurations

### Node 1 (Postgres, Redis, Caddy, App)

```yaml
services:
  postgres:
    image: postgres:16
    container_name: postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-urlshortener}
    ports:
      - "10.0.0.2:5432:5432"
    # ... rest of postgres config ...

  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "10.0.0.2:6379:6379"
    # ... rest of redis config ...

  url-shortener:
    image: ghcr.io/abustamam/url-shortener:latest
    container_name: url-shortener
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/urlshortener
      PORT: 8082
      REDIS_URL: redis://redis:6379
      SERVER_ID: url-shortener-1
    ports:
      - "8082:8082"
    depends_on:
      - postgres
      - redis

  caddy:
    image: caddy
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
```

### Node 2 (App only)

```yaml
services:
  url-shortener:
    image: ghcr.io/abustamam/url-shortener:latest
    container_name: url-shortener
    command: ["bun", "run", "src/index.ts"]  # Skip migrations — node 1 handles them
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@10.0.0.2:5432/urlshortener
      PORT: 8082
      REDIS_URL: redis://10.0.0.2:6379
      SERVER_ID: url-shortener-2
    ports:
      - "10.0.0.3:8082:8082"
```

Note the `command` override: the Dockerfile runs `db:migrate` before starting the server. On node 2, migrations are skipped since the database is already managed by node 1. Without this override, node 2 crash-loops on startup.

---

## The Chaos Test

> **HANDS-ON — run this and observe the failover**

With both nodes running and traffic flowing:

**Step 1: confirm both nodes are receiving traffic.**

The app doesn't log individual requests, so tailing application logs shows nothing. The simplest verification is a response header identifying which node served the request. Add this middleware to `src/index.ts` (before the route handlers):

```typescript
app.use('*', (c, next) => {
  c.header('X-Served-By', process.env.SERVER_ID || 'unknown')
  return next()
})
```

Set `SERVER_ID=url-shortener-1` on node 1 and `SERVER_ID=url-shortener-2` on node 2, then rebuild and redeploy.

Verify round robin:

```bash
for i in {1..10}; do
  curl -s -I https://shrtn.bustamam.tech/<your-slug> | grep -i x-served-by
done
```

You should see the header alternate between the two node IDs.

**Note:** If most requests hit the same node, this is likely HTTP/2 connection reuse — Caddy keeps the connection open and reuses it. This is normal behavior and does not affect real traffic from multiple clients. To force new connections for testing, add `-H "Connection: close"`:

```bash
for i in {1..10}; do
  curl -s -I -H "Connection: close" https://shrtn.bustamam.tech/<your-slug> | grep -i x-served-by
done
```

**Step 2: kill node 1.**

```bash
docker compose stop url-shortener   # on node 1
```

Wait up to 10 seconds (the health check interval), then send more requests. All should now show `X-Served-By: url-shortener-2`.

**Step 3: observe Caddy's behavior.**

If Caddy is shared with other services, its logs will be noisy. You can filter to just your site:

```bash
# If using systemd
journalctl -u caddy -f | grep shrtn.bustamam.tech

# Or if running in Docker
docker compose logs -f caddy | grep shrtn.bustamam.tech
```

Alternatively, configure Caddy to log this site to its own file:

```caddy
shrtn.bustamam.tech {
  log {
    output file /var/log/caddy/shrtn.log
  }
  reverse_proxy ...
}
```

<!-- YOUR WORDS: What did you actually see in the Caddy logs when node 1 went down?
     How long did it take for Caddy to remove node 1 from rotation?
     Were there any failed requests during the failover window? -->

**Step 4: restart node 1 and confirm it re-enters rotation.**

```bash
docker compose start url-shortener   # on node 1
```

Wait for the health check to pass. `X-Served-By` should start alternating again.

<!-- YOUR WORDS: How long did re-entry take? Did Caddy immediately start sending traffic to node 1
     after the first successful health check, or did it wait for multiple successes? -->

---

## What Would Have Broken

Thought experiments that make the lesson concrete:

**If an in-memory rate limiter had been used (Phase 3):**
Each node maintains its own counter per IP. An attacker makes 5 requests per second, alternating IPs or load-balanced across nodes. Each node sees 2-3 requests — well below the per-node limit. The rate limiter appears to work but is trivially bypassed.

**If redirects were cached in-process:**
Node 2 starts cold. Every request to node 2 is a Postgres lookup. As traffic grows, adding nodes doesn't relieve Postgres — it increases load. The cache that was supposed to help now hurts at scale.

**If sessions were stored in memory:**
Users authenticated against node 1 get logged out when their next request hits node 2. The bug is intermittent (depends on which node you hit) and difficult to reproduce. Classic sticky-session debugging nightmare.

None of these would have been obvious at Phase 1 with one node. They surface exactly when you scale.

---

## Measurement

> **HANDS-ON — confirm latency hasn't regressed**

Run the same 20-request curl loop from Phase 1 and compare:

| Metric | Phase 1 (1 node, no cache) | Phase 2 (1 node, warm cache) | Phase 4 (2 nodes, warm cache) |
|--------|---------------------------|------------------------------|-------------------------------|
| p50 | ___ ms | ___ ms | ___ ms |
| p95 | ___ ms | ___ ms | ___ ms |

Phase 4 latency should be similar to Phase 2 — the gain from adding nodes is **availability and throughput**, not single-request speed.

<!-- YOUR WORDS: What were the actual numbers? Did anything change?
     Any variance from requests being load-balanced across nodes with slightly different characteristics?
     (Nodes with slightly different clock drift, different kernel versions, etc.) -->

---

## Trade-offs

**Single-region:** Both nodes and the shared Postgres/Redis are in the same datacenter. A datacenter outage takes everything down. That's a deliberate simplification — multi-region introduces replication, latency, and consistency tradeoffs that deserve their own series.

**No automatic failover for Postgres:** Both nodes point at the same Postgres instance. If Postgres goes down, the entire app is down regardless of how many app nodes are running. Postgres replication and failover is Phase 6.

**Health check window:** With `health_interval 10s`, there's a window of up to 10 seconds during which a dead node receives traffic before Caddy removes it. Clients see errors during that window. You can tune this down, but there's a cost: more frequent health checks increase load.

<!-- YOUR WORDS: Did the health check interval matter in practice?
     Was 10 seconds an acceptable window for your use case? -->

---

## Closer

Scaling out was easy because the app was built to be stateless. Now that there are two nodes and shared infrastructure, the next question is: what's actually happening across all of this? When a request is slow, is it Redis? Postgres? The app itself? There is no way to answer that yet. That's observability, and it's the next phase.

<!-- YOUR WORDS: How did this phase feel in terms of effort vs. impact?
     Was it anticlimactic because everything just worked? If so, say so — that's the lesson. -->

---

## Further Reading

- *Designing Data-Intensive Applications*, Ch. 1 — Reliability, Scalability, Maintainability
- [Caddy reverse_proxy directive](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) — full docs on health checks and load balancing policies
- [The 12-Factor App — Factor VI: Processes](https://12factor.net/processes) — the canonical statement on statelessness
- [Hetzner Private Networks](https://docs.hetzner.com/cloud/networks/overview/) — how to keep app-to-database traffic off the public internet
