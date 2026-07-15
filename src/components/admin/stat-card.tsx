import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: LucideIcon }) {
  return (
    <article className="panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold text-[#8f96a3]">{label}</p><strong className="mt-2 block text-3xl font-black">{value}</strong></div>
        <span className="grid size-11 place-items-center rounded-xl bg-[#FFD100]/10 text-[#FFD100]"><Icon size={21} /></span>
      </div>
      <p className="mt-4 text-xs text-[#737b87]">{hint}</p>
    </article>
  );
}
