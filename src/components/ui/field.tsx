import type { ReactNode } from "react";

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#e8eaee]">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-normal text-red-300">{error}</span> : null}
      {!error && hint ? <span className="text-xs font-normal text-[#8f96a3]">{hint}</span> : null}
    </label>
  );
}
