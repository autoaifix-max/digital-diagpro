"use client";

import { useRouter } from "next/navigation";
import { Link2Off, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

export function UnlinkedAccount() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/customer/login");
    router.refresh();
  }
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="panel max-w-lg rounded-3xl p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-orange-400/10 text-orange-200"><Link2Off /></span>
        <h1 className="mt-5 text-2xl font-black">الحساب غير مرتبط بملف عميل</h1>
        <p className="mt-3 text-sm leading-7 text-[#9ca3af]">تم تسجيل الدخول، لكن المركز لم يربط هذا الحساب بالعميل بعد. اطلب من الإدارة تنفيذ خطوة ربط حساب العميل.</p>
        <Button className="mt-6" variant="secondary" onClick={signOut}><LogOut size={18} /> تسجيل الخروج</Button>
      </section>
    </main>
  );
}
