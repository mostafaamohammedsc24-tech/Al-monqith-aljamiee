create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 2 and 120),
  description text not null check (length(btrim(description)) between 5 and 2000),
  category text not null check (length(btrim(category)) between 2 and 80),
  base_price_iqd integer not null default 0 check (base_price_iqd >= 0),
  duration_label text not null default 'تحدد بعد مراجعة الطلب',
  icon text not null default 'file',
  color text not null default 'blue',
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  is_active boolean not null default false,
  show_price boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id text not null,
  service_title text not null,
  total_iqd integer not null check (total_iqd >= 0),
  status text not null default 'awaiting_payment'
    check (status in ('draft', 'pending_review', 'awaiting_payment', 'paid', 'in_progress', 'ready', 'delivered', 'cancelled')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_method text check (payment_method is null or payment_method in ('wayl', 'cash', 'bank_transfer')),
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_payment_id text not null unique,
  amount_iqd integer not null check (amount_iqd >= 0),
  status text not null check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  payment_method text not null check (payment_method in ('wayl', 'cash', 'bank_transfer')),
  checkout_url text,
  raw_response jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid not null unique references public.payments(id) on delete restrict,
  amount_iqd integer not null check (amount_iqd >= 0),
  issued_at timestamptz not null default now(),
  pdf_path text
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  old_data jsonb not null,
  new_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
alter table public.services enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on public.orders, public.payments, public.receipts, public.admin_audit_logs from anon, authenticated;
revoke all on public.services from anon, authenticated;
grant select on public.orders, public.payments, public.receipts, public.admin_audit_logs to authenticated;
grant select on public.services to anon, authenticated;
grant insert, update on public.services to authenticated;

drop policy if exists services_public_active_read on public.services;
create policy services_public_active_read on public.services
  for select to anon, authenticated using (is_active);

drop policy if exists services_admin_manage on public.services;
create policy services_admin_manage on public.services
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists orders_owner_or_admin_read on public.orders;
create policy orders_owner_or_admin_read on public.orders
  for select to authenticated
  using (
    user_id = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists payments_owner_or_admin_read on public.payments;
create policy payments_owner_or_admin_read on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and (o.user_id = auth.uid() or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    )
  );

drop policy if exists admin_audit_admin_read on public.admin_audit_logs;
create policy admin_audit_admin_read on public.admin_audit_logs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists receipts_owner_or_admin_read on public.receipts;
create policy receipts_owner_or_admin_read on public.receipts
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = receipts.order_id
        and (o.user_id = auth.uid() or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    )
  );

create or replace function public.admin_confirm_offline_payment(
  p_order_id uuid,
  p_method text,
  p_reference text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  order_row public.orders%rowtype;
  payment_id uuid := gen_random_uuid();
  paid_at_value timestamptz := now();
  receipt_number_value text;
  previous_data jsonb;
  updated_data jsonb;
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'admin_role_required' using errcode = '42501';
  end if;

  if p_method not in ('cash', 'bank_transfer') then
    raise exception 'invalid_payment_method' using errcode = '22023';
  end if;

  if p_reason is null or length(btrim(p_reason)) < 5 or length(p_reason) > 500 then
    raise exception 'payment_reason_required' using errcode = '22023';
  end if;

  select * into order_row
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if order_row.payment_status = 'paid' or order_row.status = 'cancelled' then
    raise exception 'order_already_paid_or_cancelled' using errcode = 'P0001';
  end if;

  previous_data := jsonb_build_object(
    'status', order_row.status,
    'payment_status', order_row.payment_status,
    'payment_method', order_row.payment_method,
    'payment_reference', order_row.payment_reference
  );

  insert into public.payments (
    id, order_id, provider, provider_payment_id, amount_iqd, status,
    payment_method, raw_response, paid_at
  ) values (
    payment_id, order_row.id, 'manual', 'manual:' || payment_id::text,
    order_row.total_iqd, 'paid', p_method,
    jsonb_build_object('reference', nullif(btrim(p_reference), '')),
    paid_at_value
  );

  update public.orders
  set payment_status = 'paid',
      status = case when status = 'awaiting_payment' then 'paid' else status end,
      payment_method = p_method,
      payment_reference = nullif(btrim(p_reference), ''),
      paid_at = paid_at_value
  where id = order_row.id
  returning * into order_row;

  receipt_number_value := 'OFF-' || to_char(paid_at_value, 'YYYYMMDD') || '-' || upper(substr(replace(payment_id::text, '-', ''), 1, 10));
  insert into public.receipts (receipt_number, order_id, payment_id, amount_iqd, issued_at)
  values (receipt_number_value, order_row.id, payment_id, order_row.total_iqd, paid_at_value);

  updated_data := jsonb_build_object(
    'status', order_row.status,
    'payment_status', order_row.payment_status,
    'payment_method', order_row.payment_method,
    'payment_reference', order_row.payment_reference,
    'paid_at', order_row.paid_at,
    'amount_iqd', order_row.total_iqd,
    'receipt_number', receipt_number_value
  );

  insert into public.admin_audit_logs (
    actor_user_id, action, target_type, target_id, reason, old_data, new_data
  ) values (
    auth.uid(), 'confirm_offline_payment', 'order', order_row.id,
    btrim(p_reason), previous_data, updated_data
  );

  return jsonb_build_object(
    'orderId', order_row.id,
    'paymentId', payment_id,
    'amountIqd', order_row.total_iqd,
    'method', p_method,
    'paidAt', paid_at_value,
    'receiptNumber', receipt_number_value
  );
end;
$$;

revoke all on function public.admin_confirm_offline_payment(uuid, text, text, text) from public, anon;
grant execute on function public.admin_confirm_offline_payment(uuid, text, text, text) to authenticated;