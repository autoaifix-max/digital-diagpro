-- Digital DiagPro combined migrations. Use only on a NEW EMPTY Supabase project.

-- ============================================================================
-- Source: supabase/migrations/001_foundation.sql
-- ============================================================================
-- Digital DiagPro Pilot
-- 001: Extensions, enums, and shared primitives

create extension if not exists pgcrypto;

create type public.staff_role as enum ('admin', 'receptionist', 'technician');
create type public.booking_status as enum (
  'new', 'confirmed', 'arrived', 'in_diagnosis', 'waiting_approval',
  'approved', 'in_service', 'completed', 'cancelled', 'no_show'
);
create type public.work_order_status as enum (
  'open', 'diagnosing', 'waiting_approval', 'approved', 'in_progress',
  'quality_check', 'ready', 'delivered', 'cancelled'
);
create type public.diagnostic_status as enum ('draft', 'in_progress', 'completed');
create type public.priority_level as enum ('normal', 'urgent');
create type public.document_type as enum (
  'diagnostic_report', 'estimate', 'invoice', 'work_order', 'photo', 'other'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ============================================================================
-- Source: supabase/migrations/002_schema.sql
-- ============================================================================
-- 002: Core operational schema

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  phone text,
  city text,
  timezone text not null default 'Asia/Riyadh',
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index workshops_one_default_idx
  on public.workshops (is_default)
  where is_default = true;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  full_name text not null,
  role public.staff_role not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index users_workshop_role_idx on public.users (workshop_id, role) where is_active = true;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  full_name text not null,
  phone text not null,
  email text,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customers_name_length check (char_length(trim(full_name)) between 2 and 120),
  constraint customers_phone_length check (char_length(phone) between 8 and 20),
  unique (workshop_id, phone)
);

create index customers_workshop_name_idx on public.customers (workshop_id, full_name);
create index customers_workshop_created_idx on public.customers (workshop_id, created_at desc);

create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  phone_last4 text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_accounts_last4 check (phone_last4 ~ '^\d{4}$')
);

create index customer_accounts_workshop_idx on public.customer_accounts (workshop_id);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  make text not null,
  model text not null,
  model_year integer not null,
  vin text,
  plate_number text,
  engine text,
  color text,
  mileage integer,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint vehicles_year check (model_year between 1980 and 2100),
  constraint vehicles_mileage check (mileage is null or mileage >= 0),
  constraint vehicles_vin_format check (vin is null or char_length(vin) between 11 and 17)
);

create unique index vehicles_workshop_vin_unique_idx
  on public.vehicles (workshop_id, upper(vin))
  where vin is not null and vin <> '';
create index vehicles_customer_idx on public.vehicles (customer_id, created_at desc);
create index vehicles_workshop_plate_idx on public.vehicles (workshop_id, plate_number) where plate_number is not null;

create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  code text not null,
  name_ar text not null,
  description_ar text,
  base_price numeric(12,2),
  estimated_minutes integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workshop_id, code),
  constraint service_price_nonnegative check (base_price is null or base_price >= 0),
  constraint service_minutes_positive check (estimated_minutes is null or estimated_minutes > 0)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  booking_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  service_code text not null,
  complaint text not null,
  preferred_at timestamptz not null,
  confirmed_at timestamptz,
  status public.booking_status not null default 'new',
  priority public.priority_level not null default 'normal',
  source text not null default 'website',
  internal_notes text,
  created_by uuid references public.users(id) on delete set null,
  assigned_to uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index bookings_workshop_preferred_idx on public.bookings (workshop_id, preferred_at desc);
create index bookings_workshop_status_idx on public.bookings (workshop_id, status, preferred_at);
create index bookings_customer_idx on public.bookings (customer_id, created_at desc);

create table public.booking_status_logs (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index booking_status_logs_booking_idx on public.booking_status_logs (booking_id, created_at desc);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  work_order_number text not null unique,
  booking_id uuid unique references public.bookings(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  complaint text not null,
  status public.work_order_status not null default 'open',
  priority public.priority_level not null default 'normal',
  assigned_to uuid references public.users(id) on delete set null,
  odometer_in integer,
  fuel_level_percent integer,
  promised_at timestamptz,
  labor_total numeric(12,2) not null default 0,
  parts_total numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) generated always as (
    greatest(0, labor_total + parts_total - discount_total + tax_total)
  ) stored,
  approval_note text,
  internal_notes text,
  opened_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  delivered_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint work_orders_odometer check (odometer_in is null or odometer_in >= 0),
  constraint work_orders_fuel check (fuel_level_percent is null or fuel_level_percent between 0 and 100),
  constraint work_orders_amounts check (
    labor_total >= 0 and parts_total >= 0 and discount_total >= 0 and tax_total >= 0
  )
);

create index work_orders_workshop_status_idx on public.work_orders (workshop_id, status, created_at desc);
create index work_orders_customer_idx on public.work_orders (customer_id, created_at desc);
create index work_orders_vehicle_idx on public.work_orders (vehicle_id, created_at desc);

create table public.work_order_status_logs (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  from_status public.work_order_status,
  to_status public.work_order_status not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index work_order_status_logs_order_idx on public.work_order_status_logs (work_order_id, created_at desc);

create table public.diagnostic_reports (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  report_number text not null unique,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  title text not null,
  complaint text not null,
  status public.diagnostic_status not null default 'draft',
  findings text,
  recommendations text,
  technician_conclusion text,
  customer_summary text,
  customer_visible boolean not null default false,
  completed_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index diagnostic_reports_workshop_status_idx on public.diagnostic_reports (workshop_id, status, created_at desc);
create index diagnostic_reports_work_order_idx on public.diagnostic_reports (work_order_id, created_at desc);
create index diagnostic_reports_customer_idx on public.diagnostic_reports (customer_id, created_at desc);

create table public.diagnostic_items (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  report_id uuid not null references public.diagnostic_reports(id) on delete cascade,
  item_type text not null,
  code text,
  title text not null,
  value text,
  unit text,
  interpretation text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint diagnostic_items_type check (item_type in ('dtc', 'live_data', 'test', 'finding', 'recommendation'))
);

create index diagnostic_items_report_idx on public.diagnostic_items (report_id, sort_order, created_at);

create table public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  diagnostic_report_id uuid references public.diagnostic_reports(id) on delete set null,
  title text not null,
  document_type public.document_type not null default 'other',
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_bucket text not null default 'customer-documents',
  storage_path text not null unique,
  customer_visible boolean not null default false,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint documents_size check (size_bytes > 0 and size_bytes <= 15728640)
);

create index customer_documents_workshop_idx on public.customer_documents (workshop_id, created_at desc);
create index customer_documents_customer_idx on public.customer_documents (customer_id, created_at desc);
create index customer_documents_work_order_idx on public.customer_documents (work_order_id, created_at desc) where work_order_id is not null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  workshop_id uuid references public.workshops(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_logs_workshop_created_idx on public.audit_logs (workshop_id, created_at desc);

-- Keep updated_at consistent.
create trigger workshops_set_updated_at before update on public.workshops for each row execute function public.set_updated_at();
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger customer_accounts_set_updated_at before update on public.customer_accounts for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger service_catalog_set_updated_at before update on public.service_catalog for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger work_orders_set_updated_at before update on public.work_orders for each row execute function public.set_updated_at();
create trigger diagnostic_reports_set_updated_at before update on public.diagnostic_reports for each row execute function public.set_updated_at();
create trigger customer_documents_set_updated_at before update on public.customer_documents for each row execute function public.set_updated_at();

-- ============================================================================
-- Source: supabase/migrations/003_functions_and_workflows.sql
-- ============================================================================
-- 003: Authorization helpers and workflow RPCs

create or replace function public.current_workshop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.workshop_id
  from public.users u
  where u.id = (select auth.uid())
    and u.is_active = true
  limit 1;
$$;

create or replace function public.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = (select auth.uid())
    and u.is_active = true
  limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and u.is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() = 'admin'::public.staff_role, false);
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ca.customer_id
  from public.customer_accounts ca
  where ca.auth_user_id = (select auth.uid())
    and ca.is_active = true
  limit 1;
$$;

create or replace function public.current_customer_workshop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ca.workshop_id
  from public.customer_accounts ca
  where ca.auth_user_id = (select auth.uid())
    and ca.is_active = true
  limit 1;
$$;

revoke all on function public.current_workshop_id() from public;
revoke all on function public.current_staff_role() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.current_customer_id() from public;
revoke all on function public.current_customer_workshop_id() from public;
grant execute on function public.current_workshop_id() to authenticated;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_customer_id() to authenticated;
grant execute on function public.current_customer_workshop_id() to authenticated;

create or replace function public.create_public_booking(
  p_customer_name text,
  p_phone text,
  p_vehicle_make text,
  p_vehicle_model text,
  p_vehicle_year integer,
  p_plate_number text,
  p_service_code text,
  p_complaint text,
  p_preferred_at timestamptz
)
returns table (booking_id uuid, booking_number text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_workshop_id uuid;
  v_customer_id uuid;
  v_vehicle_id uuid;
  v_booking_id uuid;
  v_booking_number text;
begin
  select w.id into v_workshop_id
  from public.workshops w
  where w.is_default = true and w.is_active = true
  limit 1;

  if v_workshop_id is null then
    raise exception 'No active default workshop configured';
  end if;

  if char_length(trim(p_customer_name)) < 2 then
    raise exception 'Invalid customer name';
  end if;

  if p_phone !~ '^\+9665[0-9]{8}$' then
    raise exception 'Invalid phone number';
  end if;

  if p_vehicle_year < 1980 or p_vehicle_year > extract(year from now())::integer + 1 then
    raise exception 'Invalid vehicle year';
  end if;

  if char_length(trim(p_complaint)) < 5 then
    raise exception 'Complaint is too short';
  end if;

  if p_preferred_at < timezone('utc', now()) - interval '5 minutes'
     or p_preferred_at > timezone('utc', now()) + interval '180 days' then
    raise exception 'Preferred appointment is outside the allowed range';
  end if;

  if not exists (
    select 1 from public.service_catalog sc
    where sc.workshop_id = v_workshop_id
      and sc.code = trim(p_service_code)
      and sc.is_active = true
  ) then
    raise exception 'Invalid or inactive service code';
  end if;

  insert into public.customers (workshop_id, full_name, phone)
  values (v_workshop_id, trim(p_customer_name), p_phone)
  on conflict (workshop_id, phone)
  do update set full_name = excluded.full_name, updated_at = timezone('utc', now())
  returning id into v_customer_id;

  select v.id into v_vehicle_id
  from public.vehicles v
  where v.workshop_id = v_workshop_id
    and v.customer_id = v_customer_id
    and lower(v.make) = lower(trim(p_vehicle_make))
    and lower(v.model) = lower(trim(p_vehicle_model))
    and v.model_year = p_vehicle_year
    and coalesce(v.plate_number, '') = coalesce(nullif(trim(p_plate_number), ''), '')
  order by v.created_at desc
  limit 1;

  if v_vehicle_id is null then
    insert into public.vehicles (
      workshop_id, customer_id, make, model, model_year, plate_number
    ) values (
      v_workshop_id, v_customer_id, trim(p_vehicle_make), trim(p_vehicle_model),
      p_vehicle_year, nullif(trim(p_plate_number), '')
    ) returning id into v_vehicle_id;
  end if;

  v_booking_number := 'DP-B-' || to_char(timezone('Asia/Riyadh', now()), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.bookings (
    workshop_id, booking_number, customer_id, vehicle_id, service_code,
    complaint, preferred_at, status, source
  ) values (
    v_workshop_id, v_booking_number, v_customer_id, v_vehicle_id, trim(p_service_code),
    trim(p_complaint), p_preferred_at, 'new', 'website'
  ) returning id into v_booking_id;

  insert into public.booking_status_logs (
    workshop_id, booking_id, from_status, to_status, note, changed_by
  ) values (
    v_workshop_id, v_booking_id, null, 'new', 'Public booking created', null
  );

  return query select v_booking_id, v_booking_number;
end;
$$;

revoke all on function public.create_public_booking(text,text,text,text,integer,text,text,text,timestamptz) from public;
grant execute on function public.create_public_booking(text,text,text,text,integer,text,text,text,timestamptz) to anon, authenticated;

create or replace function public.booking_transition_allowed(
  p_from public.booking_status,
  p_to public.booking_status
)
returns boolean
language sql
immutable
as $$
  select case p_from
    when 'new' then p_to in ('confirmed', 'cancelled')
    when 'confirmed' then p_to in ('arrived', 'no_show', 'cancelled')
    when 'arrived' then p_to in ('in_diagnosis', 'cancelled')
    when 'in_diagnosis' then p_to in ('waiting_approval', 'in_service', 'cancelled')
    when 'waiting_approval' then p_to in ('approved', 'cancelled')
    when 'approved' then p_to in ('in_service', 'cancelled')
    when 'in_service' then p_to in ('completed', 'cancelled')
    when 'no_show' then p_to in ('confirmed', 'cancelled')
    else false
  end;
$$;

create or replace function public.set_booking_status(
  p_booking_id uuid,
  p_status public.booking_status,
  p_note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_from public.booking_status;
begin
  if not public.is_staff() then
    raise exception 'Forbidden';
  end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.workshop_id = public.current_workshop_id()
  for update;

  if not found then raise exception 'Booking not found'; end if;
  v_from := v_booking.status;

  if v_from = p_status then return v_booking; end if;
  if not public.booking_transition_allowed(v_from, p_status) then
    raise exception 'Invalid booking transition from % to %', v_from, p_status;
  end if;

  update public.bookings
  set status = p_status,
      confirmed_at = case when p_status = 'confirmed' and confirmed_at is null then timezone('utc', now()) else confirmed_at end
  where id = p_booking_id
  returning * into v_booking;

  insert into public.booking_status_logs (
    workshop_id, booking_id, from_status, to_status, note, changed_by
  ) values (
    v_booking.workshop_id, v_booking.id, v_from, p_status, nullif(trim(p_note), ''), auth.uid()
  );

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_booking.workshop_id, auth.uid(), 'status_changed', 'booking', v_booking.id,
    jsonb_build_object('from', v_from, 'to', p_status, 'note', p_note));

  return v_booking;
end;
$$;

grant execute on function public.set_booking_status(uuid, public.booking_status, text) to authenticated;

create or replace function public.convert_booking_to_work_order(p_booking_id uuid)
returns public.work_orders
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings;
  v_order public.work_orders;
  v_number text;
begin
  if not public.is_staff() then raise exception 'Forbidden'; end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.workshop_id = public.current_workshop_id()
  for update;

  if not found then raise exception 'Booking not found'; end if;

  select * into v_order from public.work_orders wo where wo.booking_id = p_booking_id;
  if found then return v_order; end if;

  if v_booking.status in ('cancelled', 'no_show', 'completed') then
    raise exception 'Booking cannot be converted in status %', v_booking.status;
  end if;

  v_number := 'DP-WO-' || to_char(timezone('Asia/Riyadh', now()), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.work_orders (
    workshop_id, work_order_number, booking_id, customer_id, vehicle_id,
    complaint, status, priority, assigned_to, created_by
  ) values (
    v_booking.workshop_id, v_number, v_booking.id, v_booking.customer_id, v_booking.vehicle_id,
    v_booking.complaint, 'open', v_booking.priority, v_booking.assigned_to, auth.uid()
  ) returning * into v_order;

  insert into public.work_order_status_logs (
    workshop_id, work_order_id, from_status, to_status, note, changed_by
  ) values (
    v_order.workshop_id, v_order.id, null, 'open', 'Created from booking', auth.uid()
  );

  if v_booking.status in ('new', 'confirmed') then
    update public.bookings set status = 'arrived' where id = v_booking.id;
    insert into public.booking_status_logs (
      workshop_id, booking_id, from_status, to_status, note, changed_by
    ) values (
      v_booking.workshop_id, v_booking.id, v_booking.status, 'arrived', 'Converted to work order', auth.uid()
    );
  end if;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_order.workshop_id, auth.uid(), 'created_from_booking', 'work_order', v_order.id,
    jsonb_build_object('booking_id', p_booking_id));

  return v_order;
end;
$$;

grant execute on function public.convert_booking_to_work_order(uuid) to authenticated;

create or replace function public.work_order_transition_allowed(
  p_from public.work_order_status,
  p_to public.work_order_status
)
returns boolean
language sql
immutable
as $$
  select case p_from
    when 'open' then p_to in ('diagnosing', 'cancelled')
    when 'diagnosing' then p_to in ('waiting_approval', 'approved', 'in_progress', 'cancelled')
    when 'waiting_approval' then p_to in ('approved', 'cancelled')
    when 'approved' then p_to in ('in_progress', 'cancelled')
    when 'in_progress' then p_to in ('quality_check', 'cancelled')
    when 'quality_check' then p_to in ('in_progress', 'ready')
    when 'ready' then p_to = 'delivered'
    else false
  end;
$$;

create or replace function public.set_work_order_status(
  p_work_order_id uuid,
  p_status public.work_order_status,
  p_note text default null
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders;
  v_from public.work_order_status;
begin
  if not public.is_staff() then raise exception 'Forbidden'; end if;

  select * into v_order
  from public.work_orders wo
  where wo.id = p_work_order_id
    and wo.workshop_id = public.current_workshop_id()
  for update;

  if not found then raise exception 'Work order not found'; end if;
  v_from := v_order.status;

  if v_from = p_status then return v_order; end if;
  if not public.work_order_transition_allowed(v_from, p_status) then
    raise exception 'Invalid work order transition from % to %', v_from, p_status;
  end if;

  update public.work_orders
  set status = p_status,
      completed_at = case when p_status = 'ready' and completed_at is null then timezone('utc', now()) else completed_at end,
      delivered_at = case when p_status = 'delivered' then timezone('utc', now()) else delivered_at end
  where id = p_work_order_id
  returning * into v_order;

  insert into public.work_order_status_logs (
    workshop_id, work_order_id, from_status, to_status, note, changed_by
  ) values (
    v_order.workshop_id, v_order.id, v_from, p_status, nullif(trim(p_note), ''), auth.uid()
  );

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_order.workshop_id, auth.uid(), 'status_changed', 'work_order', v_order.id,
    jsonb_build_object('from', v_from, 'to', p_status, 'note', p_note));

  return v_order;
end;
$$;

grant execute on function public.set_work_order_status(uuid, public.work_order_status, text) to authenticated;

create or replace function public.next_diagnostic_report_number()
returns text
language sql
volatile
security definer
set search_path = public, extensions
as $$
  select 'DP-DR-' || to_char(timezone('Asia/Riyadh', now()), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

grant execute on function public.next_diagnostic_report_number() to authenticated;

-- ============================================================================
-- Source: supabase/migrations/004_rls_policies.sql
-- ============================================================================
-- 004: Row Level Security policies

alter table public.workshops enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.customer_accounts enable row level security;
alter table public.vehicles enable row level security;
alter table public.service_catalog enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_logs enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_status_logs enable row level security;
alter table public.diagnostic_reports enable row level security;
alter table public.diagnostic_items enable row level security;
alter table public.customer_documents enable row level security;
alter table public.audit_logs enable row level security;

-- Workshops
create policy "staff view own workshop" on public.workshops
for select to authenticated
using (id = public.current_workshop_id() or id = public.current_customer_workshop_id());

create policy "admins update own workshop" on public.workshops
for update to authenticated
using (id = public.current_workshop_id() and public.is_admin())
with check (id = public.current_workshop_id() and public.is_admin());

-- Staff users
create policy "staff view colleagues" on public.users
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());

create policy "admins manage staff" on public.users
for all to authenticated
using (workshop_id = public.current_workshop_id() and public.is_admin())
with check (workshop_id = public.current_workshop_id() and public.is_admin());

-- Customers
create policy "staff read customers" on public.customers
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff insert customers" on public.customers
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff update customers" on public.customers
for update to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff())
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "customer reads own profile" on public.customers
for select to authenticated
using (id = public.current_customer_id());

-- Customer accounts
create policy "customer reads own account" on public.customer_accounts
for select to authenticated
using (auth_user_id = (select auth.uid()) and is_active = true);
create policy "staff read customer accounts" on public.customer_accounts
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "admin manages customer accounts" on public.customer_accounts
for all to authenticated
using (workshop_id = public.current_workshop_id() and public.is_admin())
with check (workshop_id = public.current_workshop_id() and public.is_admin());

-- Vehicles
create policy "staff read vehicles" on public.vehicles
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff insert vehicles" on public.vehicles
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff update vehicles" on public.vehicles
for update to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff())
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "customer reads own vehicles" on public.vehicles
for select to authenticated
using (customer_id = public.current_customer_id());

-- Service catalog can be read by everyone; only admins mutate.
create policy "public reads active services" on public.service_catalog
for select to anon, authenticated
using (is_active = true);
create policy "admins manage services" on public.service_catalog
for all to authenticated
using (workshop_id = public.current_workshop_id() and public.is_admin())
with check (workshop_id = public.current_workshop_id() and public.is_admin());

-- Bookings
create policy "staff read bookings" on public.bookings
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff insert bookings" on public.bookings
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff update bookings" on public.bookings
for update to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff())
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "customer reads own bookings" on public.bookings
for select to authenticated
using (customer_id = public.current_customer_id());

create policy "staff read booking logs" on public.booking_status_logs
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff insert booking logs" on public.booking_status_logs
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "customer reads own booking logs" on public.booking_status_logs
for select to authenticated
using (exists (
  select 1 from public.bookings b
  where b.id = booking_id and b.customer_id = public.current_customer_id()
));

-- Work orders
create policy "staff read work orders" on public.work_orders
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff insert work orders" on public.work_orders
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff update work orders" on public.work_orders
for update to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff())
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "customer reads own work orders" on public.work_orders
for select to authenticated
using (customer_id = public.current_customer_id());

create policy "staff read work order logs" on public.work_order_status_logs
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff insert work order logs" on public.work_order_status_logs
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "customer reads own order logs" on public.work_order_status_logs
for select to authenticated
using (exists (
  select 1 from public.work_orders wo
  where wo.id = work_order_id and wo.customer_id = public.current_customer_id()
));

-- Diagnostics
create policy "staff read diagnostics" on public.diagnostic_reports
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff insert diagnostics" on public.diagnostic_reports
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff update diagnostics" on public.diagnostic_reports
for update to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff())
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff delete diagnostics" on public.diagnostic_reports
for delete to authenticated
using (workshop_id = public.current_workshop_id() and public.is_admin());
create policy "customer reads visible diagnostics" on public.diagnostic_reports
for select to authenticated
using (customer_id = public.current_customer_id() and customer_visible = true);

create policy "staff read diagnostic items" on public.diagnostic_items
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff insert diagnostic items" on public.diagnostic_items
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff update diagnostic items" on public.diagnostic_items
for update to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff())
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff delete diagnostic items" on public.diagnostic_items
for delete to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "customer reads items for visible diagnostics" on public.diagnostic_items
for select to authenticated
using (exists (
  select 1 from public.diagnostic_reports dr
  where dr.id = report_id
    and dr.customer_id = public.current_customer_id()
    and dr.customer_visible = true
));

-- Documents
create policy "staff read documents" on public.customer_documents
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff insert documents" on public.customer_documents
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "staff update documents" on public.customer_documents
for update to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff())
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "admins delete documents" on public.customer_documents
for delete to authenticated
using (workshop_id = public.current_workshop_id() and public.is_admin());
create policy "customer reads visible documents" on public.customer_documents
for select to authenticated
using (customer_id = public.current_customer_id() and customer_visible = true);

-- Audit logs are append-only to staff; only admins read.
create policy "staff insert audit logs" on public.audit_logs
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());
create policy "admins read audit logs" on public.audit_logs
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_admin());

-- Explicit grants. RLS remains the final enforcement layer.
grant usage on schema public to anon, authenticated;
grant select on public.service_catalog to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ============================================================================
-- Source: supabase/migrations/005_storage.sql
-- ============================================================================
-- 005: Private customer document storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-documents',
  'customer-documents',
  false,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {workshop_id}/{customer_id}/{uuid}-{safe_filename}
create policy "staff upload customer documents"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'customer-documents'
  and public.is_staff()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
);

create policy "staff read own workshop documents"
on storage.objects
for select to authenticated
using (
  bucket_id = 'customer-documents'
  and public.is_staff()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
);

create policy "staff update own workshop documents"
on storage.objects
for update to authenticated
using (
  bucket_id = 'customer-documents'
  and public.is_staff()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
)
with check (
  bucket_id = 'customer-documents'
  and public.is_staff()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
);

create policy "admins delete own workshop documents"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'customer-documents'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_workshop_id()::text
);

create policy "customers read visible document files"
on storage.objects
for select to authenticated
using (
  bucket_id = 'customer-documents'
  and exists (
    select 1
    from public.customer_documents d
    where d.storage_path = name
      and d.customer_id = public.current_customer_id()
      and d.customer_visible = true
  )
);

-- ============================================================================
-- Source: supabase/migrations/006_pilot_seed.sql
-- ============================================================================
-- 006: Idempotent pilot workshop and service catalog seed

insert into public.workshops (
  id, name, slug, phone, city, timezone, is_default, is_active
) values (
  '00000000-0000-4000-8000-000000000001',
  'مركز التشخيص الاحترافي لصيانة السيارات',
  'professional-diagnostic-center',
  null,
  'حفر الباطن',
  'Asia/Riyadh',
  true,
  true
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  city = excluded.city,
  timezone = excluded.timezone,
  is_default = excluded.is_default,
  is_active = excluded.is_active;

insert into public.service_catalog (
  workshop_id, code, name_ar, description_ar, base_price, estimated_minutes, sort_order
) values
  ('00000000-0000-4000-8000-000000000001', 'computer-diagnostic', 'فحص كمبيوتر وتقرير أولي', 'مسح شامل للأنظمة وقراءة الأكواد والبيانات الحية وتقرير أولي.', 79, 30, 10),
  ('00000000-0000-4000-8000-000000000001', 'confirmatory-diagnosis', 'تشخيص تأكيدي لعزل السبب', 'اختبارات عزل وتأكيد السبب قبل اعتماد القطعة أو الإصلاح.', 149, 60, 20),
  ('00000000-0000-4000-8000-000000000001', 'electrical-diagnosis', 'تشخيص كهرباء وإلكترونيات', 'فحص دوائر وتغذية وأرضي وشبكات CAN وأعطال متقطعة.', null, 90, 30),
  ('00000000-0000-4000-8000-000000000001', 'programming', 'برمجة أو تهيئة', 'برمجة وحدات وتهيئة وتعلم حسب دعم المركبة والتجهيز.', null, 60, 40),
  ('00000000-0000-4000-8000-000000000001', 'ac-diagnosis', 'تشخيص تكييف', 'فحص الضغوط والحرارة والتحكم الكهربائي والتسريب حسب الحالة.', null, 60, 50),
  ('00000000-0000-4000-8000-000000000001', 'maintenance', 'صيانة أو إصلاح بعد تشخيص', 'تنفيذ أعمال الصيانة أو الإصلاح المعتمدة مع فحص جودة.', null, null, 60),
  ('00000000-0000-4000-8000-000000000001', 'other', 'خدمة أخرى', 'يتم تحديد النطاق بعد مراجعة الطلب.', null, null, 70)
on conflict (workshop_id, code) do update set
  name_ar = excluded.name_ar,
  description_ar = excluded.description_ar,
  base_price = excluded.base_price,
  estimated_minutes = excluded.estimated_minutes,
  sort_order = excluded.sort_order,
  is_active = true;

-- ============================================================================
-- Source: supabase/migrations/007_diagnostic_workflow.sql
-- ============================================================================
-- 007: Atomic diagnostic report create/update workflows

create or replace function public.create_diagnostic_report(
  p_work_order_id uuid,
  p_title text,
  p_complaint text,
  p_findings text default '',
  p_recommendations text default '',
  p_status public.diagnostic_status default 'draft',
  p_dtcs jsonb default '[]'::jsonb
)
returns public.diagnostic_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders;
  v_report public.diagnostic_reports;
  v_item jsonb;
  v_sort integer := 0;
begin
  if not public.is_staff() then raise exception 'Forbidden'; end if;

  select * into v_order
  from public.work_orders wo
  where wo.id = p_work_order_id
    and wo.workshop_id = public.current_workshop_id();

  if not found then raise exception 'Work order not found'; end if;

  insert into public.diagnostic_reports (
    workshop_id, report_number, work_order_id, customer_id, vehicle_id,
    title, complaint, findings, recommendations, status,
    completed_at, created_by, updated_by
  ) values (
    v_order.workshop_id, public.next_diagnostic_report_number(), v_order.id,
    v_order.customer_id, v_order.vehicle_id, trim(p_title), trim(p_complaint),
    nullif(trim(p_findings), ''), nullif(trim(p_recommendations), ''), p_status,
    case when p_status = 'completed' then timezone('utc', now()) else null end,
    auth.uid(), auth.uid()
  ) returning * into v_report;

  for v_item in select value from jsonb_array_elements(coalesce(p_dtcs, '[]'::jsonb))
  loop
    v_sort := v_sort + 10;
    if coalesce(v_item->>'code', '') <> '' then
      insert into public.diagnostic_items (
        workshop_id, report_id, item_type, code, title, interpretation, sort_order
      ) values (
        v_order.workshop_id, v_report.id, 'dtc', upper(trim(v_item->>'code')),
        coalesce(nullif(trim(v_item->>'description'), ''), upper(trim(v_item->>'code'))),
        nullif(trim(v_item->>'description'), ''), v_sort
      );
    end if;
  end loop;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_order.workshop_id, auth.uid(), 'created', 'diagnostic_report', v_report.id,
    jsonb_build_object('work_order_id', p_work_order_id));

  return v_report;
end;
$$;

grant execute on function public.create_diagnostic_report(uuid,text,text,text,text,public.diagnostic_status,jsonb) to authenticated;

create or replace function public.update_diagnostic_report(
  p_report_id uuid,
  p_title text,
  p_complaint text,
  p_findings text,
  p_recommendations text,
  p_technician_conclusion text,
  p_customer_summary text,
  p_status public.diagnostic_status,
  p_customer_visible boolean,
  p_dtcs jsonb default '[]'::jsonb
)
returns public.diagnostic_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.diagnostic_reports;
  v_item jsonb;
  v_sort integer := 0;
begin
  if not public.is_staff() then raise exception 'Forbidden'; end if;

  select * into v_report
  from public.diagnostic_reports dr
  where dr.id = p_report_id
    and dr.workshop_id = public.current_workshop_id()
  for update;

  if not found then raise exception 'Diagnostic report not found'; end if;

  if p_customer_visible and p_status <> 'completed' then
    raise exception 'Only completed diagnostic reports can be visible to customers';
  end if;

  update public.diagnostic_reports
  set title = trim(p_title),
      complaint = trim(p_complaint),
      findings = nullif(trim(p_findings), ''),
      recommendations = nullif(trim(p_recommendations), ''),
      technician_conclusion = nullif(trim(p_technician_conclusion), ''),
      customer_summary = nullif(trim(p_customer_summary), ''),
      status = p_status,
      customer_visible = p_customer_visible,
      completed_at = case
        when p_status = 'completed' and completed_at is null then timezone('utc', now())
        when p_status <> 'completed' then null
        else completed_at
      end,
      updated_by = auth.uid()
  where id = p_report_id
  returning * into v_report;

  delete from public.diagnostic_items
  where report_id = p_report_id and item_type = 'dtc';

  for v_item in select value from jsonb_array_elements(coalesce(p_dtcs, '[]'::jsonb))
  loop
    v_sort := v_sort + 10;
    if coalesce(v_item->>'code', '') <> '' then
      insert into public.diagnostic_items (
        workshop_id, report_id, item_type, code, title, interpretation, sort_order
      ) values (
        v_report.workshop_id, v_report.id, 'dtc', upper(trim(v_item->>'code')),
        coalesce(nullif(trim(v_item->>'description'), ''), upper(trim(v_item->>'code'))),
        nullif(trim(v_item->>'description'), ''), v_sort
      );
    end if;
  end loop;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_report.workshop_id, auth.uid(), 'updated', 'diagnostic_report', v_report.id,
    jsonb_build_object('status', p_status, 'customer_visible', p_customer_visible));

  return v_report;
end;
$$;

grant execute on function public.update_diagnostic_report(uuid,text,text,text,text,text,text,public.diagnostic_status,boolean,jsonb) to authenticated;

-- ============================================================================
-- Source: supabase/migrations/008_security_hardening_and_admin_bootstrap.sql
-- ============================================================================
-- 008: Security hardening and Pilot admin bootstrap
-- Keeps internal SECURITY DEFINER functions unavailable to anonymous users,
-- while preserving the intentionally public booking RPC.

revoke all on function public.current_workshop_id() from public, anon;
revoke all on function public.current_staff_role() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.current_customer_id() from public, anon;
revoke all on function public.current_customer_workshop_id() from public, anon;
revoke all on function public.set_booking_status(uuid, public.booking_status, text) from public, anon;
revoke all on function public.convert_booking_to_work_order(uuid) from public, anon;
revoke all on function public.set_work_order_status(uuid, public.work_order_status, text) from public, anon;
revoke all on function public.next_diagnostic_report_number() from public, anon;
revoke all on function public.create_diagnostic_report(uuid,text,text,text,text,public.diagnostic_status,jsonb) from public, anon;
revoke all on function public.update_diagnostic_report(uuid,text,text,text,text,text,text,public.diagnostic_status,boolean,jsonb) from public, anon;

revoke all on function public.create_public_booking(text,text,text,text,integer,text,text,text,timestamptz) from public;

grant execute on function public.current_workshop_id() to authenticated;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_customer_id() to authenticated;
grant execute on function public.current_customer_workshop_id() to authenticated;
grant execute on function public.set_booking_status(uuid, public.booking_status, text) to authenticated;
grant execute on function public.convert_booking_to_work_order(uuid) to authenticated;
grant execute on function public.set_work_order_status(uuid, public.work_order_status, text) to authenticated;
grant execute on function public.next_diagnostic_report_number() to authenticated;
grant execute on function public.create_diagnostic_report(uuid,text,text,text,text,public.diagnostic_status,jsonb) to authenticated;
grant execute on function public.update_diagnostic_report(uuid,text,text,text,text,text,text,public.diagnostic_status,boolean,jsonb) to authenticated;
grant execute on function public.create_public_booking(text,text,text,text,integer,text,text,text,timestamptz) to anon, authenticated;

alter function public.booking_transition_allowed(public.booking_status, public.booking_status)
  set search_path = public;

alter function public.work_order_transition_allowed(public.work_order_status, public.work_order_status)
  set search_path = public;

-- Pilot-only bootstrap: once this exact email is confirmed in Supabase Auth,
-- link it to the default workshop as the first active admin.
create or replace function public.bootstrap_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'digitaldiagpro@gmail.com'
     and new.email_confirmed_at is not null
     and not exists (
       select 1 from public.users where role = 'admin' and is_active = true
     ) then
    insert into public.users (id, workshop_id, full_name, role, is_active)
    values (
      new.id,
      '00000000-0000-4000-8000-000000000001',
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'أبو رزان'),
      'admin',
      true
    )
    on conflict (id) do update set
      workshop_id = excluded.workshop_id,
      full_name = excluded.full_name,
      role = 'admin',
      is_active = true;
  end if;

  return new;
end;
$$;

revoke all on function public.bootstrap_first_admin() from public, anon, authenticated;

drop trigger if exists bootstrap_first_admin_after_auth_user on auth.users;
create trigger bootstrap_first_admin_after_auth_user
after insert or update of email_confirmed_at on auth.users
for each row execute function public.bootstrap_first_admin();

-- ============================================================================
-- Source: supabase/migrations/009_pilot_operations_modules.sql
-- ============================================================================
-- 009: Final Pilot operations modules
-- Adds full customer, vehicle, service, approval, and quality workflows.

create type public.approval_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.approval_channel as enum ('in_person', 'phone', 'whatsapp', 'portal', 'other');
create type public.quality_check_status as enum ('draft', 'passed', 'failed');

alter table public.vehicles
  add column is_active boolean not null default true;

create index vehicles_workshop_active_idx
  on public.vehicles (workshop_id, is_active, updated_at desc);

create table public.work_order_approvals (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  requested_amount numeric(12,2) not null default 0,
  items_summary text not null,
  status public.approval_status not null default 'pending',
  channel public.approval_channel not null default 'whatsapp',
  response_note text,
  customer_visible boolean not null default true,
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint work_order_approvals_amount check (requested_amount >= 0),
  constraint work_order_approvals_summary check (char_length(trim(items_summary)) between 3 and 5000),
  constraint work_order_approvals_response_time check (
    (status = 'pending' and responded_at is null)
    or (status <> 'pending' and responded_at is not null)
  )
);

create unique index work_order_approvals_one_pending_idx
  on public.work_order_approvals (work_order_id)
  where status = 'pending';
create index work_order_approvals_workshop_status_idx
  on public.work_order_approvals (workshop_id, status, requested_at desc);
create index work_order_approvals_customer_idx
  on public.work_order_approvals (customer_id, requested_at desc);

create table public.quality_checks (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  work_order_id uuid not null unique references public.work_orders(id) on delete cascade,
  status public.quality_check_status not null default 'draft',
  checklist jsonb not null default '[]'::jsonb,
  notes text,
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quality_checks_array check (jsonb_typeof(checklist) = 'array'),
  constraint quality_checks_completed_time check (
    (status = 'draft' and checked_at is null)
    or (status <> 'draft' and checked_at is not null)
  )
);

create index quality_checks_workshop_status_idx
  on public.quality_checks (workshop_id, status, updated_at desc);

create trigger work_order_approvals_set_updated_at
before update on public.work_order_approvals
for each row execute function public.set_updated_at();

create trigger quality_checks_set_updated_at
before update on public.quality_checks
for each row execute function public.set_updated_at();

alter table public.work_order_approvals enable row level security;
alter table public.quality_checks enable row level security;

create policy "staff read approvals" on public.work_order_approvals
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());

create policy "staff insert approvals" on public.work_order_approvals
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());

create policy "staff update approvals" on public.work_order_approvals
for update to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff())
with check (workshop_id = public.current_workshop_id() and public.is_staff());

create policy "customer reads own visible approvals" on public.work_order_approvals
for select to authenticated
using (customer_id = public.current_customer_id() and customer_visible = true);

create policy "staff read quality checks" on public.quality_checks
for select to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff());

create policy "staff insert quality checks" on public.quality_checks
for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.is_staff());

create policy "staff update quality checks" on public.quality_checks
for update to authenticated
using (workshop_id = public.current_workshop_id() and public.is_staff())
with check (workshop_id = public.current_workshop_id() and public.is_staff());

create or replace function public.create_approval_request(
  p_work_order_id uuid,
  p_requested_amount numeric,
  p_items_summary text,
  p_channel public.approval_channel default 'whatsapp',
  p_customer_visible boolean default true
)
returns public.work_order_approvals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders;
  v_approval public.work_order_approvals;
begin
  if not public.is_staff() then
    raise exception 'غير مصرح بإنشاء طلب موافقة';
  end if;

  if p_requested_amount is null or p_requested_amount < 0 then
    raise exception 'قيمة الموافقة غير صحيحة';
  end if;

  if char_length(trim(coalesce(p_items_summary, ''))) < 3 then
    raise exception 'اكتب ملخص الأعمال أو عرض السعر';
  end if;

  select * into v_order
  from public.work_orders
  where id = p_work_order_id
    and workshop_id = public.current_workshop_id()
  for update;

  if v_order.id is null then
    raise exception 'أمر العمل غير موجود';
  end if;

  if v_order.status not in ('diagnosing', 'waiting_approval') then
    raise exception 'طلب الموافقة متاح أثناء التشخيص أو انتظار الموافقة فقط';
  end if;

  if exists (
    select 1 from public.work_order_approvals
    where work_order_id = p_work_order_id and status = 'pending'
  ) then
    raise exception 'يوجد طلب موافقة معلق لهذا الأمر';
  end if;

  insert into public.work_order_approvals (
    workshop_id, work_order_id, customer_id, requested_amount,
    items_summary, status, channel, customer_visible, requested_by
  ) values (
    v_order.workshop_id, v_order.id, v_order.customer_id, p_requested_amount,
    trim(p_items_summary), 'pending', p_channel, p_customer_visible, auth.uid()
  )
  returning * into v_approval;

  if v_order.status = 'diagnosing' then
    update public.work_orders
    set status = 'waiting_approval', approval_note = trim(p_items_summary)
    where id = v_order.id;

    insert into public.work_order_status_logs (
      workshop_id, work_order_id, from_status, to_status, note, changed_by
    ) values (
      v_order.workshop_id, v_order.id, 'diagnosing', 'waiting_approval',
      'تم إنشاء طلب موافقة بقيمة ' || p_requested_amount::text || ' ريال', auth.uid()
    );
  end if;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_order.workshop_id, auth.uid(), 'approval.requested', 'work_order_approval', v_approval.id,
    jsonb_build_object('work_order_id', v_order.id, 'requested_amount', p_requested_amount, 'channel', p_channel)
  );

  return v_approval;
end;
$$;

create or replace function public.decide_approval(
  p_approval_id uuid,
  p_status public.approval_status,
  p_channel public.approval_channel,
  p_response_note text default null
)
returns public.work_order_approvals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_approval public.work_order_approvals;
  v_order public.work_orders;
begin
  if not public.is_staff() then
    raise exception 'غير مصرح بتسجيل قرار الموافقة';
  end if;

  if p_status not in ('approved', 'rejected', 'cancelled') then
    raise exception 'قرار الموافقة غير صحيح';
  end if;

  select * into v_approval
  from public.work_order_approvals
  where id = p_approval_id
    and workshop_id = public.current_workshop_id()
  for update;

  if v_approval.id is null then
    raise exception 'طلب الموافقة غير موجود';
  end if;

  if v_approval.status <> 'pending' then
    raise exception 'تم اتخاذ قرار لهذا الطلب مسبقًا';
  end if;

  update public.work_order_approvals
  set status = p_status,
      channel = p_channel,
      response_note = nullif(trim(coalesce(p_response_note, '')), ''),
      decided_by = auth.uid(),
      responded_at = timezone('utc', now())
  where id = v_approval.id
  returning * into v_approval;

  select * into v_order from public.work_orders where id = v_approval.work_order_id for update;

  if p_status = 'approved' and v_order.status = 'waiting_approval' then
    update public.work_orders set status = 'approved' where id = v_order.id;
    insert into public.work_order_status_logs (
      workshop_id, work_order_id, from_status, to_status, note, changed_by
    ) values (
      v_order.workshop_id, v_order.id, 'waiting_approval', 'approved',
      coalesce(nullif(trim(p_response_note), ''), 'تم تسجيل موافقة العميل'), auth.uid()
    );
  end if;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_approval.workshop_id, auth.uid(), 'approval.' || p_status::text, 'work_order_approval', v_approval.id,
    jsonb_build_object('work_order_id', v_approval.work_order_id, 'channel', p_channel)
  );

  return v_approval;
end;
$$;

create or replace function public.customer_decide_approval(
  p_approval_id uuid,
  p_status public.approval_status,
  p_response_note text default null
)
returns public.work_order_approvals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_approval public.work_order_approvals;
  v_order public.work_orders;
begin
  v_customer_id := public.current_customer_id();
  if v_customer_id is null then
    raise exception 'حساب العميل غير مرتبط';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'القرار غير صحيح';
  end if;

  select * into v_approval
  from public.work_order_approvals
  where id = p_approval_id
    and customer_id = v_customer_id
    and customer_visible = true
  for update;

  if v_approval.id is null then
    raise exception 'طلب الموافقة غير موجود';
  end if;

  if v_approval.status <> 'pending' then
    raise exception 'تم اتخاذ قرار لهذا الطلب مسبقًا';
  end if;

  update public.work_order_approvals
  set status = p_status,
      channel = 'portal',
      response_note = nullif(trim(coalesce(p_response_note, '')), ''),
      decided_by = auth.uid(),
      responded_at = timezone('utc', now())
  where id = v_approval.id
  returning * into v_approval;

  select * into v_order from public.work_orders where id = v_approval.work_order_id for update;

  if p_status = 'approved' and v_order.status = 'waiting_approval' then
    update public.work_orders set status = 'approved' where id = v_order.id;
    insert into public.work_order_status_logs (
      workshop_id, work_order_id, from_status, to_status, note, changed_by
    ) values (
      v_order.workshop_id, v_order.id, 'waiting_approval', 'approved',
      coalesce(nullif(trim(p_response_note), ''), 'وافق العميل من بوابة العميل'), auth.uid()
    );
  end if;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_approval.workshop_id, auth.uid(), 'approval.customer_' || p_status::text,
    'work_order_approval', v_approval.id,
    jsonb_build_object('work_order_id', v_approval.work_order_id, 'channel', 'portal')
  );

  return v_approval;
end;
$$;

-- Make quality control mandatory before an order can become ready.
create or replace function public.work_order_transition_allowed(
  p_from public.work_order_status,
  p_to public.work_order_status
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case p_from
    when 'open' then p_to in ('diagnosing', 'cancelled')
    when 'diagnosing' then p_to in ('waiting_approval', 'approved', 'in_progress', 'cancelled')
    when 'waiting_approval' then p_to in ('approved', 'cancelled')
    when 'approved' then p_to in ('in_progress', 'cancelled')
    when 'in_progress' then p_to in ('quality_check', 'cancelled')
    when 'quality_check' then p_to in ('in_progress', 'ready')
    when 'ready' then p_to = 'delivered'
    else false
  end;
$$;

create or replace function public.save_quality_check(
  p_work_order_id uuid,
  p_status public.quality_check_status,
  p_checklist jsonb,
  p_notes text default null
)
returns public.quality_checks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders;
  v_check public.quality_checks;
  v_has_pending boolean;
  v_has_fail boolean;
begin
  if not public.is_staff() then
    raise exception 'غير مصرح بحفظ فحص الجودة';
  end if;

  if jsonb_typeof(p_checklist) <> 'array' or jsonb_array_length(p_checklist) = 0 or jsonb_array_length(p_checklist) > 25 then
    raise exception 'قائمة فحص الجودة غير صحيحة';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_checklist) item
    where coalesce(item->>'key', '') = ''
       or coalesce(item->>'label', '') = ''
       or coalesce(item->>'result', '') not in ('pending', 'pass', 'fail', 'not_applicable')
  ) then
    raise exception 'أحد بنود الجودة غير صحيح';
  end if;

  select exists (
    select 1 from jsonb_array_elements(p_checklist) item
    where item->>'result' = 'pending'
  ) into v_has_pending;

  select exists (
    select 1 from jsonb_array_elements(p_checklist) item
    where item->>'result' = 'fail'
  ) into v_has_fail;

  if p_status = 'passed' and (v_has_pending or v_has_fail) then
    raise exception 'لا يمكن اعتماد الجودة قبل إكمال جميع البنود ومعالجة البنود غير المجتازة';
  end if;

  if p_status = 'failed' and not v_has_fail then
    raise exception 'حدد بندًا واحدًا على الأقل يحتاج إعادة عمل';
  end if;

  select * into v_order
  from public.work_orders
  where id = p_work_order_id
    and workshop_id = public.current_workshop_id()
  for update;

  if v_order.id is null then
    raise exception 'أمر العمل غير موجود';
  end if;

  if v_order.status not in ('in_progress', 'quality_check', 'ready') then
    raise exception 'فحص الجودة متاح أثناء العمل أو مرحلة الجودة أو الجاهزية';
  end if;

  if v_order.status = 'ready' and p_status <> 'passed' then
    raise exception 'أمر العمل جاهز بالفعل؛ أعده إلى مرحلة مناسبة قبل تعديل نتيجة الجودة';
  end if;

  insert into public.quality_checks (
    workshop_id, work_order_id, status, checklist, notes, checked_by, checked_at
  ) values (
    v_order.workshop_id, v_order.id, p_status, p_checklist,
    nullif(trim(coalesce(p_notes, '')), ''), auth.uid(),
    case when p_status = 'draft' then null else timezone('utc', now()) end
  )
  on conflict (work_order_id) do update set
    status = excluded.status,
    checklist = excluded.checklist,
    notes = excluded.notes,
    checked_by = excluded.checked_by,
    checked_at = excluded.checked_at
  returning * into v_check;

  if p_status = 'passed' and v_order.status = 'quality_check' then
    update public.work_orders set status = 'ready', completed_at = coalesce(completed_at, timezone('utc', now())) where id = v_order.id;
    insert into public.work_order_status_logs (
      workshop_id, work_order_id, from_status, to_status, note, changed_by
    ) values (
      v_order.workshop_id, v_order.id, 'quality_check', 'ready',
      'اجتاز فحص الجودة وأصبح جاهزًا للتسليم', auth.uid()
    );
  elsif p_status = 'failed' and v_order.status = 'quality_check' then
    update public.work_orders set status = 'in_progress' where id = v_order.id;
    insert into public.work_order_status_logs (
      workshop_id, work_order_id, from_status, to_status, note, changed_by
    ) values (
      v_order.workshop_id, v_order.id, 'quality_check', 'in_progress',
      coalesce(nullif(trim(p_notes), ''), 'لم يجتز فحص الجودة ويحتاج إعادة عمل'), auth.uid()
    );
  end if;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_order.workshop_id, auth.uid(), 'quality.' || p_status::text, 'quality_check', v_check.id,
    jsonb_build_object('work_order_id', v_order.id)
  );

  return v_check;
end;
$$;

revoke all on function public.create_approval_request(uuid,numeric,text,public.approval_channel,boolean) from public, anon;
revoke all on function public.decide_approval(uuid,public.approval_status,public.approval_channel,text) from public, anon;
revoke all on function public.customer_decide_approval(uuid,public.approval_status,text) from public, anon;
revoke all on function public.save_quality_check(uuid,public.quality_check_status,jsonb,text) from public, anon;

grant execute on function public.create_approval_request(uuid,numeric,text,public.approval_channel,boolean) to authenticated;
grant execute on function public.decide_approval(uuid,public.approval_status,public.approval_channel,text) to authenticated;
grant execute on function public.customer_decide_approval(uuid,public.approval_status,text) to authenticated;
grant execute on function public.save_quality_check(uuid,public.quality_check_status,jsonb,text) to authenticated;

grant select, insert, update on public.work_order_approvals to authenticated;
grant select, insert, update on public.quality_checks to authenticated;

-- ============================================================================
-- Source: supabase/migrations/010_operational_hardening.sql
-- ============================================================================
-- Digital DiagPro Pilot v1.2.0
-- Operational hardening after owner/staff/customer acceptance review.

alter table public.bookings
  add column if not exists service_name_snapshot text,
  add column if not exists service_price_snapshot numeric(12,2),
  add column if not exists service_minutes_snapshot integer,
  add column if not exists consent_at timestamptz;

update public.bookings b
set service_name_snapshot = coalesce(b.service_name_snapshot, sc.name_ar),
    service_price_snapshot = coalesce(b.service_price_snapshot, sc.base_price),
    service_minutes_snapshot = coalesce(b.service_minutes_snapshot, sc.estimated_minutes)
from public.service_catalog sc
where sc.workshop_id = b.workshop_id
  and sc.code = b.service_code
  and (b.service_name_snapshot is null or b.service_price_snapshot is null or b.service_minutes_snapshot is null);

create or replace function public.has_staff_role(variadic p_roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() = any(p_roles), false);
$$;

revoke all on function public.has_staff_role(public.staff_role[]) from public, anon;
grant execute on function public.has_staff_role(public.staff_role[]) to authenticated;

-- Direct table writes follow the same separation of duties as the UI and RPC layer.
drop policy if exists "front desk insert customers" on public.customers;
drop policy if exists "front desk update customers" on public.customers;
drop policy if exists "front desk insert vehicles" on public.vehicles;
drop policy if exists "front desk update vehicles" on public.vehicles;
drop policy if exists "front desk insert bookings" on public.bookings;
drop policy if exists "front desk update bookings" on public.bookings;
drop policy if exists "front desk insert work orders" on public.work_orders;
drop policy if exists "front desk update work orders" on public.work_orders;
drop policy if exists "front desk insert approvals" on public.work_order_approvals;
drop policy if exists "front desk update approvals" on public.work_order_approvals;
drop policy if exists "technical staff insert diagnostics" on public.diagnostic_reports;
drop policy if exists "technical staff update diagnostics" on public.diagnostic_reports;
drop policy if exists "technical staff delete diagnostics" on public.diagnostic_reports;
drop policy if exists "technical staff insert diagnostic items" on public.diagnostic_items;
drop policy if exists "technical staff update diagnostic items" on public.diagnostic_items;
drop policy if exists "technical staff delete diagnostic items" on public.diagnostic_items;
drop policy if exists "technical staff insert quality checks" on public.quality_checks;
drop policy if exists "technical staff update quality checks" on public.quality_checks;

drop policy if exists "staff insert customers" on public.customers;
drop policy if exists "staff update customers" on public.customers;
create policy "front desk insert customers" on public.customers for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));
create policy "front desk update customers" on public.customers for update to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role))
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));

drop policy if exists "staff insert vehicles" on public.vehicles;
drop policy if exists "staff update vehicles" on public.vehicles;
create policy "front desk insert vehicles" on public.vehicles for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));
create policy "front desk update vehicles" on public.vehicles for update to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role))
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));

drop policy if exists "staff insert bookings" on public.bookings;
drop policy if exists "staff update bookings" on public.bookings;
create policy "front desk insert bookings" on public.bookings for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));
create policy "front desk update bookings" on public.bookings for update to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role))
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));

drop policy if exists "staff insert work orders" on public.work_orders;
create policy "front desk insert work orders" on public.work_orders for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));

drop policy if exists "staff update work orders" on public.work_orders;
create policy "front desk update work orders" on public.work_orders for update to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role))
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));

drop policy if exists "staff insert approvals" on public.work_order_approvals;
drop policy if exists "staff update approvals" on public.work_order_approvals;
create policy "front desk insert approvals" on public.work_order_approvals for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));
create policy "front desk update approvals" on public.work_order_approvals for update to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role))
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role));

drop policy if exists "staff insert diagnostics" on public.diagnostic_reports;
drop policy if exists "staff update diagnostics" on public.diagnostic_reports;
create policy "technical staff insert diagnostics" on public.diagnostic_reports for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role));
create policy "technical staff update diagnostics" on public.diagnostic_reports for update to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role))
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role));
drop policy if exists "staff delete diagnostics" on public.diagnostic_reports;
create policy "technical staff delete diagnostics" on public.diagnostic_reports for delete to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role));

drop policy if exists "staff insert diagnostic items" on public.diagnostic_items;
drop policy if exists "staff update diagnostic items" on public.diagnostic_items;
drop policy if exists "staff delete diagnostic items" on public.diagnostic_items;
create policy "technical staff insert diagnostic items" on public.diagnostic_items for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role));
create policy "technical staff update diagnostic items" on public.diagnostic_items for update to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role))
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role));
create policy "technical staff delete diagnostic items" on public.diagnostic_items for delete to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role));

drop policy if exists "staff insert quality checks" on public.quality_checks;
drop policy if exists "staff update quality checks" on public.quality_checks;
create policy "technical staff insert quality checks" on public.quality_checks for insert to authenticated
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role));
create policy "technical staff update quality checks" on public.quality_checks for update to authenticated
using (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role))
with check (workshop_id = public.current_workshop_id() and public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role));

create index if not exists bookings_vehicle_id_idx on public.bookings (vehicle_id);
create index if not exists bookings_assigned_to_idx on public.bookings (assigned_to) where assigned_to is not null;
create index if not exists work_orders_assigned_to_idx on public.work_orders (assigned_to) where assigned_to is not null;
create index if not exists customer_documents_vehicle_idx on public.customer_documents (vehicle_id) where vehicle_id is not null;
create index if not exists customer_documents_booking_idx on public.customer_documents (booking_id) where booking_id is not null;
create index if not exists customer_documents_diagnostic_report_idx on public.customer_documents (diagnostic_report_id) where diagnostic_report_id is not null;
create index if not exists work_order_approvals_requested_by_idx on public.work_order_approvals (requested_by) where requested_by is not null;
create index if not exists work_order_approvals_decided_by_idx on public.work_order_approvals (decided_by) where decided_by is not null;
create index if not exists quality_checks_checked_by_idx on public.quality_checks (checked_by) where checked_by is not null;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- Snapshot service values and add a light anti-abuse check for website bookings.
create or replace function public.prepare_booking_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.service_catalog;
begin
  select * into v_service
  from public.service_catalog
  where workshop_id = new.workshop_id and code = new.service_code and is_active = true;

  if v_service.id is null then raise exception 'الخدمة غير موجودة أو متوقفة'; end if;
  new.service_name_snapshot := coalesce(new.service_name_snapshot, v_service.name_ar);
  new.service_price_snapshot := coalesce(new.service_price_snapshot, v_service.base_price);
  new.service_minutes_snapshot := coalesce(new.service_minutes_snapshot, v_service.estimated_minutes);
  if new.source = 'website' then
    new.consent_at := coalesce(new.consent_at, timezone('utc', now()));
    if (select count(*) from public.bookings b
        where b.workshop_id = new.workshop_id and b.customer_id = new.customer_id
          and b.created_at >= timezone('utc', now()) - interval '24 hours'
          and b.status not in ('cancelled','no_show')) >= 5 then
      raise exception 'تم تجاوز عدد طلبات الحجز المسموح لهذا الرقم خلال 24 ساعة';
    end if;
    if exists (select 1 from public.bookings b
      where b.workshop_id = new.workshop_id and b.customer_id = new.customer_id
        and b.service_code = new.service_code and b.preferred_at = new.preferred_at
        and b.created_at >= timezone('utc', now()) - interval '10 minutes') then
      raise exception 'تم إرسال الحجز نفسه مؤخرًا';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_prepare_snapshot on public.bookings;
create trigger bookings_prepare_snapshot before insert on public.bookings
for each row execute function public.prepare_booking_snapshot();

create or replace function public.sync_booking_from_work_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.booking_status;
  v_current public.booking_status;
begin
  if new.booking_id is null or new.status = old.status then return new; end if;
  v_target := case new.status
    when 'diagnosing' then 'in_diagnosis'
    when 'waiting_approval' then 'waiting_approval'
    when 'approved' then 'approved'
    when 'in_progress' then 'in_service'
    when 'delivered' then 'completed'
    when 'cancelled' then 'cancelled'
    else null
  end;
  if new.status = 'cancelled' then
    update public.work_order_approvals
    set status = 'cancelled',
        response_note = coalesce(response_note, 'ألغي أمر العمل'),
        decided_by = auth.uid(),
        responded_at = timezone('utc', now())
    where work_order_id = new.id and status = 'pending';
  end if;
  if v_target is null then return new; end if;
  select status into v_current from public.bookings where id = new.booking_id for update;
  if v_current is null or v_current = v_target or v_current in ('completed','cancelled') then return new; end if;
  update public.bookings set status = v_target where id = new.booking_id;
  insert into public.booking_status_logs (workshop_id, booking_id, from_status, to_status, note, changed_by)
  values (new.workshop_id, new.booking_id, v_current, v_target, 'مزامنة تلقائية من أمر العمل', auth.uid());
  return new;
end;
$$;

drop trigger if exists work_orders_sync_booking_status on public.work_orders;
create trigger work_orders_sync_booking_status after update of status on public.work_orders
for each row execute function public.sync_booking_from_work_order();

create or replace function public.prevent_used_service_code_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.code <> new.code and exists (
    select 1 from public.bookings b where b.workshop_id = old.workshop_id and b.service_code = old.code limit 1
  ) then
    raise exception 'لا يمكن تغيير رمز خدمة مستخدمة في سجلات سابقة';
  end if;
  return new;
end;
$$;

drop trigger if exists service_catalog_prevent_used_code_change on public.service_catalog;
create trigger service_catalog_prevent_used_code_change before update of code on public.service_catalog
for each row execute function public.prevent_used_service_code_change();


create or replace function public.set_booking_status(
  p_booking_id uuid,
  p_status public.booking_status,
  p_note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_from public.booking_status;
begin
  if not public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role) then raise exception 'غير مصرح بهذه العملية'; end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.workshop_id = public.current_workshop_id()
  for update;

  if not found then raise exception 'Booking not found'; end if;
  v_from := v_booking.status;

  if v_from = p_status then return v_booking; end if;
  if not public.booking_transition_allowed(v_from, p_status) then
    raise exception 'Invalid booking transition from % to %', v_from, p_status;
  end if;

  update public.bookings
  set status = p_status,
      confirmed_at = case when p_status = 'confirmed' and confirmed_at is null then timezone('utc', now()) else confirmed_at end
  where id = p_booking_id
  returning * into v_booking;

  insert into public.booking_status_logs (
    workshop_id, booking_id, from_status, to_status, note, changed_by
  ) values (
    v_booking.workshop_id, v_booking.id, v_from, p_status, nullif(trim(p_note), ''), auth.uid()
  );

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_booking.workshop_id, auth.uid(), 'status_changed', 'booking', v_booking.id,
    jsonb_build_object('from', v_from, 'to', p_status, 'note', p_note));

  return v_booking;
end;
$$;

create or replace function public.convert_booking_to_work_order(p_booking_id uuid)
returns public.work_orders
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking public.bookings;
  v_order public.work_orders;
  v_number text;
begin
  if not public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role) then raise exception 'غير مصرح بهذه العملية'; end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.workshop_id = public.current_workshop_id()
  for update;

  if not found then raise exception 'Booking not found'; end if;

  select * into v_order from public.work_orders wo where wo.booking_id = p_booking_id;
  if found then return v_order; end if;

  if v_booking.status in ('cancelled', 'no_show', 'completed') then
    raise exception 'Booking cannot be converted in status %', v_booking.status;
  end if;

  v_number := 'DP-WO-' || to_char(timezone('Asia/Riyadh', now()), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.work_orders (
    workshop_id, work_order_number, booking_id, customer_id, vehicle_id,
    complaint, status, priority, assigned_to, created_by
  ) values (
    v_booking.workshop_id, v_number, v_booking.id, v_booking.customer_id, v_booking.vehicle_id,
    v_booking.complaint, 'open', v_booking.priority, v_booking.assigned_to, auth.uid()
  ) returning * into v_order;

  insert into public.work_order_status_logs (
    workshop_id, work_order_id, from_status, to_status, note, changed_by
  ) values (
    v_order.workshop_id, v_order.id, null, 'open', 'Created from booking', auth.uid()
  );

  if v_booking.status in ('new', 'confirmed') then
    update public.bookings set status = 'arrived' where id = v_booking.id;
    insert into public.booking_status_logs (
      workshop_id, booking_id, from_status, to_status, note, changed_by
    ) values (
      v_booking.workshop_id, v_booking.id, v_booking.status, 'arrived', 'Converted to work order', auth.uid()
    );
  end if;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_order.workshop_id, auth.uid(), 'created_from_booking', 'work_order', v_order.id,
    jsonb_build_object('booking_id', p_booking_id));

  return v_order;
end;
$$;

create or replace function public.set_work_order_status(
  p_work_order_id uuid,
  p_status public.work_order_status,
  p_note text default null
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders;
  v_from public.work_order_status;
begin
  if not public.is_staff() then raise exception 'Forbidden'; end if;

  select * into v_order
  from public.work_orders wo
  where wo.id = p_work_order_id
    and wo.workshop_id = public.current_workshop_id()
  for update;

  if not found then raise exception 'Work order not found'; end if;
  v_from := v_order.status;
  if p_status in ('waiting_approval', 'approved', 'ready') then
    raise exception 'استخدم مسار الموافقات أو فحص الجودة لتسجيل هذه الحالة';
  end if;
  if v_from = 'quality_check' and p_status = 'in_progress' then
    raise exception 'سجل نتيجة فحص جودة غير مجتاز لإعادة أمر العمل إلى التنفيذ';
  end if;
  if v_from = 'diagnosing' and p_status = 'in_progress' and exists (
    select 1 from public.work_order_approvals a where a.work_order_id = v_order.id and a.status = 'pending'
  ) then
    raise exception 'يوجد طلب موافقة معلق؛ لا يمكن بدء التنفيذ قبل حسمه';
  end if;

  if v_from = p_status then return v_order; end if;
  if not public.work_order_transition_allowed(v_from, p_status) then
    raise exception 'Invalid work order transition from % to %', v_from, p_status;
  end if;

  update public.work_orders
  set status = p_status,
      completed_at = case when p_status = 'ready' and completed_at is null then timezone('utc', now()) else completed_at end,
      delivered_at = case when p_status = 'delivered' then timezone('utc', now()) else delivered_at end
  where id = p_work_order_id
  returning * into v_order;

  insert into public.work_order_status_logs (
    workshop_id, work_order_id, from_status, to_status, note, changed_by
  ) values (
    v_order.workshop_id, v_order.id, v_from, p_status, nullif(trim(p_note), ''), auth.uid()
  );

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_order.workshop_id, auth.uid(), 'status_changed', 'work_order', v_order.id,
    jsonb_build_object('from', v_from, 'to', p_status, 'note', p_note));

  return v_order;
end;
$$;

create or replace function public.create_diagnostic_report(
  p_work_order_id uuid,
  p_title text,
  p_complaint text,
  p_findings text default '',
  p_recommendations text default '',
  p_status public.diagnostic_status default 'draft',
  p_dtcs jsonb default '[]'::jsonb
)
returns public.diagnostic_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders;
  v_report public.diagnostic_reports;
  v_item jsonb;
  v_sort integer := 0;
begin
  if not public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role) then raise exception 'غير مصرح بهذه العملية'; end if;

  select * into v_order
  from public.work_orders wo
  where wo.id = p_work_order_id
    and wo.workshop_id = public.current_workshop_id();

  if not found then raise exception 'Work order not found'; end if;

  insert into public.diagnostic_reports (
    workshop_id, report_number, work_order_id, customer_id, vehicle_id,
    title, complaint, findings, recommendations, status,
    completed_at, created_by, updated_by
  ) values (
    v_order.workshop_id, public.next_diagnostic_report_number(), v_order.id,
    v_order.customer_id, v_order.vehicle_id, trim(p_title), trim(p_complaint),
    nullif(trim(p_findings), ''), nullif(trim(p_recommendations), ''), p_status,
    case when p_status = 'completed' then timezone('utc', now()) else null end,
    auth.uid(), auth.uid()
  ) returning * into v_report;

  for v_item in select value from jsonb_array_elements(coalesce(p_dtcs, '[]'::jsonb))
  loop
    v_sort := v_sort + 10;
    if coalesce(v_item->>'code', '') <> '' then
      insert into public.diagnostic_items (
        workshop_id, report_id, item_type, code, title, interpretation, sort_order
      ) values (
        v_order.workshop_id, v_report.id, 'dtc', upper(trim(v_item->>'code')),
        coalesce(nullif(trim(v_item->>'description'), ''), upper(trim(v_item->>'code'))),
        nullif(trim(v_item->>'description'), ''), v_sort
      );
    end if;
  end loop;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_order.workshop_id, auth.uid(), 'created', 'diagnostic_report', v_report.id,
    jsonb_build_object('work_order_id', p_work_order_id));

  return v_report;
end;
$$;

create or replace function public.update_diagnostic_report(
  p_report_id uuid,
  p_title text,
  p_complaint text,
  p_findings text,
  p_recommendations text,
  p_technician_conclusion text,
  p_customer_summary text,
  p_status public.diagnostic_status,
  p_customer_visible boolean,
  p_dtcs jsonb default '[]'::jsonb
)
returns public.diagnostic_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.diagnostic_reports;
  v_item jsonb;
  v_sort integer := 0;
begin
  if not public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role) then raise exception 'غير مصرح بهذه العملية'; end if;

  select * into v_report
  from public.diagnostic_reports dr
  where dr.id = p_report_id
    and dr.workshop_id = public.current_workshop_id()
  for update;

  if not found then raise exception 'Diagnostic report not found'; end if;

  if p_customer_visible and p_status <> 'completed' then
    raise exception 'Only completed diagnostic reports can be visible to customers';
  end if;

  update public.diagnostic_reports
  set title = trim(p_title),
      complaint = trim(p_complaint),
      findings = nullif(trim(p_findings), ''),
      recommendations = nullif(trim(p_recommendations), ''),
      technician_conclusion = nullif(trim(p_technician_conclusion), ''),
      customer_summary = nullif(trim(p_customer_summary), ''),
      status = p_status,
      customer_visible = p_customer_visible,
      completed_at = case
        when p_status = 'completed' and completed_at is null then timezone('utc', now())
        when p_status <> 'completed' then null
        else completed_at
      end,
      updated_by = auth.uid()
  where id = p_report_id
  returning * into v_report;

  delete from public.diagnostic_items
  where report_id = p_report_id and item_type = 'dtc';

  for v_item in select value from jsonb_array_elements(coalesce(p_dtcs, '[]'::jsonb))
  loop
    v_sort := v_sort + 10;
    if coalesce(v_item->>'code', '') <> '' then
      insert into public.diagnostic_items (
        workshop_id, report_id, item_type, code, title, interpretation, sort_order
      ) values (
        v_report.workshop_id, v_report.id, 'dtc', upper(trim(v_item->>'code')),
        coalesce(nullif(trim(v_item->>'description'), ''), upper(trim(v_item->>'code'))),
        nullif(trim(v_item->>'description'), ''), v_sort
      );
    end if;
  end loop;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_report.workshop_id, auth.uid(), 'updated', 'diagnostic_report', v_report.id,
    jsonb_build_object('status', p_status, 'customer_visible', p_customer_visible));

  return v_report;
end;
$$;

create or replace function public.create_approval_request(
  p_work_order_id uuid,
  p_requested_amount numeric,
  p_items_summary text,
  p_channel public.approval_channel default 'whatsapp',
  p_customer_visible boolean default true
)
returns public.work_order_approvals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders;
  v_approval public.work_order_approvals;
begin
  if not public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role) then raise exception 'غير مصرح بهذه العملية'; end if;

  if p_requested_amount is null or p_requested_amount < 0 then
    raise exception 'قيمة الموافقة غير صحيحة';
  end if;

  if char_length(trim(coalesce(p_items_summary, ''))) < 3 then
    raise exception 'اكتب ملخص الأعمال أو عرض السعر';
  end if;

  select * into v_order
  from public.work_orders
  where id = p_work_order_id
    and workshop_id = public.current_workshop_id()
  for update;

  if v_order.id is null then
    raise exception 'أمر العمل غير موجود';
  end if;

  if v_order.status not in ('diagnosing', 'waiting_approval') then
    raise exception 'طلب الموافقة متاح أثناء التشخيص أو انتظار الموافقة فقط';
  end if;

  if exists (
    select 1 from public.work_order_approvals
    where work_order_id = p_work_order_id and status = 'pending'
  ) then
    raise exception 'يوجد طلب موافقة معلق لهذا الأمر';
  end if;

  insert into public.work_order_approvals (
    workshop_id, work_order_id, customer_id, requested_amount,
    items_summary, status, channel, customer_visible, requested_by
  ) values (
    v_order.workshop_id, v_order.id, v_order.customer_id, p_requested_amount,
    trim(p_items_summary), 'pending', p_channel, p_customer_visible, auth.uid()
  )
  returning * into v_approval;

  if v_order.status = 'diagnosing' then
    update public.work_orders
    set status = 'waiting_approval', approval_note = trim(p_items_summary)
    where id = v_order.id;

    insert into public.work_order_status_logs (
      workshop_id, work_order_id, from_status, to_status, note, changed_by
    ) values (
      v_order.workshop_id, v_order.id, 'diagnosing', 'waiting_approval',
      'تم إنشاء طلب موافقة بقيمة ' || p_requested_amount::text || ' ريال', auth.uid()
    );
  end if;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_order.workshop_id, auth.uid(), 'approval.requested', 'work_order_approval', v_approval.id,
    jsonb_build_object('work_order_id', v_order.id, 'requested_amount', p_requested_amount, 'channel', p_channel)
  );

  return v_approval;
end;
$$;

create or replace function public.decide_approval(
  p_approval_id uuid,
  p_status public.approval_status,
  p_channel public.approval_channel,
  p_response_note text default null
)
returns public.work_order_approvals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_approval public.work_order_approvals;
  v_order public.work_orders;
begin
  if not public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role) then raise exception 'غير مصرح بهذه العملية'; end if;

  if p_status not in ('approved', 'rejected', 'cancelled') then
    raise exception 'قرار الموافقة غير صحيح';
  end if;

  select * into v_approval
  from public.work_order_approvals
  where id = p_approval_id
    and workshop_id = public.current_workshop_id()
  for update;

  if v_approval.id is null then
    raise exception 'طلب الموافقة غير موجود';
  end if;

  if v_approval.status <> 'pending' then
    raise exception 'تم اتخاذ قرار لهذا الطلب مسبقًا';
  end if;

  update public.work_order_approvals
  set status = p_status,
      channel = p_channel,
      response_note = nullif(trim(coalesce(p_response_note, '')), ''),
      decided_by = auth.uid(),
      responded_at = timezone('utc', now())
  where id = v_approval.id
  returning * into v_approval;

  select * into v_order from public.work_orders where id = v_approval.work_order_id for update;

  if p_status = 'approved' and v_order.status = 'waiting_approval' then
    update public.work_orders set status = 'approved' where id = v_order.id;
    insert into public.work_order_status_logs (
      workshop_id, work_order_id, from_status, to_status, note, changed_by
    ) values (
      v_order.workshop_id, v_order.id, 'waiting_approval', 'approved',
      coalesce(nullif(trim(p_response_note), ''), 'تم تسجيل موافقة العميل'), auth.uid()
    );
  end if;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_approval.workshop_id, auth.uid(), 'approval.' || p_status::text, 'work_order_approval', v_approval.id,
    jsonb_build_object('work_order_id', v_approval.work_order_id, 'channel', p_channel)
  );

  return v_approval;
end;
$$;

create or replace function public.save_quality_check(
  p_work_order_id uuid,
  p_status public.quality_check_status,
  p_checklist jsonb,
  p_notes text default null
)
returns public.quality_checks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders;
  v_check public.quality_checks;
  v_has_pending boolean;
  v_has_fail boolean;
begin
  if not public.has_staff_role('admin'::public.staff_role, 'technician'::public.staff_role) then raise exception 'غير مصرح بهذه العملية'; end if;

  if jsonb_typeof(p_checklist) <> 'array' or jsonb_array_length(p_checklist) = 0 or jsonb_array_length(p_checklist) > 25 then
    raise exception 'قائمة فحص الجودة غير صحيحة';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_checklist) item
    where coalesce(item->>'key', '') = ''
       or coalesce(item->>'label', '') = ''
       or coalesce(item->>'result', '') not in ('pending', 'pass', 'fail', 'not_applicable')
  ) then
    raise exception 'أحد بنود الجودة غير صحيح';
  end if;

  select exists (
    select 1 from jsonb_array_elements(p_checklist) item
    where item->>'result' = 'pending'
  ) into v_has_pending;

  select exists (
    select 1 from jsonb_array_elements(p_checklist) item
    where item->>'result' = 'fail'
  ) into v_has_fail;

  if p_status = 'passed' and (v_has_pending or v_has_fail) then
    raise exception 'لا يمكن اعتماد الجودة قبل إكمال جميع البنود ومعالجة البنود غير المجتازة';
  end if;

  if p_status = 'failed' and not v_has_fail then
    raise exception 'حدد بندًا واحدًا على الأقل يحتاج إعادة عمل';
  end if;

  select * into v_order
  from public.work_orders
  where id = p_work_order_id
    and workshop_id = public.current_workshop_id()
  for update;

  if v_order.id is null then
    raise exception 'أمر العمل غير موجود';
  end if;

  if v_order.status not in ('in_progress', 'quality_check', 'ready') then
    raise exception 'فحص الجودة متاح أثناء العمل أو مرحلة الجودة أو الجاهزية';
  end if;

  if v_order.status = 'ready' and p_status <> 'passed' then
    raise exception 'أمر العمل جاهز بالفعل؛ أعده إلى مرحلة مناسبة قبل تعديل نتيجة الجودة';
  end if;

  insert into public.quality_checks (
    workshop_id, work_order_id, status, checklist, notes, checked_by, checked_at
  ) values (
    v_order.workshop_id, v_order.id, p_status, p_checklist,
    nullif(trim(coalesce(p_notes, '')), ''), auth.uid(),
    case when p_status = 'draft' then null else timezone('utc', now()) end
  )
  on conflict (work_order_id) do update set
    status = excluded.status,
    checklist = excluded.checklist,
    notes = excluded.notes,
    checked_by = excluded.checked_by,
    checked_at = excluded.checked_at
  returning * into v_check;

  if p_status = 'passed' and v_order.status = 'quality_check' then
    update public.work_orders set status = 'ready', completed_at = coalesce(completed_at, timezone('utc', now())) where id = v_order.id;
    insert into public.work_order_status_logs (
      workshop_id, work_order_id, from_status, to_status, note, changed_by
    ) values (
      v_order.workshop_id, v_order.id, 'quality_check', 'ready',
      'اجتاز فحص الجودة وأصبح جاهزًا للتسليم', auth.uid()
    );
  elsif p_status = 'failed' and v_order.status = 'quality_check' then
    update public.work_orders set status = 'in_progress' where id = v_order.id;
    insert into public.work_order_status_logs (
      workshop_id, work_order_id, from_status, to_status, note, changed_by
    ) values (
      v_order.workshop_id, v_order.id, 'quality_check', 'in_progress',
      coalesce(nullif(trim(p_notes), ''), 'لم يجتز فحص الجودة ويحتاج إعادة عمل'), auth.uid()
    );
  end if;

  insert into public.audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_order.workshop_id, auth.uid(), 'quality.' || p_status::text, 'quality_check', v_check.id,
    jsonb_build_object('work_order_id', v_order.id)
  );

  return v_check;
end;
$$;


create or replace function public.create_walk_in_work_order(
  p_customer_name text,
  p_phone text,
  p_email text,
  p_vehicle_make text,
  p_vehicle_model text,
  p_vehicle_year integer,
  p_vin text,
  p_plate_number text,
  p_service_code text,
  p_complaint text,
  p_priority public.priority_level default 'normal',
  p_odometer_in integer default null,
  p_fuel_level_percent integer default null,
  p_promised_at timestamptz default null
)
returns table (customer_id uuid, vehicle_id uuid, booking_id uuid, booking_number text, work_order_id uuid, work_order_number text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_workshop_id uuid;
  v_customer_id uuid;
  v_vehicle_id uuid;
  v_booking_id uuid;
  v_booking_number text;
  v_work_order_id uuid;
  v_work_order_number text;
  v_service public.service_catalog;
begin
  if not public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role) then raise exception 'غير مصرح باستقبال سيارة'; end if;
  v_workshop_id := public.current_workshop_id();
  if v_workshop_id is null then raise exception 'ورشة المستخدم غير مرتبطة'; end if;
  if char_length(trim(coalesce(p_customer_name,''))) < 2 then raise exception 'اسم العميل غير صحيح'; end if;
  if p_phone !~ '^\+9665[0-9]{8}$' then raise exception 'رقم الجوال غير صحيح'; end if;
  if p_email is not null and trim(p_email) <> '' and p_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then raise exception 'البريد الإلكتروني غير صحيح'; end if;
  if char_length(trim(coalesce(p_vehicle_make,''))) < 2 or char_length(trim(coalesce(p_vehicle_model,''))) < 1 then raise exception 'بيانات السيارة غير مكتملة'; end if;
  if p_vehicle_year < 1980 or p_vehicle_year > extract(year from now())::integer + 1 then raise exception 'سنة السيارة غير صحيحة'; end if;
  if p_vin is not null and trim(p_vin) <> '' and char_length(trim(p_vin)) not between 11 and 17 then raise exception 'رقم الهيكل غير صحيح'; end if;
  if char_length(trim(coalesce(p_complaint,''))) < 5 then raise exception 'اكتب شكوى العميل بوضوح'; end if;
  if p_odometer_in is not null and p_odometer_in < 0 then raise exception 'قراءة العداد غير صحيحة'; end if;
  if p_fuel_level_percent is not null and (p_fuel_level_percent < 0 or p_fuel_level_percent > 100) then raise exception 'نسبة الوقود غير صحيحة'; end if;

  select * into v_service from public.service_catalog
  where workshop_id = v_workshop_id and code = trim(p_service_code) and is_active = true;
  if v_service.id is null then raise exception 'الخدمة غير موجودة أو متوقفة'; end if;

  insert into public.customers (workshop_id, full_name, phone, email, is_active, created_by)
  values (v_workshop_id, trim(p_customer_name), p_phone, nullif(lower(trim(coalesce(p_email,''))),''), true, auth.uid())
  on conflict (workshop_id, phone) do update set
    full_name = excluded.full_name,
    email = coalesce(excluded.email, public.customers.email),
    is_active = true,
    updated_at = timezone('utc', now())
  returning id into v_customer_id;

  if nullif(upper(trim(coalesce(p_vin,''))),'') is not null then
    select id into v_vehicle_id from public.vehicles where workshop_id = v_workshop_id and upper(vin) = upper(trim(p_vin)) limit 1;
  end if;
  if v_vehicle_id is null and nullif(trim(coalesce(p_plate_number,'')),'') is not null then
    select id into v_vehicle_id from public.vehicles
    where workshop_id = v_workshop_id and customer_id = v_customer_id and lower(coalesce(plate_number,'')) = lower(trim(p_plate_number))
    order by updated_at desc limit 1;
  end if;
  if v_vehicle_id is null then
    select id into v_vehicle_id from public.vehicles
    where workshop_id = v_workshop_id and customer_id = v_customer_id
      and lower(make) = lower(trim(p_vehicle_make)) and lower(model) = lower(trim(p_vehicle_model))
      and model_year = p_vehicle_year and coalesce(plate_number,'') = coalesce(nullif(trim(p_plate_number),''),'')
    order by updated_at desc limit 1;
  end if;
  if v_vehicle_id is null then
    insert into public.vehicles (workshop_id, customer_id, make, model, model_year, vin, plate_number, mileage, is_active, created_by)
    values (v_workshop_id, v_customer_id, trim(p_vehicle_make), trim(p_vehicle_model), p_vehicle_year,
      nullif(upper(trim(coalesce(p_vin,''))),''), nullif(trim(coalesce(p_plate_number,'')),''), p_odometer_in, true, auth.uid())
    returning id into v_vehicle_id;
  else
    update public.vehicles set customer_id = v_customer_id, make = trim(p_vehicle_make), model = trim(p_vehicle_model), model_year = p_vehicle_year,
      vin = coalesce(nullif(upper(trim(coalesce(p_vin,''))),''),vin), plate_number = coalesce(nullif(trim(coalesce(p_plate_number,'')),''),plate_number),
      mileage = coalesce(p_odometer_in,mileage), is_active = true where id = v_vehicle_id;
  end if;

  v_booking_number := 'DP-B-' || to_char(timezone('Asia/Riyadh', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.bookings (workshop_id, booking_number, customer_id, vehicle_id, service_code, service_name_snapshot, service_price_snapshot,
    service_minutes_snapshot, complaint, preferred_at, status, priority, source, created_by)
  values (v_workshop_id, v_booking_number, v_customer_id, v_vehicle_id, trim(p_service_code), v_service.name_ar, v_service.base_price,
    v_service.estimated_minutes, trim(p_complaint), timezone('utc',now()), 'arrived', p_priority, 'walk_in', auth.uid())
  returning id into v_booking_id;
  insert into public.booking_status_logs (workshop_id,booking_id,from_status,to_status,note,changed_by)
  values (v_workshop_id,v_booking_id,null,'arrived','Walk-in intake created',auth.uid());

  v_work_order_number := 'DP-WO-' || to_char(timezone('Asia/Riyadh', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.work_orders (workshop_id,work_order_number,booking_id,customer_id,vehicle_id,complaint,status,priority,odometer_in,fuel_level_percent,promised_at,created_by)
  values (v_workshop_id,v_work_order_number,v_booking_id,v_customer_id,v_vehicle_id,trim(p_complaint),'open',p_priority,p_odometer_in,p_fuel_level_percent,p_promised_at,auth.uid())
  returning id into v_work_order_id;
  insert into public.work_order_status_logs (workshop_id,work_order_id,from_status,to_status,note,changed_by)
  values (v_workshop_id,v_work_order_id,null,'open','Walk-in work order created',auth.uid());
  insert into public.audit_logs (workshop_id,actor_user_id,action,entity_type,entity_id,metadata)
  values (v_workshop_id,auth.uid(),'intake.walk_in_created','work_order',v_work_order_id,jsonb_build_object('booking_id',v_booking_id,'customer_id',v_customer_id,'vehicle_id',v_vehicle_id,'service_code',p_service_code));
  return query select v_customer_id,v_vehicle_id,v_booking_id,v_booking_number,v_work_order_id,v_work_order_number;
end;
$$;

create or replace function public.update_work_order_details(
  p_work_order_id uuid,
  p_priority public.priority_level,
  p_assigned_to uuid,
  p_odometer_in integer,
  p_fuel_level_percent integer,
  p_promised_at timestamptz,
  p_labor_total numeric,
  p_parts_total numeric,
  p_discount_total numeric,
  p_tax_total numeric,
  p_approval_note text,
  p_internal_notes text
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare v_order public.work_orders;
begin
  if not public.has_staff_role('admin'::public.staff_role, 'receptionist'::public.staff_role) then raise exception 'غير مصرح بتعديل تفاصيل أمر العمل'; end if;
  if p_odometer_in is not null and p_odometer_in < 0 then raise exception 'قراءة العداد غير صحيحة'; end if;
  if p_fuel_level_percent is not null and (p_fuel_level_percent < 0 or p_fuel_level_percent > 100) then raise exception 'نسبة الوقود غير صحيحة'; end if;
  if coalesce(p_labor_total,0) < 0 or coalesce(p_parts_total,0) < 0 or coalesce(p_discount_total,0) < 0 or coalesce(p_tax_total,0) < 0 then raise exception 'القيم المالية لا يمكن أن تكون سالبة'; end if;
  if p_assigned_to is not null and not exists (select 1 from public.users u where u.id=p_assigned_to and u.workshop_id=public.current_workshop_id() and u.is_active) then raise exception 'الموظف المحدد غير موجود أو غير نشط'; end if;
  update public.work_orders set priority=p_priority,assigned_to=p_assigned_to,odometer_in=p_odometer_in,fuel_level_percent=p_fuel_level_percent,
    promised_at=p_promised_at,labor_total=coalesce(p_labor_total,0),parts_total=coalesce(p_parts_total,0),discount_total=coalesce(p_discount_total,0),
    tax_total=coalesce(p_tax_total,0),approval_note=nullif(trim(coalesce(p_approval_note,'')),''),internal_notes=nullif(trim(coalesce(p_internal_notes,'')),'')
  where id=p_work_order_id and workshop_id=public.current_workshop_id() returning * into v_order;
  if v_order.id is null then raise exception 'أمر العمل غير موجود'; end if;
  insert into public.audit_logs (workshop_id,actor_user_id,action,entity_type,entity_id,metadata)
  values (v_order.workshop_id,auth.uid(),'work_order.details_updated','work_order',v_order.id,jsonb_build_object('assigned_to',p_assigned_to,'grand_total',v_order.grand_total,'promised_at',p_promised_at));
  return v_order;
end;
$$;

revoke all on function public.create_walk_in_work_order(text,text,text,text,text,integer,text,text,text,text,public.priority_level,integer,integer,timestamptz) from public, anon;
revoke all on function public.update_work_order_details(uuid,public.priority_level,uuid,integer,integer,timestamptz,numeric,numeric,numeric,numeric,text,text) from public, anon;
grant execute on function public.create_walk_in_work_order(text,text,text,text,text,integer,text,text,text,text,public.priority_level,integer,integer,timestamptz) to authenticated;
grant execute on function public.update_work_order_details(uuid,public.priority_level,uuid,integer,integer,timestamptz,numeric,numeric,numeric,numeric,text,text) to authenticated;

revoke all on function public.set_booking_status(uuid,public.booking_status,text) from public, anon;
revoke all on function public.convert_booking_to_work_order(uuid) from public, anon;
revoke all on function public.create_diagnostic_report(uuid,text,text,text,text,public.diagnostic_status,jsonb) from public, anon;
revoke all on function public.update_diagnostic_report(uuid,text,text,text,text,text,text,public.diagnostic_status,boolean,jsonb) from public, anon;
revoke all on function public.create_approval_request(uuid,numeric,text,public.approval_channel,boolean) from public, anon;
revoke all on function public.decide_approval(uuid,public.approval_status,public.approval_channel,text) from public, anon;
revoke all on function public.save_quality_check(uuid,public.quality_check_status,jsonb,text) from public, anon;
grant execute on function public.set_booking_status(uuid,public.booking_status,text) to authenticated;
grant execute on function public.convert_booking_to_work_order(uuid) to authenticated;
grant execute on function public.create_diagnostic_report(uuid,text,text,text,text,public.diagnostic_status,jsonb) to authenticated;
grant execute on function public.update_diagnostic_report(uuid,text,text,text,text,text,text,public.diagnostic_status,boolean,jsonb) to authenticated;
grant execute on function public.create_approval_request(uuid,numeric,text,public.approval_channel,boolean) to authenticated;
grant execute on function public.decide_approval(uuid,public.approval_status,public.approval_channel,text) to authenticated;
grant execute on function public.save_quality_check(uuid,public.quality_check_status,jsonb,text) to authenticated;
