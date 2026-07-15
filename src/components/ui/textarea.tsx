import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-28 w-full resize-y rounded-xl border border-[#343943] bg-[#111318] px-4 py-3 text-white placeholder:text-[#6f7682] disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
