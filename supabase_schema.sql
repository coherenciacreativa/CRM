-- Run this in Supabase SQL Editor to bootstrap CRM tables
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text,
  name text,
  first_name text,
  last_name text,
  instagram_username text,
  ig_user_id text unique,
  manychat_contact_id text unique,
  city text,
  state text,
  country text,
  profession text,
  tags text[] default '{}',
  lead_status text check (lead_status in ('new','warm','hot','customer')) default 'new',
  lead_score int default 0,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.contact_group_members (
  contact_id uuid references public.contacts(id) on delete cascade,
  group_id uuid references public.contact_groups(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (contact_id, group_id)
);

-- Useful indexes
create index if not exists idx_contacts_email on public.contacts (email);
create index if not exists idx_contacts_phone on public.contacts (phone);
create index if not exists idx_contacts_ig_user on public.contacts (ig_user_id);
create index if not exists idx_contacts_manychat on public.contacts (manychat_contact_id);

-- Interactions log (messages, events, etc.)
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete cascade,
  platform text not null check (platform in ('instagram','mailerlite','shopify','other')),
  direction text check (direction in ('inbound','outbound')),
  type text,
  external_id text,
  thread_id text,
  content text,
  extracted_email text,
  extraction_confidence numeric,
  meta jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_interactions_external on public.interactions (platform, external_id);
create index if not exists idx_interactions_contact on public.interactions (contact_id, occurred_at desc);

-- Row Level Security policies
alter table public.contacts enable row level security;
alter table public.contact_groups enable row level security;
alter table public.contact_group_members enable row level security;
alter table public.interactions enable row level security;

-- Service role bypasses RLS automatically; for anon/read clients, add policies as needed.
