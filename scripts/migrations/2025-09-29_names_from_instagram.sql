alter table public.contacts add column if not exists ig_username text;
alter table public.contacts add column if not exists ig_display_name text;
alter table public.contacts add column if not exists name_source text
  check (name_source in ('instagram_full_name','instagram_handle_titlecase','email_local','manual','unknown'))
  default 'unknown';
create index if not exists contacts_ig_username_idx on public.contacts(ig_username);
