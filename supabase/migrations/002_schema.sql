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
