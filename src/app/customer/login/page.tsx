import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = { title: "بوابة العميل" };

export default function CustomerLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center"><Logo /></div>
        <section className="panel rounded-3xl p-6 sm:p-8">
          <div className="mb-7 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#FFD100]/10 text-[#FFD100]"><UserRound /></span>
            <h1 className="mt-4 text-2xl font-black">دخول بوابة العميل</h1>
            <p className="mt-2 text-sm leading-6 text-[#939aa6]">استخدم الحساب الذي أنشأه المركز لعرض حالة السيارة والمستندات.</p>
          </div>
          <Suspense fallback={<div className="min-h-48 animate-pulse rounded-2xl bg-white/[0.03]" />}><LoginForm portal="customer" /></Suspense>
        </section>
        <Link href="/book" className="mt-5 block text-center text-sm text-[#8f96a3]">ليس لديك حجز؟ أرسل طلب حجز</Link>
      </div>
    </main>
  );
}
