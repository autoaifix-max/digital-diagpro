# Digital DiagPro OS — Pilot V1

الأساس التقني لنظام تشغيل وإدارة رقمي مخصص مبدئيًا لـ **مركز التشخيص الاحترافي لصيانة السيارات** في حفر الباطن، مع قابلية التوسع مستقبلًا إلى منصة سحابية للورش.

> الحالة الحالية: **Phase 0A / 0A.1 — Technical Foundation**
>
> لا توجد في هذه النسخة وظائف حجز أو إدارة أو قاعدة بيانات، ولم يتم ربط Supabase أو Vercel بعد.

## التقنية المعتمدة

- Next.js 16.2.10 — App Router
- React 19.2.7
- TypeScript
- Tailwind CSS v4
- ESLint
- npm
- Node.js 24.x

## المتطلبات

- Node.js 24.x
- npm

يحتوي المشروع على ملف `.nvmrc` لتحديد إصدار Node.js المستهدف.

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local
npm run dev
```

ثم افتح:

```text
http://localhost:3000
```

## أوامر التحقق

```bash
npm run typecheck
npm run lint
npm run build
```

## متغيرات البيئة

الملف `.env.example` يوثق أسماء المتغيرات المستقبلية فقط، بدون أي قيم سرية:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

لا تضف القيم الحقيقية إلى Git. استخدم `.env.local` محليًا أو إعدادات منصة النشر لاحقًا.

## نطاق المرحلة الحالية

تم تنفيذ:

- Next.js App Router.
- TypeScript.
- Tailwind CSS v4.
- ESLint.
- واجهة تحقق تقنية عربية RTL.
- تصميم Mobile-first.
- دعم Safe Area للجوال.
- الهوية الداكنة واللون الأساسي `#FFD100`.
- أوامر `dev`, `build`, `lint`, `typecheck`.

لم يتم تنفيذ:

- Supabase أو Vercel.
- Database schema أو SQL أو Migrations أو RLS.
- Authentication.
- Admin portal أو Customer portal.
- Customers أو Vehicles أو Bookings أو Work orders.
- Documents أو Uploads.
- `workshop_id` أو Multi-tenancy.
- أي بيانات حقيقية أو Business workflows.

## المرحلة التالية

المرحلة التالية بعد اعتماد هذا الأساس هي تصميم **Phase 0B — Pilot Scope, Domain Model, and Database Architecture** قبل كتابة أي SQL أو ربط قاعدة بيانات.
