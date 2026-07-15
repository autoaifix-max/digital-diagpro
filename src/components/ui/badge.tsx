import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "success" | "warning" | "danger"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
        tone === "neutral" && "border-[#353a43] bg-[#24272d] text-[#d7dbe2]",
        tone === "brand" && "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",
        tone === "success" && "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
        tone === "warning" && "border-orange-400/30 bg-orange-400/10 text-orange-200",
        tone === "danger" && "border-red-400/30 bg-red-400/10 text-red-200",
        className,
      )}
    >
      {children}
    </span>
  );
}
