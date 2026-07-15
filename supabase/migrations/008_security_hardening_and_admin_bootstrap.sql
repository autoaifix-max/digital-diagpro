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
