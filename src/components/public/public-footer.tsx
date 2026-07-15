import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#090a0c] pb-28 pt-10 md:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-4">
          <Logo />
          <p className="max-w-xl text-sm leading-7 text-[#8f96a3]">
            نظام Pilot تشغيلي لإدارة رحلة العميل من الحجز حتى التسليم والتقرير النهائي.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-[#a7adb7]">
          <Link href="/services">الخدمات</Link>
          <Link href="/book">الحجز</Link>
          <Link href="/customer/login">بوابة العميل</Link>
          <Link href="/admin/login">دخول الموظفين</Link>
        </div>
      </div>
    </footer>
  );
}
