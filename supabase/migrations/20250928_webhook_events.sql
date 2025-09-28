create table if not exists webhook_events (
  id bigserial primary key,
  provider text not null,
  contact_id text,
  message_id text,
  dedupe_key text,
  message_text text,
  extracted_email text,
  extraction_confidence numeric,
  raw_payload jsonb,
  status text not null default 'NEW',
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_we_status_created on webhook_events(status, created_at desc);
create unique index if not exists u_we_provider_msg on webhook_events(provider, message_id) where message_id is not null;
create unique index if not exists u_we_provider_dedupe on webhook_events(provider, dedupe_key) where dedupe_key is not null;

create table if not exists event_log (
  id bigserial primary key,
  source text,
  action text,
  level text,
  data jsonb,
  created_at timestamptz default now()
);
