# مخطط قاعدة البيانات

## الجداول

| الجدول | الوظيفة |
|---|---|
| `workshops` | الورشة وبنية التوسع المستقبلية |
| `users` | الموظفون المرتبطون بـ`auth.users` وأدوارهم |
| `customers` | العملاء وبيانات الاتصال والحالة |
| `customer_accounts` | ربط حساب Auth بملف العميل |
| `vehicles` | سيارات العملاء وحالة الأرشفة |
| `service_catalog` | الخدمات والأسعار والمدد والترتيب |
| `bookings` | الحجوزات والحالات |
| `booking_status_logs` | سجل حالات الحجز |
| `work_orders` | أوامر العمل والتكاليف والحالة |
| `work_order_status_logs` | سجل حالات أمر العمل |
| `diagnostic_reports` | تقارير التشخيص |
| `diagnostic_items` | DTC والقراءات والاختبارات والعناصر |
| `work_order_approvals` | طلبات الموافقة والمبالغ والقرارات والقنوات |
| `quality_checks` | قوائم فحص الجودة ونتائجها |
| `customer_documents` | بيانات الملفات الخاصة وروابطها |
| `audit_logs` | سجل الأحداث المهمة |

## العلاقات الرئيسية

```text
workshop
 ├── users
 ├── service_catalog
 └── customers
      ├── customer_accounts
      ├── vehicles
      ├── bookings
      │    └── booking_status_logs
      ├── work_orders
      │    ├── work_order_status_logs
      │    ├── diagnostic_reports
      │    │    └── diagnostic_items
      │    ├── work_order_approvals
      │    └── quality_checks
      └── customer_documents
```

## الدوال التشغيلية الرئيسية

| الدالة | الوظيفة |
|---|---|
| `create_public_booking(...)` | إنشاء/تحديث العميل والسيارة وإنشاء الحجز للزائر |
| `set_booking_status(...)` | انتقال حالة حجز وتسجيل السجل |
| `convert_booking_to_work_order(...)` | إنشاء أمر عمل مرة واحدة |
| `set_work_order_status(...)` | انتقال حالة أمر العمل وتسجيل التواريخ |
| `create_diagnostic_report(...)` | إنشاء تقرير وعناصر DTC |
| `update_diagnostic_report(...)` | تحديث التقرير وعناصره |
| `create_approval_request(...)` | إنشاء طلب موافقة وتحويل الأمر لانتظار الموافقة |
| `decide_approval(...)` | تسجيل قرار بواسطة الموظف |
| `customer_decide_approval(...)` | تسجيل قرار العميل من البوابة |
| `save_quality_check(...)` | حفظ الجودة وإعادة العمل أو الجاهزية |
| `current_workshop_id()` | ورشة الموظف الحالي |
| `current_customer_id()` | ملف العميل الحالي |

## أرقام السجلات

- الحجز: `DP-B-YYYYMMDD-XXXXXX`
- أمر العمل: `DP-WO-YYYYMMDD-XXXXXX`
- تقرير التشخيص: `DP-DR-YYYYMMDD-XXXXXX`

## العزل

تحتوي السجلات التشغيلية على `workshop_id`. في الـPilot توجد ورشة واحدة، لكن سياسات RLS تقارن ورشة المستخدم بالسجل ولا تعتمد على افتراض أنها الوحيدة.


## إضافات v1.2.0

- `bookings.service_name_snapshot` و`service_price_snapshot` و`service_minutes_snapshot` لحماية السجل التاريخي.
- `bookings.consent_at` لتوثيق موافقة الحجز العام.
- RPC `create_walk_in_work_order` للاستقبال الحضوري.
- RPC `update_work_order_details` لتحديث الفني والعداد والوقود والموعد والتكاليف.
- دالة `has_staff_role` لتطبيق فصل الأدوار داخل RLS وSECURITY DEFINER.
