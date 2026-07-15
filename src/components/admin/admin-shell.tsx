"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  CarFront,
  FileText,
  Gauge,
  ClipboardPlus,
  UserCog,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ScanLine,
  Settings2,
  ShieldCheck,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { StaffProfile, StaffRole } from "@/lib/domain/types";
import { roleLabels } from "@/lib/domain/labels";

const nav: Array<{ href: string; label: string; icon: typeof LayoutDashboard; roles?: StaffRole[] }> = [
  { href: "/admin", label: "لوحة اليوم", icon: LayoutDashboard },
  { href: "/admin/intake", label: "استقبال سيارة", icon: ClipboardPlus, roles: ["admin", "receptionist"] },
  { href: "/admin/customers", label: "العملاء", icon: UsersRound, roles: ["admin", "receptionist"] },
  { href: "/admin/vehicles", label: "السيارات", icon: CarFront, roles: ["admin", "receptionist"] },
  { href: "/admin/services", label: "الخدمات", icon: Settings2, roles: ["admin"] },
  { href: "/admin/bookings", label: "الحجوزات", icon: CalendarDays, roles: ["admin", "receptionist"] },
  { href: "/admin/work-orders", label: "أوامر العمل", icon: Wrench },
  { href: "/admin/diagnostics", label: "التشخيص", icon: ScanLine, roles: ["admin", "technician"] },
  { href: "/admin/approvals", label: "الموافقات", icon: BadgeCheck, roles: ["admin", "receptionist"] },
  { href: "/admin/quality", label: "الجودة", icon: ShieldCheck, roles: ["admin", "technician"] },
  { href: "/admin/documents", label: "المستندات", icon: FileText },
  { href: "/admin/staff", label: "الموظفون", icon: UserCog, roles: ["admin"] },
  { href: "/admin/account", label: "حسابي", icon: KeyRound },
];

export function AdminShell({ profile, children }: { profile: StaffProfile; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const visibleNav = nav.filter((item) => !item.roles || item.roles.includes(profile.role));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/6 p-5"><Logo href="/admin" /></div>
      <nav className="grid gap-1 overflow-y-auto p-3">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("focus-ring flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold", active ? "bg-[#FFD100] text-[#111]" : "text-[#aeb4bd] hover:bg-white/5 hover:text-white")}>
              <Icon size={19} /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/6 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.035] p-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[#FFD100]/10 text-[#FFD100]"><Gauge size={18} /></span>
          <div className="min-w-0"><strong className="block truncate text-sm">{profile.full_name}</strong><span className="text-xs text-[#858d99]">{roleLabels[profile.role]}</span></div>
        </div>
        <button onClick={signOut} className="focus-ring flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-[#aeb4bd] hover:bg-red-400/10 hover:text-red-200"><LogOut size={17} /> تسجيل الخروج</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0c0e] md:grid md:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-l border-white/6 bg-[#101216] md:block">{sidebar}</aside>
      {open ? <div className="fixed inset-0 z-50 md:hidden"><button aria-label="إغلاق القائمة" className="absolute inset-0 bg-black/65" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 right-0 w-[82%] max-w-xs border-l border-white/8 bg-[#101216]"><button aria-label="إغلاق" onClick={() => setOpen(false)} className="absolute left-3 top-3 z-10 grid size-9 place-items-center rounded-lg bg-white/5"><X size={18} /></button>{sidebar}</aside></div> : null}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/6 bg-[#0b0c0e]/90 px-4 backdrop-blur-xl md:px-7">
          <button className="focus-ring grid size-10 place-items-center rounded-xl border border-[#30343b] md:hidden" onClick={() => setOpen(true)} aria-label="فتح القائمة"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-sm text-[#8f96a3] md:flex"><BookOpenCheck size={18} className="text-[#FFD100]" /> Pilot تشغيلي — مركز التشخيص الاحترافي</div>
          <span className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1 text-xs font-bold text-emerald-200"><ListChecks size={14} /> متصل</span>
        </header>
        <main className="p-4 pb-14 md:p-7">{children}</main>
      </div>
    </div>
  );
}
