import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring min-h-12 w-full rounded-xl border border-[#343943] bg-[#111318] px-4 text-white placeholder:text-[#6f7682] disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
