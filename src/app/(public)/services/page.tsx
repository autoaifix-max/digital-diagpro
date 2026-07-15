import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowLeft, Braces, CircuitBoard, ScanLine, Settings2, Snowflake, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "الخدمات" };
export const dynamic = "force-dynamic";

type Service = { code: string; name_ar: string; description_ar: string | null; base_price: number | null; estimated_minutes: number | null };

const fallbackServices: Service[] = [
  { code: "computer-diagnostic", name_ar: "فحص كمبيوتر وتقرير", description_ar: "مسح شامل للأنظمة، قراءة الأكواد والبيانات الحية، وتوثيق النتائج الأولية.", base_price: 79, estimated_minutes: 30 },
  { code: "confirmatory-diagnosis", name_ar: "تشخيص تأكيدي لعزل السبب", description_ar: "اختبارات عملية لتحديد السبب الجذري قبل اعتماد القطعة أو الإصلاح.", base_price: 149, estimated_minutes: 60 },
];

function iconFor(code: string) {
  if (code.includes("computer")) return ScanLine;
  if (code.includes("confirm")) return Activity;
  if (code.includes("electrical")) return CircuitBoard;
  if (code.includes("program")) return Braces;
  if (code.includes("ac")) return Snowflake;
  if (code.includes("maintenance")) return Settings2;
  return Wrench;
}

function durationLabel(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} دقيقة تقريبًا`;
  const hours = Math.floor(minutes / 60); const rest = minutes % 60;
  return rest ? `${hours} ساعة و${rest} دقيقة تقريبًا` : `${hours} ساعة تقريبًا`;
}

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_catalog")
    .select("code, name_ar, description_ar, base_price, estimated_minutes")
    .eq("is_active", true)
    .order("sort_order")
    .order("name_ar");
  const services = (data?.length ? data : fallbackServices) as Service[];

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
      <div className="max-w-3xl">
        <span className="text-sm font-bold text-[#FFD100]">خدمات المركز</span>
        <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">الخدمة تبدأ بفهم المشكلة، لا بتخمين القطعة</h1>
        <p className="mt-5 text-base leading-8 text-[#9ea5b0]">الأسعار المعروضة أساسية وقد يتغير النطاق حسب نوع السيارة والاختبارات المطلوبة. لا يبدأ عمل إضافي قبل اعتماد العميل.</p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {services.map((service) => {
          const Icon = iconFor(service.code);
          const duration = durationLabel(service.estimated_minutes);
          return <article key={service.code} className="panel flex gap-4 rounded-2xl p-5 sm:p-6"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#FFD100]/10 text-[#FFD100]"><Icon /></span><div><h2 className="text-lg font-black">{service.name_ar}</h2><p className="mt-2 text-sm leading-7 text-[#9ca3af]">{service.description_ar || "تُحدد تفاصيل الخدمة بعد مراجعة السيارة والأعراض."}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-[#FFD100]"><span>{service.base_price == null ? "السعر حسب الفحص" : `يبدأ من ${formatMoney(service.base_price)}`}</span>{duration ? <span className="text-[#aeb4bd]">{duration}</span> : null}</div></div></article>;
        })}
      </div>

      <div className="mt-10 rounded-3xl border border-[#FFD100]/20 bg-[#FFD100]/8 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div><h2 className="text-xl font-black">لديك مشكلة غير واضحة؟</h2><p className="mt-2 text-sm leading-7 text-[#c6cad1]">اختر خدمة الفحص الأولي واكتب الأعراض كما تظهر لك.</p></div>
        <Link href="/book" className="focus-ring mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FFD100] px-5 font-black text-[#111] sm:mt-0">ابدأ الحجز <ArrowLeft size={18} /></Link>
      </div>
    </section>
  );
}
