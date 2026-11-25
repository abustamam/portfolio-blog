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
  -- The quiz's track names (cohort 1's first form) and the /ai-training/ tracks.
  track             text not null check (track in ('foundations', 'applied', 'builder', 'everyday', 'connect', 'build')),
  private_concerns  text,
  recording_consent boolean not null check (recording_consent),
  -- Track-specific answers: platform/account (connect), os/coding/buildIdea (build).
  extras            jsonb not null default '{}',
  user_agent        text
);

revoke all on cohort_intake from public;
grant insert on cohort_intake to ai_quiz;

-- Cohort waitlist (/ai-cohort/waitlist, POST /api/ai-quiz/waitlist), where the
-- sold-out payment link sends people. Same rule: insert only.
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

-- Intake for the /ai-training/ tracks (idempotent; run on databases created
-- before it). Keeps the quiz's track names valid for rows already stored.
alter table cohort_intake add column if not exists extras jsonb not null default '{}';
alter table cohort_intake drop constraint if exists cohort_intake_track_check;
alter table cohort_intake add constraint cohort_intake_track_check
  check (track in ('foundations', 'applied', 'builder', 'everyday', 'connect', 'build'));

-- "Tell me when the next cohort opens" on the free guides (idempotent; run on
-- databases created before it). Those rows have no name, only a contact and
-- the page they came from (`guides-hub` or `guide:<id>`). Every row still has
-- a name or a source.
alter table cohort_waitlist add column if not exists source text;
alter table cohort_waitlist alter column name drop not null;
alter table cohort_waitlist drop constraint if exists cohort_waitlist_name_or_source;
alter table cohort_waitlist add constraint cohort_waitlist_name_or_source
  check (name is not null or source is not null);
