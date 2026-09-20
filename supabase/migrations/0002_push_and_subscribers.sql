-- Web Push reminders and the early-access list.

create table if not exists push_subscriptions (
  device_hash text primary key,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create table if not exists reminders (
  id          bigserial primary key,
  device_hash text not null,
  kind        text not null check (kind in ('warning', 'expired')),
  fire_at     timestamptz not null,
  title       text not null,
  body        text not null,
  sent_at     timestamptz,
  attempts    integer not null default 0,
  last_error  text,
  created_at  timestamptz not null default now()
);

create index if not exists reminders_due_idx on reminders (fire_at) where sent_at is null;
create index if not exists reminders_device_idx on reminders (device_hash);

create table if not exists subscribers (
  email       text primary key,
  device_hash text,
  source      text,
  created_at  timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
alter table reminders enable row level security;
alter table subscribers enable row level security;

-- ── Delivering reminders once a minute ───────────────────────────────────────
-- Option A: Vercel Cron (Pro plan for per-minute schedules). Add to vercel.json:
--   "crons": [{ "path": "/api/cron/send-reminders", "schedule": "* * * * *" }]
-- and set CRON_SECRET in the project; Vercel sends it as a Bearer token.
--
-- Option B (free): Supabase pg_cron + pg_net. Enable both extensions in the
-- dashboard, then run, with your own host and secret:
--
--   select cron.schedule(
--     'parksense-send-reminders', '* * * * *',
--     $$ select net.http_get(
--          url := 'https://YOUR-APP.vercel.app/api/cron/send-reminders',
--          headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
--        ) $$
--   );
