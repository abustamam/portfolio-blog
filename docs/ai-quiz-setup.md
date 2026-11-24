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
- It ignores the browser's `track` and `score` and recomputes them with the
  same `src/utils/aiQuiz.ts` the page uses.
- The hidden `website` honeypot field gets a fake `ok` and nothing is stored.
- Limits each IP to 10 submissions an hour (`RATE_LIMIT`), keyed on
  `X-Real-IP`, which Caddy sets from `Cf-Connecting-Ip`.
- Never echoes database errors to the client.
- After a row is saved, sends a Telegram message (name, track, score, payer,
  start, format, price, task) when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
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
- Each saved row goes in `cohort_intake` and triggers a Telegram message with
  name, track, time taken and task. Contact details and the private-files note
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

-- demand by track and who pays
select track, answers->>'payer' as payer, count(*) from responses group by 1, 2 order by 1, 2;
```

Cohort intake:

```sql
select submitted_at, name, contact, track, time_taken, weekly_task, inputs, tools,
       work_restricts, private_concerns
from cohort_intake order by submitted_at desc;
```

Cohort waitlist, oldest first (that's the order to offer seats in):

```sql
select submitted_at, name, contact, note from cohort_waitlist order by submitted_at;
```

Quiz responses hold name and contact only when the person gave them; every
intake and waitlist row has both. Keep the table
private to whoever runs the cohort.
