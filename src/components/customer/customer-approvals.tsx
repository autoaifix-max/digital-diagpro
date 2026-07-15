"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, CircleDollarSign, Loader2, MessageCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approvalChannelLabels, approvalStatusLabels } from "@/lib/domain/labels";
import type { ApprovalChannel, ApprovalStatus } from "@/lib/domain/types";
import { formatDateTime, formatMoney } from "@/lib/utils";

export type CustomerApprovalRow = {
  id: string;
  requested_amount: number;
  items_summary: string;
  status: ApprovalStatus;
  channel: ApprovalChannel;
  response_note: string | null;
  requested_at: string;
  responded_at: string | null;
  work_orders: {
    work_order_number: string;
    vehicles: { make: string; model: string; model_year: number };
  };
};

function tone(status: ApprovalStatus) {
  if (status === "approved") return "success" as const;
  if (status === "rejected" || status === "cancelled") return "danger" as const;
  return "warning" as const;
}

export function CustomerApprovals({ approvals }: { approvals: CustomerApprovalRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function decide(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/customer/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, responseNote: notes[id] ?? "" }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر تسجيل القرار");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تسجيل القرار");
    } finally {
      setBusyId(null);
    }
  }

  if (!approvals.length) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2"><BadgeCheck className="text-[#FFD100]" /><h2 className="text-xl font-black">الموافقات</h2></div>
      {error ? <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200">{error}</div> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {approvals.map((approval) => (
          <article key={approval.id} className={`panel rounded-2xl p-5 ${approval.status === "pending" ? "border-[#FFD100]/30" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2"><strong>{approval.work_orders.work_order_number}</strong><Badge tone={tone(approval.status)}>{approvalStatusLabels[approval.status]}</Badge></div>
                <p className="mt-2 text-sm text-[#aeb4bd]">{approval.work_orders.vehicles.make} {approval.work_orders.vehicles.model} {approval.work_orders.vehicles.model_year}</p>
              </div>
              <div className="text-left"><span className="flex items-center gap-1 text-xs text-[#7f8793]"><CircleDollarSign size={14} /> المبلغ</span><strong className="mt-1 block text-xl text-[#FFD100]">{formatMoney(approval.requested_amount)}</strong></div>
            </div>
            <div className="mt-5 rounded-xl bg-white/[0.035] p-4"><span className="text-xs font-bold text-[#8f96a3]">الأعمال المطلوب اعتمادها</span><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#e1e3e7]">{approval.items_summary}</p></div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#737b87]"><span className="flex items-center gap-1"><MessageCircle size={14} /> {approvalChannelLabels[approval.channel]}</span><span>{formatDateTime(approval.requested_at)}</span></div>
            {approval.response_note ? <p className="mt-4 rounded-xl border border-white/6 p-3 text-sm leading-7 text-[#aeb4bd]">{approval.response_note}</p> : null}
            {approval.status === "pending" ? <div className="mt-5"><Textarea value={notes[approval.id] ?? ""} onChange={(event) => setNotes({ ...notes, [approval.id]: event.target.value })} placeholder="ملاحظة مع القرار — اختياري" className="min-h-20" /><div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => void decide(approval.id, "approved")} disabled={busyId === approval.id}>{busyId === approval.id ? <Loader2 className="animate-spin" size={17} /> : <BadgeCheck size={17} />} أوافق على الأعمال</Button><Button variant="danger" onClick={() => void decide(approval.id, "rejected")} disabled={busyId === approval.id}><XCircle size={17} /> لا أوافق</Button></div><p className="mt-3 text-xs leading-6 text-[#8f96a3]">بالضغط يتم تسجيل القرار ووقته داخل أمر العمل.</p></div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
