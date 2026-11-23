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

### 2. Compose service

```yaml
  ai-quiz-intake:
    image: ghcr.io/abustamam/ai-quiz-intake:latest
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
      - wud.watch=true
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

The image is built and pushed by `.github/workflows/deploy.yml` on every push to
`main`. WUD redeploys it like the blog.

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

Responses hold name and contact only when the person gave them. Keep the table
private to whoever runs the cohort.
