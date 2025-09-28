alter table webhook_events
  add column if not exists attempt_count int default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists permanent_failed boolean default false;

create index if not exists idx_we_perm on webhook_events(permanent_failed, status, created_at desc);
