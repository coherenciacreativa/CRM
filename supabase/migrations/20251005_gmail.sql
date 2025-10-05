create table if not exists gmail_tokens (
  id uuid primary key default uuid_generate_v4(),
  account_email text unique not null,
  access_token text,
  refresh_token text not null,
  scope text,
  token_type text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function update_gmail_tokens_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_gmail_tokens_updated_at on gmail_tokens;
create trigger trg_gmail_tokens_updated_at
before update on gmail_tokens
for each row execute procedure update_gmail_tokens_updated_at();

create table if not exists gmail_messages (
  id uuid primary key default uuid_generate_v4(),
  gmail_id text unique not null,
  thread_id text,
  account_email text references gmail_tokens(account_email) on delete cascade,
  contact_email text,
  direction text,
  subject text,
  snippet text,
  payload jsonb,
  history_id text,
  internal_date timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_gmail_messages_account_email on gmail_messages(account_email);
create index if not exists idx_gmail_messages_contact_email on gmail_messages(contact_email);
create index if not exists idx_gmail_messages_internal_date on gmail_messages(internal_date desc);
