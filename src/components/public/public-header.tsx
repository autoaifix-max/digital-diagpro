import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0c0d0f]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-17 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Link
          href="/book"
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#FFD100] px-4 text-sm font-black text-[#111]"
        >
          <CalendarDays size={18} />
          احجز الآن
        </Link>
      </div>
    </header>
  );
}
