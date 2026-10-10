create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  phone text not null unique check (phone ~ '^0[0-9]{9,14}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_id uuid not null references public.customers(id),
  quantity integer not null check (quantity between 1 and 10),
  amount integer not null check (amount > 0),
  total_payment integer,
  txn_id text unique,
  payment_status text not null default 'creating'
    check (payment_status in ('creating', 'pending', 'completed', 'failed')),
  order_status text not null default 'menunggu_pembayaran'
    check (order_status in ('menunggu_pembayaran', 'sedang_dibuat', 'selesai')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists orders_customer_created_idx
  on public.orders (customer_id, created_at desc);

alter table public.customers enable row level security;
alter table public.orders enable row level security;

revoke all on public.customers, public.orders from anon, authenticated;
