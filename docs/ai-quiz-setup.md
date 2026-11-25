# AI quiz: response collection

`/ai-quiz` is static. On submit it POSTs JSON to `/api/ai-quiz` on the same
origin. Caddy routes that path to the `ai-quiz-intake` container
([`services/ai-quiz-intake`](../services/ai-quiz-intake)), which validates the
answers, re-scores them, and inserts one row into the `ai_quiz` database on the
box's Postgres.

```
browser ─POST /api/ai-quiz─▶ Cloudflare ─▶ Caddy (bustamam.tech)
                                             ├─ /api/ai-quiz* ─▶ ai-quiz-intake:3000 ─▶ postgres/ai_quiz.responses
                                             └─ everything else ─▶ portfolio-blog:80
```

Dev builds (`bun run dev`) have no backend, so the quiz shows a "responses
aren't being collected yet" notice. Set `PUBLIC_AI_QUIZ_ENDPOINT` to override
the endpoint in any build.

## What the service does

- Accepts only `POST /api/ai-quiz` (plus `GET /api/ai-quiz/health`).
- Bodies over 16 KB get a 413. Option values must be short kebab-case tokens
  from the form, and text fields are length-capped (task 600, name 120,
  contact 160).
- It ignores the browser's `track`, `recommend` and `score` and recomputes them
  with the same `src/utils/aiQuiz.ts` the page uses.
- `track` is the skill level from the scored questions (`foundations`,
  `applied`, `builder`). The track the result screen recommends (`everyday`,
  `connect`, `build`) is not a column: it follows from the `goal` answer in
  `answers`, and from the skill answers when the goal is `unsure` or missing.
  Rows from before the goal question have no `goal`.
- The hidden `website` honeypot field gets a fake `ok` and nothing is stored.
- Limits each IP to 10 submissions an hour (`RATE_LIMIT`), keyed on
  `X-Real-IP`, which Caddy sets from `Cf-Connecting-Ip`.
- Never echoes database errors to the client.
- After a row is saved, sends a Telegram message (name, recommended track,
  goal, skill level, score, payer, start, task) when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
  are set. Contact details are never sent; read them from the database. The
  message is fire-and-forget: a Telegram failure is logged as `notify failed`
  and the submission still succeeds. The startup log line `notifications`
  says whether it's on.

Tests: `bun test services/ai-quiz-intake` (runs in CI).

## Cohort intake form

`/ai-cohort/intake` is the pre-session form for people who have paid for
cohort 1. It is unlisted: the page has `<meta name="robots" content="noindex">`,
the sitemap filter in `astro.config.mjs` drops `/ai-cohort/`, and nothing in
the nav links to it. Share the link in the participants' WhatsApp group.
`tests/ai-cohort-intake.spec.ts` checks the built `dist` for both.

It POSTs to `POST /api/ai-quiz/intake`, which sits under the existing Caddy
route, so Caddy needs no change. The same service handles it, with the same
rules as the quiz:

- Bodies over 16 KB get a 413, and the hidden `website` honeypot gets a fake
  `ok` with nothing stored.
- The quiz and the intake form share one rate limit per IP (`RATE_LIMIT`).
- Choices must be values from the whitelist in
  `services/ai-quiz-intake/src/intake.ts`, which is also what the page renders.
  Text is length-capped (name 120, contact 160, task 600, private-files note
  400). Name, contact, task, time taken, track, and recording consent
  (`recordingConsent: true`) are required.
- People pick the track they reserved on `/ai-training/` (Everyday AI, Connect,
  Build). Connect also asks which email/calendar (Google, Microsoft) and whether
  it's a work account; Build asks which computer, how much code they've written,
  and (optionally) what they want to build. Those answers go in the `extras`
  jsonb column; answers for another track are dropped. Rows from before this
  change keep the quiz's track names.
- Each saved row goes in `cohort_intake` and triggers a Telegram message with
  name, track, time taken, task, and the Connect/Build setup. Contact details and the private-files note
  are never sent. A failure is logged as `intake notify failed`.

## Cohort waitlist

`/ai-cohort/waitlist` is where people go once the cohort's Stripe payment link
sells out (it stops after 8 payments). Put the URL in the payment link's
sold-out message, and share it in the WhatsApp group once seats are gone. It's
unlisted the same way as the intake form, and not in the cohort nav, because
that nav is for participants.

It asks for name and contact (both required) and an optional note (capped at
400 characters), and POSTs to `POST /api/ai-quiz/waitlist`. Same service, same
Caddy route, same honeypot and body limit, and the same per-IP rate limit as
the quiz and the intake form. Each row goes in `cohort_waitlist` and sends a
Telegram message with the name and note, never the contact details. Failures
are logged as `waitlist insert failed` and `waitlist notify failed`. Rules live
in `services/ai-quiz-intake/src/waitlist.ts`; browser tests in
`tests/ai-cohort-waitlist.spec.ts`.

## Quiz result: "Not ready to reserve?"

The quiz itself no longer asks for name or contact, so every quiz row is
anonymous. The ask sits on the result screen instead, under the reserve button,
once people have seen their track: optional name, plus email or WhatsApp
number. It POSTs to `POST /api/ai-quiz/waitlist` with `source: quiz:<track>`
(the recommended track: `everyday`, `connect` or `build`; rows from before the
goal question carry `foundations`, `applied` or `builder`), so the row lands in `cohort_waitlist`
next to the guides sign-ups. It is not linked to the quiz row. Browser test:
`tests/ai-quiz.spec.ts`.

The card also has a "Message me on WhatsApp" link, opened in a new tab. Every
"message me" link on `/ai-training/` and `/ai-training/reserved/` uses the same
link (`WHATSAPP_HREF` in `src/consts/aiQuiz.ts`; dev builds fall back to email). It
points at `GET /api/ai-quiz/whatsapp`, which answers with a 302 to
`https://wa.me/<WHATSAPP_NUMBER>`, so the number is in the server's env and
never in the site's HTML or JS. A browser test fails if any built file carries
a `wa.me/<number>` link. The redirect has its own per-IP limit (30 an hour),
sends `X-Robots-Tag: noindex`, and is a 404 until `WHATSAPP_NUMBER` is set in
`/srv/.env`. Anyone who clicks still sees the number in WhatsApp; this only
keeps it out of the page source and away from scrapers that don't follow
redirects.

## Guides: "tell me when the next cohort opens"

The guides hub (`/ai-guides/`, under "When you want more") and the call to
action under every guide (`src/components/guides/GuideCta.astro`) carry one
optional field: email or WhatsApp number. The form is
`src/components/guides/NotifyForm.astro`. It is titled "Not ready to reserve?"
and first says that reserving is open now, with the first slot from
`TRAINING.slots` and a link to the tracks. It then says what the contact is for
(one message when the next cohort has dates, nothing else), and the guides read
the same without it, so "Free · no sign-up" stays true.

It POSTs `{ contact, source, website }` to the cohort waitlist endpoint
(`POST /api/ai-quiz/waitlist`), with the same honeypot, body limit and per-IP
rate limit. `source` is `guides-hub` or `guide:<id>` (capped at 60 characters
and checked against that pattern in `services/ai-quiz-intake/src/waitlist.ts`).
With a source the name is optional; without one (the `/ai-cohort/waitlist`
form) it is still required. Each row goes in `cohort_waitlist` with its
`source`, and the Telegram message names the source, never the contact. The
service log line `waitlist saved` carries the source too.

Without JavaScript the form says it needs JavaScript and gives the email
address. Dev builds have no backend, so it says nothing was sent. Until step 1d
below runs on the server, a guides sign-up gets a 500 (logged as
`waitlist insert failed`) and the form says it didn't send; the cohort waitlist
keeps working, because its insert names no `source`. Browser tests in
`tests/ai-guides-notify.spec.ts`.

## Payment alerts (Stripe webhook)

Each paid checkout on the cohort payment link sends a Telegram message with the
payer's name and amount, never their email or address. Stripe calls
`POST /api/ai-quiz/stripe-webhook` (same service and Caddy route) for
`checkout.session.completed` and `checkout.session.async_payment_succeeded`.

- The `Stripe-Signature` header is checked against `STRIPE_WEBHOOK_SECRET`
  (HMAC-SHA256, 5-minute tolerance). A bad signature is a 400 and logged as
  `stripe signature rejected`. Without the secret the path is a 404.
- Only sessions with `payment_status: paid` on `STRIPE_PAYMENT_LINK` notify;
  every other event gets a 200 so Stripe stops resending it.
- Not rate limited (Stripe sends from shared IPs; the signature is the gate).
- A Telegram failure returns 500 and is logged as `payment notify failed`, so
  Stripe retries the event.

Setup: in the Stripe dashboard, Developers → Webhooks → Add endpoint, URL
`https://bustamam.tech/api/ai-quiz/stripe-webhook`, events
`checkout.session.completed` and `checkout.session.async_payment_succeeded`.
Copy its signing secret (`whsec_...`) into `/srv/.env` as
`STRIPE_WEBHOOK_SECRET`, add `STRIPE_PAYMENT_LINK=plink_...` (the cohort link's
id), and recreate the container. Use "Send test event" in the dashboard to check:
the test event's session is not on the cohort link, so expect a 200 and no
message; a real payment sends one.

## Training page deposit counts

`/ai-training/` shows each track's deposits ("2 of 5 reserved to launch"). The
page fetches `GET /api/ai-quiz/tracks`, which returns
`{ ok: true, counts: { everyday, connect, build } }`. Same service, same Caddy
route, no rate limit (the counts are cached for 60 seconds, and a Stripe failure
serves the last good counts). If the endpoint fails, the page simply hides the
counters.

A track's count is its paid checkouts on its payment links, minus fully refunded
ones (`src/tracks.ts`). Two env vars turn it on:

- `STRIPE_TRACKS`: tracks and their payment link ids, e.g.
  `everyday=plink_full,plink_deposit;connect=plink_c;build=plink_b`. Everyday
  AI lists both the original $79 link and its $25 deposit link, so seats paid in
  full count too. Setting it also widens the payment webhook to every listed
  link (instead of `STRIPE_PAYMENT_LINK`), and the Telegram message names the
  track.
- `STRIPE_API_KEY`: a **restricted** key (Developers → API keys → Create
  restricted key) with **Read** on Checkout Sessions, PaymentIntents and
  Charges, and nothing else. Without it, the tracks path is a 404.

The startup log line `notifications` shows `tracks` and `counts`.

## Weekly funnel digest

One Telegram message a week with four counts, from data that already exists.
No tracking script, no cookies, nothing new stored. The site says so in one
line (the guides hub and `/colophon/`).

| Step | Source | What it counts |
|---|---|---|
| 1. Page views | nginx access lines in Loki | `GET` with 200/304 on `/ai-guides/` (hub), `/ai-guides/<id>/`, `/ai-quiz/`, `/ai-training/`, people only |
| 2. Quiz finished | `responses` | rows per skill level in the week (the digest's role cannot read `answers`, so it cannot count by recommended track) |
| 3. Reserve opened | Stripe Checkout Sessions | sessions created on each track's payment links (`STRIPE_TRACKS`) |
| 4. Paid | the same sessions | `payment_status: paid` |

Code: `services/ai-quiz-intake/src/funnel.ts` (counting) and `src/digest.ts`
(sends once and exits). Tests: `test/funnel.test.ts`.

### Access log source (confirmed 2026-11-25)

- Caddy does **not** log `bustamam.tech` (its site block has no `log`
  directive). (MEASURED)
- The `portfolio-blog` container's nginx writes access lines to stdout in the
  default combined format: address, time, request, status, bytes, referer,
  user agent, `X-Forwarded-For`. (MEASURED)
- `docker logs` is useless for this: the container is replaced on every deploy.
  (MEASURED)
- Alloy ships every container's stdout to Loki, label
  `container="portfolio-blog"`, kept 30 days (`retention_period: 720h`; oldest
  line seen 27 Oct 2026). (MEASURED) The digest queries
  `{container="portfolio-blog"} |~ "GET /ai-(guides|quiz|training)"`. Anything
  older than 30 days survives only as the counts in past digests.

### Bots and link previews

WhatsApp, Telegram, iMessage and other apps fetch a page every time a link is
posted, and deploy checks and agents use curl. In a sample of 23 to 25 Nov
2026, 62% of `/ai-*` lines were bots or tools. `isBot` drops any user agent
without a `Mozilla/` token, plus known preview, crawler and headless tokens
(`whatsapp`, `facebookexternalhit`, `bot`, `headless`, ...). In-app browsers
(Instagram, Facebook, Telegram's web view) count as people. The message reports
how many lines were filtered.

Own visits look like anyone else's. To drop them, set `DIGEST_EXCLUDE_IPS`
(comma-separated). Lines whose address or `X-Forwarded-For` contains one of
them are counted as "own visits excluded". The address is compared in memory
and never stored. `X-Forwarded-For` holds the visitor's address first, then
the Cloudflare edge (MEASURED 2026-11-25 on the live log), so an excluded
address matches.

### What it cannot see

The path one person took, or which guide led to a deposit. Step 3 counts
checkout sessions, so one person opening the link twice counts twice. At this
volume (tens a week), a change of a few from last week is noise.

### Owner steps (one time)

1. **Read access to quiz counts.** Done 2026-11-25. The app role could only insert. Let it read
   the track and time, and nothing else (also at the bottom of `schema.sql`):

   ```bash
   docker exec -i postgres psql -U postgres -d ai_quiz -v ON_ERROR_STOP=1 \
     -c "grant select (track, submitted_at) on responses to ai_quiz;"
   ```

   Checked on a scratch database: the digest query runs, and
   `select name, contact from responses` as the role is still
   `permission denied`. (MEASURED)

2. **Stripe key.** The digest uses the same `STRIPE_API_KEY` and
   `STRIPE_TRACKS` as the deposit counts (a **restricted** key with Read on
   Checkout Sessions is enough for the digest). Without them, step 3/4 reads
   "Unavailable".

3. **Reach Loki.** Done 2026-11-25. `ai-quiz-intake` and Loki are both on
   `srv-network`, and Loki answers there as `loki` (MEASURED: `/ready` from
   inside the container). No network change is needed. `/srv/docker-compose.yml`
   now sets these for the service, and the next deploy picks them up
   (`deploy-blog` runs `docker compose up --force-recreate`):

   ```yaml
         LOKI_URL: http://loki:3100
         # Optional: your own address(es), dropped from page views.
         DIGEST_EXCLUDE_IPS: ${DIGEST_EXCLUDE_IPS:-}
   ```

4. **Check it**, then schedule it. `--dry-run` prints the message without
   sending:

   ```bash
   docker exec ai-quiz-intake bun services/ai-quiz-intake/src/digest.ts --dry-run
   ```

   Then a weekly cron entry on the box. The box runs on UTC, so 16:00 UTC is
   Monday 08:00 Pacific (09:00 during daylight time):

   ```cron
   0 16 * * 1  docker exec ai-quiz-intake bun services/ai-quiz-intake/src/digest.ts >> /var/log/funnel-digest.log 2>&1
   ```

A source that fails shows as "Unavailable: <reason>" in the message instead of
a zero, and the run exits 1. The log line `digest sent` carries only which
sections worked.

## Server setup (one time)

All of this is on the Hetzner box, in `/srv`.

### 1. Database and role

The app connects as `ai_quiz`, which can `INSERT` into `responses` and nothing
else: it can't read, update, or delete answers.

```bash
PW=$(openssl rand -hex 24)
echo "AI_QUIZ_DB_PASSWORD=$PW" >> /srv/.env
docker exec -i postgres psql -U postgres -v ON_ERROR_STOP=1 <<SQL
create role ai_quiz login password '$PW';
create database ai_quiz;
revoke connect on database ai_quiz from public;
grant connect on database ai_quiz to ai_quiz;
SQL
docker exec -i postgres psql -U postgres -d ai_quiz -v ON_ERROR_STOP=1 \
  < services/ai-quiz-intake/schema.sql
```

### 1b. Cohort intake table

If the database above already exists, this is the only server step the
intake form needs. It is idempotent, and it also lives at the bottom of
`schema.sql`. Until it runs, intake submissions get a 500 (logged as
`intake insert failed`) and the quiz keeps working.

```bash
docker exec -i postgres psql -U postgres -d ai_quiz -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists cohort_intake (
  id                bigint generated always as identity primary key,
  submitted_at      timestamptz not null default now(),
  name              text not null,
  contact           text not null,
  weekly_task       text not null,
  time_taken        text not null check (time_taken in ('under-30m', '30-60m', '1-2h', '2h-plus')),
  inputs            jsonb not null,
  tools             jsonb not null,
  work_restricts    text check (work_restricts in ('yes', 'no', 'not-sure')),
  track             text not null check (track in ('foundations', 'applied', 'builder')),
  private_concerns  text,
  recording_consent boolean not null check (recording_consent),
  user_agent        text
);
revoke all on cohort_intake from public;
grant insert on cohort_intake to ai_quiz;
SQL
```

### 1c. Cohort waitlist table

The only server step the waitlist needs. Idempotent, and also at the bottom of
`schema.sql`. Until it runs, waitlist submissions get a 500 and the other forms
keep working.

```bash
docker exec -i postgres psql -U postgres -d ai_quiz -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists cohort_waitlist (
  id           bigint generated always as identity primary key,
  submitted_at timestamptz not null default now(),
  name         text not null,
  contact      text not null,
  note         text,
  user_agent   text
);
revoke all on cohort_waitlist from public;
grant insert on cohort_waitlist to ai_quiz;
SQL
```

### 1d. Guides sign-ups on the waitlist table (done 2026-11-25)

The only server step the guides form needs. Idempotent, and also at the bottom
of `schema.sql`. It adds the nullable `source` column, lets `name` be empty,
and requires every row to have a name or a source.

```bash
docker exec -i postgres psql -U postgres -d ai_quiz -v ON_ERROR_STOP=1 <<'SQL'
alter table cohort_waitlist add column if not exists source text;
alter table cohort_waitlist alter column name drop not null;
alter table cohort_waitlist drop constraint if exists cohort_waitlist_name_or_source;
alter table cohort_waitlist add constraint cohort_waitlist_name_or_source
  check (name is not null or source is not null);
SQL
```

### 2. Compose service

```yaml
  ai-quiz-intake:
    image: ai-quiz-intake:deployed
    pull_policy: never
    container_name: ai-quiz-intake
    mem_limit: 128m
    environment:
      DATABASE_URL: postgresql://ai_quiz:${AI_QUIZ_DB_PASSWORD}@postgres:5432/ai_quiz
      # Optional: a Telegram message per new response. Unset = no notifications.
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      TELEGRAM_CHAT_ID: ${TELEGRAM_CHAT_ID}
      # Optional: payment alerts from the Stripe webhook. Unset = the path is a 404.
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      STRIPE_PAYMENT_LINK: ${STRIPE_PAYMENT_LINK}
      # Optional: deposit counts for /ai-training/ (see "Training page deposit counts").
      STRIPE_TRACKS: ${STRIPE_TRACKS}
      STRIPE_API_KEY: ${STRIPE_API_KEY}
      # Optional: /api/ai-quiz/whatsapp redirects to this chat. Digits only, country
      # code first, no + or spaces (15551234567). Unset = the path is a 404.
      WHATSAPP_NUMBER: ${WHATSAPP_NUMBER}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    labels:
      - wud.watch=false
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

The image is built and pushed by `.github/workflows/deploy.yml` on every push to
`main`, and that workflow's `deploy` job deploys it with the blog, by commit SHA,
through the box's `deploy-blog` script (abustamam/hetzner-deploy
`docs/ci-deploy-blog.md`). WUD does not watch it.

### 3. Caddy route

```caddy
bustamam.tech {
    handle /api/ai-quiz* {
        request_body {
            max_size 32KB
        }
        reverse_proxy ai-quiz-intake:3000 {
            header_up X-Real-IP {client_ip}
        }
    }
    handle {
        reverse_proxy portfolio-blog:80
    }
}
```

The site moved from `blog.bustamam.tech` to the apex on 2026-11-23. The old
host now only 301-redirects to `https://bustamam.tech{uri}`, `/api/ai-quiz`
included, so don't point anything at it: a 301 turns a POST into a GET, and the
submission is lost.

`/srv/Caddyfile` is bind-mounted as a single file. Edit it **in place**
(`cat new > Caddyfile`). Don't let an editor or `sed -i` replace it with a new
file: the container keeps reading the old inode, and `caddy reload` then
silently reloads the old config. Then:

```bash
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Reading responses

```bash
docker exec -it postgres psql -U postgres -d ai_quiz
```

```sql
select submitted_at, track, score, answers->>'payer' as payer,
       answers->>'start' as start, weekly_task, name, contact
from responses order by submitted_at desc;

-- demand by skill level and who pays
select track, answers->>'payer' as payer, count(*) from responses group by 1, 2 order by 1, 2;

-- what people said they want (the goal question; null on rows from before it)
select answers->>'goal' as goal, track as level, count(*) from responses group by 1, 2 order by 1, 2;
```

Cohort intake:

```sql
select submitted_at, name, contact, track, time_taken, weekly_task, inputs, tools,
       work_restricts, private_concerns
from cohort_intake order by submitted_at desc;
```

Cohort waitlist, oldest first (that's the order to offer seats in):

```sql
select submitted_at, name, contact, note from cohort_waitlist where source is null order by submitted_at;
```

"Tell me when the next cohort opens" sign-ups from the guides, and where they
came from (message each one once when a track opens):

```sql
select submitted_at, contact, source from cohort_waitlist where source is not null order by submitted_at;

-- which pages people sign up from
select source, count(*) from cohort_waitlist where source is not null group by 1 order by 2 desc;
```

Quiz responses hold name and contact only when the person gave them; every
intake row has both, and every waitlist row has a contact (guides sign-ups have
no name). Keep the table
private to whoever runs the cohort.
