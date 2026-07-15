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
