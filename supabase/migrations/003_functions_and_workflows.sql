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
