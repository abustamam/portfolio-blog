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

-- Cohort 1 pre-session form (/ai-cohort/intake, POST /api/ai-quiz/intake).
-- Same rule: the app role can insert rows and do nothing else with them.
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
