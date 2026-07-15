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
