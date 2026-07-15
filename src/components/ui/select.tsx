import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "focus-ring min-h-12 w-full rounded-xl border border-[#343943] bg-[#111318] px-4 text-white disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
