"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CarFront, Edit3, FileSearch, Loader2, Phone, RefreshCw, Save, Search, Wrench, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { workOrderStatusLabels } from "@/lib/domain/labels";
import { workOrderTransitions } from "@/lib/domain/transitions";
import type { DiagnosticStatus, Priority, StaffRole, WorkOrderStatus } from "@/lib/domain/types";
import { formatDateTime, formatMoney } from "@/lib/utils";

type Staff = { id: string; full_name: string; role: StaffRole };
type WorkOrderRow = {
  id: string;
  work_order_number: string;
  complaint: string;
  status: WorkOrderStatus;
  priority: Priority;
  assigned_to: string | null;
  odometer_in: number | null;
  fuel_level_percent: number | null;
  promised_at: string | null;
  labor_total: number;
  parts_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  approval_note: string | null;
  internal_notes: string | null;
  opened_at: string;
  updated_at: string;
  customers: { id: string; full_name: string; phone: string; email: string | null };
  vehicles: { id: string; make: string; model: string; model_year: number; plate_number: string | null; vin: string | null; mileage: number | null };
  diagnostic_reports: Array<{ id: string; report_number: string; title: string; status: DiagnosticStatus; customer_visible: boolean }>;
};

type DetailsForm = {
  priority: Priority;
  assignedTo: string;
  odometerIn: string;
  fuelLevelPercent: string;
  promisedAt: string;
  laborTotal: string;
  partsTotal: string;
  discountTotal: string;
  taxTotal: string;
  approvalNote: string;
  internalNotes: string;
};

const statuses: Array<WorkOrderStatus | "all"> = ["all", "open", "diagnosing", "waiting_approval", "approved", "in_progress", "quality_check", "ready", "delivered", "cancelled"];

function tone(status: WorkOrderStatus) {
  if (status === "ready" || status === "delivered") return "success" as const;
  if (status === "waiting_approval") return "warning" as const;
  if (status === "cancelled") return "danger" as const;
  if (status === "diagnosing" || status === "in_progress") return "brand" as const;
  return "neutral" as const;
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function WorkOrdersBoard({ role }: { role: StaffRole }) {
  const [rows, setRows] = useState<WorkOrderRow[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<WorkOrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<WorkOrderRow | null>(null);
  const [details, setDetails] = useState<DetailsForm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    try {
      const response = await fetch(`/api/admin/work-orders?${params.toString()}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر التحميل");
      setRows(body.data.orders);
      setStaff(body.data.staff);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل أوامر العمل");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function changeStatus(id: string, nextStatus: WorkOrderStatus) {
    setBusyId(id); setError("");
    try {
      const response = await fetch(`/api/admin/work-orders/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر تغيير الحالة");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تغيير الحالة"); }
    finally { setBusyId(null); }
  }

  function openDetails(row: WorkOrderRow) {
    setEditing(row);
    setDetails({
      priority: row.priority,
      assignedTo: row.assigned_to ?? "",
      odometerIn: row.odometer_in?.toString() ?? "",
      fuelLevelPercent: row.fuel_level_percent?.toString() ?? "",
      promisedAt: localDateTime(row.promised_at),
      laborTotal: String(row.labor_total ?? 0),
      partsTotal: String(row.parts_total ?? 0),
      discountTotal: String(row.discount_total ?? 0),
      taxTotal: String(row.tax_total ?? 0),
      approvalNote: row.approval_note ?? "",
      internalNotes: row.internal_notes ?? "",
    });
  }

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || !details) return;
    setBusyId(editing.id); setError("");
    try {
      const response = await fetch(`/api/admin/work-orders/${editing.id}/details`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر حفظ التفاصيل");
      setEditing(null); setDetails(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ التفاصيل"); }
    finally { setBusyId(null); }
  }

  const activeCount = useMemo(() => rows.filter((row) => !["delivered", "cancelled"].includes(row.status)).length, [rows]);
  const canEditDetails = role === "admin" || role === "receptionist";

  return <div>
    <div className="panel mb-5 grid gap-3 rounded-2xl p-4 lg:grid-cols-[1fr_220px_auto]">
      <div className="relative"><Search className="pointer-events-none absolute right-3 top-3.5 text-[#707783]" size={18} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث برقم أمر العمل أو الشكوى" className="pr-10" /></div>
      <Select value={status} onChange={(event) => setStatus(event.target.value as WorkOrderStatus | "all")}>{statuses.map((item) => <option key={item} value={item}>{item === "all" ? `كل الحالات (${rows.length})` : workOrderStatusLabels[item]}</option>)}</Select>
      <Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={17} /> تحديث</Button>
    </div>
    <div className="mb-4 text-xs text-[#7f8793]">أوامر نشطة ضمن النتائج: <strong className="text-[#FFD100]">{activeCount}</strong></div>
    {error ? <div role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}
    {loading ? <LoadingBlock label="تحميل أوامر العمل..." /> : rows.length === 0 ? <EmptyState title="لا توجد أوامر عمل مطابقة" description="استخدم صفحة استقبال سيارة أو حوّل حجزًا عند وصول العميل." /> : <div className="grid gap-4 xl:grid-cols-2">{rows.map((row) => {
      const next = workOrderTransitions[row.status].filter((item) => !["waiting_approval", "approved", "ready"].includes(item) && !(row.status === "quality_check" && item === "in_progress")); const report = row.diagnostic_reports?.[0]; const assigned = staff.find((item) => item.id === row.assigned_to);
      return <article key={row.id} className="panel rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong>{row.customers.full_name}</strong><Badge tone={tone(row.status)}>{workOrderStatusLabels[row.status]}</Badge>{row.priority === "urgent" ? <Badge tone="danger">عاجل</Badge> : null}</div><p className="mt-1 text-xs text-[#7f8793]">{row.work_order_number} • فتح {formatDateTime(row.opened_at)}</p></div><div className="text-left"><span className="block text-xs text-[#7f8793]">الإجمالي</span><strong className="text-sm text-[#FFD100]">{formatMoney(row.grand_total)}</strong></div></div>
        <div className="mt-5 grid gap-3 rounded-2xl bg-[#111318] p-4 sm:grid-cols-2"><div className="flex gap-3"><CarFront className="mt-0.5 shrink-0 text-[#FFD100]" size={18} /><div><strong className="block text-sm">{row.vehicles.make} {row.vehicles.model} {row.vehicles.model_year}</strong><span className="text-xs text-[#7f8793]">{row.vehicles.plate_number || "بدون لوحة"}</span></div></div><a href={`tel:${row.customers.phone}`} className="flex gap-3"><Phone className="mt-0.5 shrink-0 text-[#FFD100]" size={18} /><div><strong dir="ltr" className="block text-sm">{row.customers.phone}</strong><span className="text-xs text-[#7f8793]">اتصال بالعميل</span></div></a></div>
        <div className="mt-4"><span className="text-xs font-bold text-[#8f96a3]">الشكوى</span><p className="mt-1 line-clamp-3 text-sm leading-7 text-[#d8dbe0]">{row.complaint}</p></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#8f96a3]"><span>الفني: <strong className="text-[#d8dbe0]">{assigned?.full_name ?? "غير محدد"}</strong></span><span>العداد: <strong className="text-[#d8dbe0]">{row.odometer_in?.toLocaleString("ar-SA") ?? "—"}</strong></span><span>الوقود: <strong className="text-[#d8dbe0]">{row.fuel_level_percent == null ? "—" : `${row.fuel_level_percent}%`}</strong></span><span>التسليم: <strong className="text-[#d8dbe0]">{row.promised_at ? formatDateTime(row.promised_at) : "غير محدد"}</strong></span></div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/6 pt-4"><Link href={`/admin/diagnostics?workOrderId=${row.id}`} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#FFD100] px-3 text-xs font-black text-[#111]"><FileSearch size={16} /> {report ? "فتح التشخيص" : "إنشاء تشخيص"}</Link>{canEditDetails ? <Button size="sm" variant="secondary" onClick={() => openDetails(row)}><Edit3 size={15} /> تفاصيل الأمر</Button> : null}{report ? <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#343943] px-3 text-xs text-[#c4c8cf]"><Wrench size={15} /> {report.report_number}</span> : null}{next.length ? <Select className="min-h-10 w-auto min-w-40 py-0 text-sm" defaultValue="" disabled={busyId === row.id} onChange={(event) => { const value = event.target.value as WorkOrderStatus; if (value) void changeStatus(row.id, value); event.currentTarget.value = ""; }}><option value="" disabled>تغيير الحالة...</option>{next.map((item) => <option key={item} value={item}>{workOrderStatusLabels[item]}</option>)}</Select> : null}{busyId === row.id ? <Loader2 className="animate-spin self-center text-[#FFD100]" size={18} /> : null}</div>
      </article>;
    })}</div>}

    {editing && details ? <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4"><button className="absolute inset-0" onClick={() => !busyId && setEditing(null)} /><form onSubmit={saveDetails} className="panel relative z-10 my-8 w-full max-w-3xl rounded-3xl bg-[#111318] p-5 sm:p-7"><button type="button" onClick={() => setEditing(null)} className="absolute left-4 top-4 grid size-9 place-items-center rounded-xl bg-white/5"><X size={18} /></button><h2 className="text-xl font-black">تفاصيل أمر العمل</h2><p className="mt-2 text-sm text-[#8f96a3]">{editing.work_order_number} — {editing.customers.full_name}</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="الأولوية"><Select value={details.priority} onChange={(e) => setDetails({ ...details, priority: e.target.value as Priority })}><option value="normal">عادي</option><option value="urgent">عاجل</option></Select></Field><Field label="الفني المسؤول"><Select value={details.assignedTo} onChange={(e) => setDetails({ ...details, assignedTo: e.target.value })}><option value="">غير محدد</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.full_name} — {item.role === "technician" ? "فني" : item.role === "receptionist" ? "استقبال" : "مدير"}</option>)}</Select></Field><Field label="قراءة العداد"><Input type="number" min={0} value={details.odometerIn} onChange={(e) => setDetails({ ...details, odometerIn: e.target.value })} /></Field><Field label="مستوى الوقود %"><Input type="number" min={0} max={100} value={details.fuelLevelPercent} onChange={(e) => setDetails({ ...details, fuelLevelPercent: e.target.value })} /></Field><Field label="موعد التسليم المتوقع"><Input type="datetime-local" value={details.promisedAt} onChange={(e) => setDetails({ ...details, promisedAt: e.target.value })} /></Field><div /><Field label="أجور العمل"><Input type="number" min={0} step="0.01" value={details.laborTotal} onChange={(e) => setDetails({ ...details, laborTotal: e.target.value })} /></Field><Field label="قيمة القطع"><Input type="number" min={0} step="0.01" value={details.partsTotal} onChange={(e) => setDetails({ ...details, partsTotal: e.target.value })} /></Field><Field label="الخصم"><Input type="number" min={0} step="0.01" value={details.discountTotal} onChange={(e) => setDetails({ ...details, discountTotal: e.target.value })} /></Field><Field label="الضريبة"><Input type="number" min={0} step="0.01" value={details.taxTotal} onChange={(e) => setDetails({ ...details, taxTotal: e.target.value })} /></Field><div className="sm:col-span-2"><Field label="ملاحظة الموافقة"><Textarea value={details.approvalNote} onChange={(e) => setDetails({ ...details, approvalNote: e.target.value })} /></Field></div><div className="sm:col-span-2"><Field label="ملاحظات داخلية" hint="لا تظهر للعميل"><Textarea value={details.internalNotes} onChange={(e) => setDetails({ ...details, internalNotes: e.target.value })} /></Field></div></div><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>إلغاء</Button><Button type="submit" disabled={busyId === editing.id}>{busyId === editing.id ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />} حفظ التفاصيل</Button></div></form></div> : null}
  </div>;
}
