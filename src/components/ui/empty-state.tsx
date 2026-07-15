import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="panel grid min-h-56 place-items-center rounded-2xl p-8 text-center">
      <div className="grid max-w-md gap-3 justify-items-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-white/5 text-[#FFD100]"><Inbox /></div>
        <h3 className="text-lg font-black">{title}</h3>
        <p className="text-sm leading-7 text-[#9ca3af]">{description}</p>
        {action}
      </div>
    </div>
  );
}
