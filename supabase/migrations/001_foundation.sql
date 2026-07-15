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
