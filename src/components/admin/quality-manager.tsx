"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Save, Search, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { qualityItemResultLabels, qualityStatusLabels, workOrderStatusLabels } from "@/lib/domain/labels";
import { cloneDefaultQualityChecklist } from "@/lib/domain/quality";
import type { QualityCheckStatus, QualityChecklistItem, QualityItemResult, WorkOrderStatus } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/utils";

type QualityCheck = { id: string; status: QualityCheckStatus; checklist: QualityChecklistItem[]; notes: string | null; checked_at: string | null };
type WorkOrderRow = {
  id: string; work_order_number: string; complaint: string; status: WorkOrderStatus; updated_at: string;
  customers: { full_name: string; phone: string };
  vehicles: { make: string; model: string; model_year: number; plate_number: string | null };
  quality_checks: QualityCheck[];
};

type ApiCheck = QualityCheck & { work_order_id: string; work_orders: WorkOrderRow };

function statusTone(status: QualityCheckStatus) { if (status === "passed") return "success" as const; if (status === "failed") return "danger" as const; return "warning" as const; }

export function QualityManager() {
  const [orders, setOrders] = useState<WorkOrderRow[]>([]); const [checks, setChecks] = useState<ApiCheck[]>([]); const [selectedId, setSelectedId] = useState(""); const [checklist, setChecklist] = useState<QualityChecklistItem[]>(cloneDefaultQualityChecklist()); const [notes, setNotes] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [search, setSearch] = useState("");

  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch("/api/admin/quality", { cache: "no-store" }); const body = await response.json(); if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر تحميل الجودة"); setOrders(body.data.workOrders); setChecks(body.data.checks); setSelectedId((current) => current || body.data.workOrders[0]?.id || ""); } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحميل الجودة"); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const filteredOrders = useMemo(() => { const term = search.trim().toLowerCase(); return orders.filter((order) => !term || [order.work_order_number, order.customers.full_name, order.customers.phone, order.vehicles.make, order.vehicles.model, order.vehicles.plate_number ?? ""].some((value) => value.toLowerCase().includes(term))); }, [orders, search]);
  const selected = orders.find((order) => order.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => {
      const current = selected.quality_checks?.[0];
      setChecklist(current?.checklist?.length ? current.checklist : cloneDefaultQualityChecklist());
      setNotes(current?.notes ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected]);

  function updateItem(index: number, patch: Partial<QualityChecklistItem>) { setChecklist((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  async function save(status: QualityCheckStatus) {
    if (!selected) return; setBusy(true); setError("");
    try { const response = await fetch("/api/admin/quality", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workOrderId: selected.id, status, checklist, notes }) }); const body = await response.json(); if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر حفظ فحص الجودة"); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ فحص الجودة"); }
    finally { setBusy(false); }
  }

  return <>
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <aside className="min-w-0"><div className="mb-3 flex items-center gap-2"><div className="relative flex-1"><Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#727986]" size={17} /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن أمر" className="pr-11" /></div><Button variant="secondary" size="sm" onClick={() => void load()} aria-label="تحديث"><RefreshCw size={17} /></Button></div>{loading ? <LoadingBlock label="تحميل الأوامر" /> : filteredOrders.length ? <div className="grid max-h-[70vh] gap-2 overflow-y-auto pl-1">{filteredOrders.map((order) => { const check = order.quality_checks?.[0]; return <button key={order.id} onClick={() => setSelectedId(order.id)} className={`focus-ring rounded-2xl border p-4 text-right transition ${selectedId === order.id ? "border-[#FFD100]/45 bg-[#FFD100]/8" : "border-[#2c3037] bg-white/[0.02] hover:bg-white/[0.04]"}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm">{order.work_order_number}</strong>{check ? <Badge tone={statusTone(check.status)}>{qualityStatusLabels[check.status]}</Badge> : <Badge>لم يبدأ</Badge>}</div><p className="mt-2 truncate text-xs text-[#9ca3af]">{order.customers.full_name} — {order.vehicles.make} {order.vehicles.model}</p><p className="mt-1 text-[11px] text-[#6f7682]">{workOrderStatusLabels[order.status]}</p></button>; })}</div> : <EmptyState title="لا توجد أوامر للجودة" description="ستظهر أوامر العمل عند الوصول إلى قيد العمل أو فحص الجودة." />}</aside>

      <section className="min-w-0">{selected ? <div className="panel rounded-3xl p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[#FFD100]"><ShieldCheck size={20} /><span className="text-xs font-bold">قائمة فحص الجودة</span></div><h2 className="mt-2 text-xl font-black">{selected.work_order_number}</h2><p className="mt-2 text-sm text-[#aeb4bd]">{selected.customers.full_name} — {selected.vehicles.make} {selected.vehicles.model} {selected.vehicles.model_year}</p><p className="mt-1 text-xs text-[#737b87]">{selected.complaint}</p></div><Badge tone={selected.status === "ready" ? "success" : selected.status === "quality_check" ? "brand" : "neutral"}>{workOrderStatusLabels[selected.status]}</Badge></div>
        <div className="mt-7 grid gap-3">{checklist.map((item, index) => <article key={item.key} className={`rounded-2xl border p-4 ${item.result === "pass" ? "border-emerald-400/20 bg-emerald-400/5" : item.result === "fail" ? "border-red-400/25 bg-red-400/6" : "border-[#30343b] bg-white/[0.02]"}`}><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-start gap-3">{item.result === "pass" ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={20} /> : item.result === "fail" ? <XCircle className="mt-0.5 shrink-0 text-red-300" size={20} /> : <ClipboardCheck className="mt-0.5 shrink-0 text-[#FFD100]" size={20} />}<strong className="text-sm leading-6">{item.label}</strong></div><Select value={item.result} onChange={(e) => updateItem(index, { result: e.target.value as QualityItemResult })} className="lg:max-w-44">{Object.entries(qualityItemResultLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></div><Input value={item.note} onChange={(e) => updateItem(index, { note: e.target.value })} placeholder="ملاحظة على البند — اختياري" className="mt-3 min-h-10" /></article>)}</div>
        <div className="mt-5"><Field label="ملاحظات الجودة العامة"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: أعيدت السيارة للفني بسبب استمرار صوت خفيف عند المطبات" /></Field></div>
        {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200">{error}</div> : null}
        <div className="mt-6 grid gap-2 sm:grid-cols-3"><Button variant="secondary" onClick={() => void save("draft")} disabled={busy || selected.status === "ready"}><Save size={17} /> حفظ مسودة</Button><Button variant="danger" onClick={() => void save("failed")} disabled={busy || selected.status === "ready"}><XCircle size={17} /> يحتاج إعادة عمل</Button><Button onClick={() => void save("passed")} disabled={busy || selected.status !== "quality_check"}>{busy ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />} اعتماد واجتياز</Button></div>{selected.status !== "quality_check" ? <p className="mt-3 text-xs text-[#8f96a3]">لا يمكن اعتماد الاجتياز إلا عندما تكون حالة أمر العمل «فحص الجودة». يمكن حفظ المسودة أثناء قيد العمل.</p> : null}
      </div> : <EmptyState title="اختر أمر عمل" description="اختر أمرًا من القائمة لبدء أو مراجعة فحص الجودة." />}</section>
    </div>

    <section className="mt-9"><h2 className="mb-4 text-lg font-black">سجل الجودة</h2>{checks.length ? <div className="grid gap-3 lg:grid-cols-2">{checks.slice(0, 20).map((check) => <article key={check.id} className="panel rounded-2xl p-4"><div className="flex items-center justify-between gap-3"><strong>{check.work_orders.work_order_number}</strong><Badge tone={statusTone(check.status)}>{qualityStatusLabels[check.status]}</Badge></div><p className="mt-2 text-sm text-[#9ca3af]">{check.work_orders.customers.full_name} — {check.work_orders.vehicles.make} {check.work_orders.vehicles.model}</p>{check.checked_at ? <p className="mt-2 text-xs text-[#6f7682]">{formatDateTime(check.checked_at)}</p> : null}</article>)}</div> : <EmptyState title="لا يوجد سجل جودة بعد" description="احفظ أول قائمة فحص لتظهر هنا." />}</section>
  </>;
}
