# URL shortener series: finish or wrap up?

Decision memo for issue #34 ("Decide the URL shortener series"). This memo does
not decide. It lays out what exists, what each option costs, and an outline for
the wrap-up post if that is the choice. The author decides.

Claims are tagged MEASURED (read from the repo on 2026-11-23) or ASSUMED
(an estimate nobody has tested).

## Where the series stands

- Series page: `src/content/series/url-shortener-systems-design.md`. It promises
  six phases and shows an end-state diagram with a Caddy load balancer, multiple
  Hono nodes, a Postgres primary/replica and the Grafana LGTM stack. (MEASURED)
- Published: phases 1–3, on 2026-03-04, 2026-03-18 and 2026-05-06. Nothing since,
  so the series has been idle for about six months. (MEASURED)
- The phase 3 post ends by promising the next post ("when a second server is
  added"), and its trade-offs section says Phase 4 adds a second app node.
  (MEASURED)
- Outlines for phases 4–6 exist in `notes/outlines/phase-{4,5,6}.md`
  (273, 444 and 329 lines). They contain code, diagrams and section prose, plus
  `YOUR WORDS` placeholders (10, 12 and 12) and `HANDS-ON` sections that need a
  running system to fill in. Phase 6 is labelled "Stretch" in its outline.
  (MEASURED)
- Unknown: whether the Hetzner VPS and the `abustamam/url-shortener` repo state
  from phase 3 still exist and run. (ASSUMED unknown; check before choosing.)

## What phases 1–3 cover (published)

| Phase | Post | What it adds | Headline measurement |
|-------|------|--------------|----------------------|
| 1 | "A URL Shortener Is Not Just Two Endpoints" | Hono + Postgres, Swagger/OpenAPI, single VPS behind Caddy, k6 baseline | Off-box redirect p50 172ms / p99 191ms; on-box p50 41ms; query 0.091ms |
| 2 | "Adding Redis Broke the p99" | Redis cache-aside on `GET /:slug`, TTL decision | On-box p99 77.75ms → 25.39ms, throughput 18x; off-box p99 got worse (191 → 286ms) from the `hit_count` write |
| 3 | "Why Sliding Window Rate Limiting Beats Fixed Window" | Redis sorted-set sliding window on `POST /shorten`, fail-open | 10 requests → 201, next 5 → 429 |

(Figures copied from the published posts. MEASURED as text in the repo.)

Each post is about 2,000–2,200 words. (MEASURED with `wc -w`.)

## What phases 4–6 were planned to cover (outlines only)

| Phase | Planned title | What it adds | Hands-on work it needs |
|-------|---------------|--------------|------------------------|
| 4 | "I added a second server to my URL shortener — here's what broke" | Second VPS, state audit, `/health` endpoint, Caddy load balancing | Provision node 2, kill node 1 under traffic, record Caddy failover/re-entry, re-run the latency loop |
| 5 | Observability | Pino → Loki, prom-client → Prometheus (RED metrics, histograms, cache hit rate), OpenTelemetry → Tempo, a Grafana dashboard | Run four new services, generate traffic, read real dashboards and traces, measure instrumentation overhead |
| 6 | "I added Postgres replication to my URL shortener — then killed the primary" (stretch) | Streaming replica, read/write splitting, replication-lag gauge, read-your-own-writes edge case | Second Postgres host, kill the primary, record exact errors, measure lag and reconnect time |

(MEASURED from the outlines.)

The unresolved thread from phase 2 (the `hit_count` write that hurt off-box p99)
is not addressed by any of the three outlines. (MEASURED by reading them; worth
deciding whether it belongs anywhere.)

## Options and effort

All effort figures are ASSUMED estimates for the author to correct. They assume
the phase 3 environment still runs; add setup time if it doesn't.

### Option A: finish phases 4–6

- Work: three hands-on infrastructure builds, each followed by measurement and a
  ~2,000-word post. The outlines remove most of the scaffolding work but none of
  the measurement work, which is the part the series' credibility rests on.
- Effort (ASSUMED): phase 4 is the smallest (no new app dependencies, outline
  says "infrastructure change only"); phase 5 is the largest (four new services
  plus instrumentation); phase 6 needs a second database host. Rough order:
  4 < 6 < 5.
- Running cost (ASSUMED): one to two extra VPSes for the duration. Phase 1 put
  the lab box at $5.99/mo.
- Pay-off: the series page and end-state diagram become true as written; no
  edits to published content.
- Risk: another long gap mid-series; the positioning work in issue #34 competes
  for the same writing time.

### Option B: finish phase 4 only, then wrap up

- Work: one hands-on build (the one phase 3 explicitly promises) plus a wrap-up
  post; edit the series page to describe four phases.
- Effort (ASSUMED): phase 4 plus the wrap-up below.
- Pay-off: keeps the promise in the phase 3 closer, ends on a natural boundary
  (single node → horizontally scaled).
- Risk: the end-state diagram on the series page has to change.

### Option C: close at phase 3 with a wrap-up post

- Work: one short post (outline below) and edits to the series page so it no
  longer promises phases 4–6. The phase 3 closer's "next post" line also needs a
  one-line edit or a note.
- Effort (ASSUMED): the smallest option; no infrastructure work.
- Pay-off: frees writing time for the flagship posts in issue #34.
- Risk: the series reads as unfinished unless the wrap-up frames it as complete
  on purpose; the phase 4–6 outlines go unused (they can stay in `notes/`).

Whichever option is chosen, the series page
(`src/content/series/url-shortener-systems-design.md`) and possibly the phase 3
closer need edits. Those are outside this PR's scope.

## Outline: possible wrap-up post

Working title: "What Three Phases of a URL Shortener Taught Me (and Why I Stopped There)"

Frontmatter: `series: url-shortener-systems-design`, `seriesOrder: 4`,
`kind: "Case Study"`, `draft: true` until written.

1. **TL;DR.** What the series built, the three numbers that mattered, and the
   honest reason it ends here. *[author: the reason, in your words]*
2. **What got built.** One paragraph per phase, each with its headline
   measurement (table above). Link each post.
3. **The finding that surprised me most.** Candidate: adding Redis made the
   off-box p99 worse because of the `hit_count` write. *[author: confirm this is
   the one, or pick another]*
4. **What the measurements could and couldn't show.** On-box vs off-box latency,
   single VPS, synthetic k6 load. Same spirit as the benchmarking post.
5. **What phases 4–6 would have covered.** Short paragraph per phase from the
   outlines, framed as "here is the design, here is what you'd need to measure,"
   with no invented results. *[author: decide whether to publish the outlines
   as an appendix or link the repo]*
6. **Unfinished business.** The `hit_count` write; anything else left open.
   *[author: whether you fixed it]*
7. **If you want to continue it yourself.** Repo link, tag for phase 3
   (`v3-rate-limiting`), what to build next.
8. **Closer.** *[author: what the series was for, and what you're writing
   instead]*

## Decision

*[author: A, B or C, with one line on why. Then update issue #34.]*
