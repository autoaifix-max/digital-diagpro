"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Home, LogOut, UserRound } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { createClient } from "@/lib/supabase/browser";

export function CustomerShell({ account, children }: { account: { display_name: string; phone_last4: string }; children: React.ReactNode }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/customer/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/6 bg-[#0c0d0f]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-17 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo href="/customer" />
          <div className="flex items-center gap-2">
            <div className="hidden text-left sm:block"><strong className="block text-xs">{account.display_name}</strong><span className="text-[11px] text-[#7f8793]">الجوال المنتهي بـ {account.phone_last4}</span></div>
            <button onClick={signOut} className="focus-ring grid size-10 place-items-center rounded-xl border border-[#343943] text-[#aeb4bd] hover:text-red-200" aria-label="تسجيل الخروج"><LogOut size={18} /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6 md:py-12">{children}</main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[#2b2f36] bg-[#101216]/95 px-4 pt-2 backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-sm grid-cols-3">
          <Link href="/customer" className="focus-ring grid min-h-14 place-items-center content-center gap-1 rounded-xl text-[11px] font-bold text-[#FFD100]"><Home size={20} />الرئيسية</Link>
          <a href="#documents" className="focus-ring grid min-h-14 place-items-center content-center gap-1 rounded-xl text-[11px] font-bold text-[#9aa1ac]"><FileText size={20} />المستندات</a>
          <a href="#account" className="focus-ring grid min-h-14 place-items-center content-center gap-1 rounded-xl text-[11px] font-bold text-[#9aa1ac]"><UserRound size={20} />الحساب</a>
        </div>
      </nav>
    </div>
  );
}
