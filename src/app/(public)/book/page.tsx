import type { Metadata } from "next";
import { BookingForm, type BookingServiceOption } from "@/components/public/booking-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "حجز موعد" };
export const dynamic = "force-dynamic";

const fallbackServices: BookingServiceOption[] = [
  { value: "computer-diagnostic", label: "فحص كمبيوتر وتقرير أولي" },
  { value: "confirmatory-diagnosis", label: "تشخيص تأكيدي لعزل السبب" },
  { value: "electrical-diagnosis", label: "تشخيص كهرباء وإلكترونيات" },
  { value: "programming", label: "برمجة أو تهيئة" },
  { value: "ac-diagnosis", label: "تشخيص تكييف" },
  { value: "maintenance", label: "صيانة أو إصلاح بعد تشخيص" },
  { value: "other", label: "أخرى" },
];

export default async function BookPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_catalog")
    .select("code, name_ar")
    .eq("is_active", true)
    .order("sort_order")
    .order("name_ar");
  const services = data?.length ? data.map((service) => ({ value: service.code, label: service.name_ar })) : fallbackServices;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-16">
      <div className="mb-8">
        <span className="text-sm font-bold text-[#FFD100]">طلب حجز جديد</span>
        <h1 className="mt-2 text-4xl font-black leading-tight">أرسل تفاصيل السيارة والمشكلة</h1>
        <p className="mt-4 text-sm leading-7 text-[#9da4af]">الحجز المرسل طلب مبدئي. يتواصل المركز لتأكيد الموعد ونطاق الخدمة.</p>
      </div>
      <BookingForm services={services} />
    </section>
  );
}
