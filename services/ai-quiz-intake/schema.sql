-- Run once as the postgres superuser. See docs/ai-quiz-setup.md.
-- The app role can insert and read back its own health check, nothing else.
create table if not exists responses (
  id           bigint generated always as identity primary key,
  submitted_at timestamptz not null default now(),
  track        text not null check (track in ('foundations', 'applied', 'builder')),
  score        smallint not null,
  privacy_gap  boolean not null,
  weekly_task  text not null,
  name         text,
  contact      text,
  answers      jsonb not null,
  user_agent   text
);

revoke all on responses from public;
grant insert on responses to ai_quiz;
