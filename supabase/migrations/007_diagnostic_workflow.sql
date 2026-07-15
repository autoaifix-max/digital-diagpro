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
