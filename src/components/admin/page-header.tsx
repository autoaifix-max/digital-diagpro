import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <span className="text-xs font-bold text-[#FFD100]">{eyebrow}</span> : null}
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-[#8f96a3]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
