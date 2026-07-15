import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[#FFD100] text-[#111] hover:bg-[#ffe04d]",
        variant === "secondary" && "border border-[#343943] bg-[#202329] text-white hover:bg-[#292d34]",
        variant === "ghost" && "text-[#d7dae0] hover:bg-white/5",
        variant === "danger" && "bg-red-500/15 text-red-300 hover:bg-red-500/25",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-sm",
        size === "lg" && "min-h-13 px-5 text-base",
        className,
      )}
      {...props}
    />
  );
}
