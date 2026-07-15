import Link from "next/link";
import { ArrowLeft, BadgeCheck, CarFront, ClipboardCheck, Gauge, ScanLine, ShieldCheck, Wrench } from "lucide-react";

const services = [
  { icon: ScanLine, title: "فحص كمبيوتر احترافي", text: "قراءة الأنظمة والأكواد والبيانات الحية مع تقرير واضح." },
  { icon: Gauge, title: "تشخيص تأكيدي", text: "اختبارات عزل السبب قبل تبديل القطع أو اعتماد الإصلاح." },
  { icon: Wrench, title: "كهرباء وبرمجة", text: "تشخيص دوائر، برمجة وحدات، ومعالجة الأعطال المعقدة." },
];

const steps = [
  "احجز وسجّل مشكلة السيارة",
  "يستلم المركز السيارة ويبدأ الفحص",
  "يصلك التشخيص والتوصيات والمستندات",
  "تتابع التنفيذ حتى الجاهزية والتسليم",
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.05fr_.95fr] md:items-center md:py-24">
          <div className="grid gap-7">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/8 px-3 py-1.5 text-xs font-bold text-yellow-200">
              <ShieldCheck size={16} />
              التشخيص أولًا، ثم قرار الإصلاح
            </div>
            <div className="grid gap-4">
              <h1 className="max-w-3xl text-4xl font-black leading-[1.25] sm:text-5xl md:text-6xl">
                اعرف سبب المشكلة قبل أن تبدأ <span className="text-[#FFD100]">تبديل القطع</span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#a4aab5] sm:text-lg">
                حجز منظم، أمر عمل واضح، تشخيص موثق، ومتابعة مباشرة لحالة السيارة ومستنداتها.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className="focus-ring inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#FFD100] px-6 font-black text-[#111]">
                احجز فحص سيارتك <ArrowLeft size={19} />
              </Link>
              <Link href="/services" className="focus-ring inline-flex min-h-13 items-center justify-center rounded-xl border border-[#343943] bg-[#191b20] px-6 font-bold text-white">
                عرض الخدمات
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                ["منظم", "مسار الخدمة"],
                ["موثق", "نتائج الفحص"],
                ["واضح", "القرار والتكلفة"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-white/6 bg-white/[0.025] p-4">
                  <strong className="block text-lg text-[#FFD100]">{title}</strong>
                  <span className="text-xs text-[#9097a3]">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel relative rounded-[2rem] p-5 sm:p-7">
            <div className="absolute -left-8 -top-8 size-36 rounded-full bg-[#FFD100]/10 blur-3xl" />
            <div className="relative grid gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#9097a3]">رحلة سيارة فعلية</span>
                  <h2 className="mt-1 text-xl font-black">من الحجز إلى التسليم</h2>
                </div>
                <span className="grid size-12 place-items-center rounded-2xl bg-[#FFD100] text-[#111]"><CarFront /></span>
              </div>
              <div className="grid gap-3">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-[#101216] p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#FFD100]/10 text-sm font-black text-[#FFD100]">{index + 1}</span>
                    <span className="text-sm font-bold">{step}</span>
                    {index < 3 ? <span className="mr-auto text-xs text-[#6f7682]">التالي</span> : <BadgeCheck className="mr-auto text-emerald-400" size={20} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="text-sm font-bold text-[#FFD100]">الخدمات الأساسية</span>
            <h2 className="mt-2 text-3xl font-black">خدمة مبنية على نتيجة قابلة للفهم</h2>
          </div>
          <Link href="/services" className="hidden text-sm font-bold text-[#c6cad1] sm:inline-flex">كل الخدمات ←</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {services.map(({ icon: Icon, title, text }) => (
            <article key={title} className="panel rounded-2xl p-6">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#FFD100]/10 text-[#FFD100]"><Icon /></span>
              <h3 className="mt-5 text-xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#9ba2ad]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#111318]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-2 text-[#FFD100]"><ClipboardCheck /><span className="text-sm font-bold">تقارير ومتابعة</span></div>
            <h2 className="mt-3 text-3xl font-black">تابع حالة سيارتك ومستنداتك من بوابة العميل</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9ba2ad]">يعرض النظام أوامر العمل، حالة التنفيذ، تقارير التشخيص، عروض الأسعار والفواتير المسموح لك بمشاهدتها.</p>
          </div>
          <Link href="/customer/login" className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl border border-[#FFD100]/35 bg-[#FFD100]/8 px-6 font-bold text-[#FFD100]">
            دخول بوابة العميل
          </Link>
        </div>
      </section>
    </>
  );
}
