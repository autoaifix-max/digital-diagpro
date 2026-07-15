"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Menu, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/services", label: "الخدمات", icon: Wrench },
  { href: "/book", label: "الحجز", icon: CalendarDays },
  { href: "/more", label: "المزيد", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-[#2b2f36] bg-[#101216]/95 px-2 pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring grid min-h-14 place-items-center content-center gap-1 rounded-xl text-[11px] font-bold",
                active ? "bg-[#FFD100]/10 text-[#FFD100]" : "text-[#8e95a1]",
              )}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
