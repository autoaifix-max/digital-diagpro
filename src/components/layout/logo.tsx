import Link from "next/link";
import { Gauge } from "lucide-react";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="focus-ring inline-flex items-center gap-3 rounded-lg">
      <span className="grid size-10 place-items-center rounded-xl bg-[#FFD100] text-[#111]"><Gauge size={23} strokeWidth={2.4} /></span>
      {!compact ? (
        <span className="grid leading-tight">
          <strong className="text-sm font-black text-white">التشخيص الاحترافي</strong>
          <span className="text-[11px] text-[#9ca3af]">بداية الحل</span>
        </span>
      ) : null}
    </Link>
  );
}
