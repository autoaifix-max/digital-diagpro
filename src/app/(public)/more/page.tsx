import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileText, LockKeyhole, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";

export const metadata: Metadata = { title: "المزيد" };

const links = [
  { href: "/book", icon: CalendarDays, title: "حجز موعد", text: "سجّل السيارة والمشكلة والوقت المناسب." },
  { href: "/customer/login", icon: UserRound, title: "بوابة العميل", text: "تابع أوامر العمل والتقارير والمستندات." },
  { href: "/services", icon: FileText, title: "الخدمات والأسعار المبدئية", text: "اطلع على نطاق الخدمات وطريقة التسعير." },
  { href: "/admin/login", icon: LockKeyhole, title: "دخول الموظفين", text: "خاص بموظفي مركز التشخيص الاحترافي." },
];

export default function MorePage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 md:py-20">
      <div>
        <span className="text-sm font-bold text-[#FFD100]">معلومات وروابط</span>
        <h1 className="mt-3 text-4xl font-black">كل ما تحتاجه في مكان واحد</h1>
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        {links.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="panel focus-ring flex gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-[#FFD100]/30">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#FFD100]/10 text-[#FFD100]"><Icon size={21} /></span>
            <div>
              <h2 className="font-black">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-[#969da8]">{text}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="panel mt-8 grid gap-5 rounded-2xl p-6 sm:grid-cols-3">
        <div className="flex items-center gap-3"><MapPin className="text-[#FFD100]" /><div><strong className="block text-sm">الموقع</strong><span className="text-xs text-[#9299a5]">صناعية حفر الباطن</span></div></div>
        <div className="flex items-center gap-3"><Phone className="text-[#FFD100]" /><div><strong className="block text-sm">التواصل</strong><span className="text-xs text-[#9299a5]">يحدد في إعدادات النشر</span></div></div>
        <div className="flex items-center gap-3"><ShieldCheck className="text-[#FFD100]" /><div><strong className="block text-sm">الخصوصية</strong><span className="text-xs text-[#9299a5]">بياناتك تستخدم لإدارة الخدمة فقط</span></div></div>
      </div>
    </section>
  );
}
