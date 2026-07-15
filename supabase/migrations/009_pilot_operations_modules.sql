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
