-- ParkSense persistence. Run against a Supabase project (SQL editor or
-- `supabase db push`). Everything here is accessed with the service-role key
-- from the serverless functions only; row-level security is enabled with no
-- policies, so the anon key can read nothing.

-- ── Per-device daily scan quota ──────────────────────────────────────────────
create table if not exists scan_quota (
  device_id text not null,
  day       date not null,
  count     integer not null default 0,
  primary key (device_id, day)
);

-- Atomic increment-and-return, so two concurrent scans cannot both see 39.
create or replace function increment_scan_quota(p_device text, p_day date)
returns integer
language sql
as $$
  insert into scan_quota (device_id, day, count)
  values (p_device, p_day, 1)
  on conflict (device_id, day)
  do update set count = scan_quota.count + 1
  returning count;
$$;

-- ── Community parking events (opt-in) ────────────────────────────────────────
-- One row per thing a consenting user did: scanned a sign, started or stopped
-- a timer, told us whether they were ticketed, or reported a wrong reading.
-- Location is stored coarsened to three decimal places (~110 m) and the
-- device is stored as a salted hash. There is no way back to a person from
-- this table, by design.
create table if not exists parking_events (
  id                 bigserial primary key,
  created_at         timestamptz not null default now(),
  device_hash        text not null,
  kind               text not null check (kind in ('scan', 'timer_start', 'timer_stop', 'outcome', 'feedback')),
  lat                double precision,
  lon                double precision,
  street             text,
  suburb             text,
  can_park           boolean,
  verdict_kind       text,
  time_limit_minutes integer,
  duration_ms        bigint,
  outcome            text check (outcome is null or outcome in ('no_ticket', 'ticket', 'unsure')),
  local_hour         smallint,
  local_weekday      smallint,
  is_public_holiday  boolean,
  is_school_day      boolean,
  confidence         real,
  feedback           text,
  raw_text           text
);

create index if not exists parking_events_geo_idx on parking_events (lat, lon);
create index if not exists parking_events_created_idx on parking_events (created_at desc);
create index if not exists parking_events_kind_idx on parking_events (kind);

alter table scan_quota enable row level security;
alter table parking_events enable row level security;
