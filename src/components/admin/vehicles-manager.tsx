"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CarFront, Edit3, Gauge, Hash, Loader2, Plus, RefreshCw, Search, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CustomerOption = { id: string; full_name: string; phone: string };
type VehicleRow = {
  id: string; customer_id: string; make: string; model: string; model_year: number; vin: string | null;
  plate_number: string | null; engine: string | null; color: string | null; mileage: number | null; notes: string | null;
  is_active: boolean; customers: CustomerOption; bookings: Array<{ id: string }>; work_orders: Array<{ id: string }>;
};
type FormState = { customerId: string; make: string; model: string; modelYear: string; vin: string; plateNumber: string; engine: string; color: string; mileage: string; notes: string; isActive: boolean };
const emptyForm: FormState = { customerId: "", make: "", model: "", modelYear: String(new Date().getFullYear()), vin: "", plateNumber: "", engine: "", color: "", mileage: "", notes: "", isActive: true };

export function VehiclesManager() {
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "archived">("all");
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/vehicles", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر تحميل السيارات");
      setRows(body.data.vehicles); setCustomers(body.data.customers);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحميل السيارات"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const statusOk = activeFilter === "all" || (activeFilter === "active" ? row.is_active : !row.is_active);
      const searchOk = !term || [row.make, row.model, String(row.model_year), row.vin ?? "", row.plate_number ?? "", row.customers.full_name, row.customers.phone].some((value) => value.toLowerCase().includes(term));
      return statusOk && searchOk;
    });
  }, [activeFilter, rows, search]);

  function openCreate() { setEditing(null); setForm({ ...emptyForm, customerId: customers[0]?.id ?? "" }); setFormOpen(true); setError(""); }
  function openEdit(row: VehicleRow) { setEditing(row); setForm({ customerId: row.customer_id, make: row.make, model: row.model, modelYear: String(row.model_year), vin: row.vin ?? "", plateNumber: row.plate_number ?? "", engine: row.engine ?? "", color: row.color ?? "", mileage: row.mileage == null ? "" : String(row.mileage), notes: row.notes ?? "", isActive: row.is_active }); setFormOpen(true); setError(""); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(editing ? `/api/admin/vehicles/${editing.id}` : "/api/admin/vehicles", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json(); if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر حفظ السيارة");
      setFormOpen(false); setEditing(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ السيارة"); }
    finally { setBusy(false); }
  }

  return <>
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-1 flex-col gap-3 sm:flex-row"><div className="relative max-w-xl flex-1"><Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#727986]" size={18} /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="شركة، موديل، لوحة، هيكل، عميل" className="pr-11" /></div><select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)} className="focus-ring min-h-12 rounded-xl border border-[#343943] bg-[#111318] px-4 text-sm font-bold"><option value="all">كل السيارات</option><option value="active">نشطة</option><option value="archived">مؤرشفة</option></select></div><div className="flex gap-2"><Button variant="secondary" onClick={() => void load()}><RefreshCw size={17} /> تحديث</Button><Button onClick={openCreate} disabled={!customers.length}><Plus size={18} /> سيارة جديدة</Button></div></div>
    {error ? <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200">{error}</div> : null}
    {loading ? <LoadingBlock label="جاري تحميل السيارات" /> : filtered.length ? <div className="grid gap-4 xl:grid-cols-2">{filtered.map((row) => <article key={row.id} className="panel rounded-2xl p-5"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#FFD100]/10 text-[#FFD100]"><CarFront /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{row.make} {row.model} {row.model_year}</h3><Badge tone={row.is_active ? "success" : "neutral"}>{row.is_active ? "نشطة" : "مؤرشفة"}</Badge></div><p className="mt-2 flex items-center gap-2 text-sm text-[#aeb4bd]"><UserRound size={15} /> {row.customers.full_name} <span dir="ltr" className="text-[#737b87]">{row.customers.phone}</span></p></div><Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Edit3 size={17} /></Button></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-xl bg-white/[0.035] p-3"><span className="flex items-center gap-2 text-xs text-[#7f8793]"><Hash size={14} /> اللوحة</span><strong className="mt-1 block">{row.plate_number || "—"}</strong></div><div className="rounded-xl bg-white/[0.035] p-3"><span className="flex items-center gap-2 text-xs text-[#7f8793]"><Gauge size={14} /> العداد</span><strong className="mt-1 block">{row.mileage == null ? "—" : `${row.mileage.toLocaleString("ar-SA")} كم`}</strong></div><div className="rounded-xl bg-white/[0.035] p-3"><span className="text-xs text-[#7f8793]">سجل التشغيل</span><strong className="mt-1 block">{row.bookings?.length ?? 0} حجز • {row.work_orders?.length ?? 0} أمر</strong></div></div>{row.vin ? <p className="mt-4 truncate text-xs text-[#7f8793]" dir="ltr">VIN: {row.vin}</p> : null}</article>)}</div> : <EmptyState title="لا توجد سيارات" description="أضف أول سيارة بعد إنشاء العميل." />}
    {formOpen ? <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4"><button className="absolute inset-0" onClick={() => !busy && setFormOpen(false)} aria-label="إغلاق" /><form onSubmit={submit} className="panel relative z-10 my-8 w-full max-w-3xl rounded-3xl bg-[#111318] p-5 sm:p-7"><button type="button" onClick={() => setFormOpen(false)} className="absolute left-4 top-4 grid size-9 place-items-center rounded-xl bg-white/5"><X size={18} /></button><h2 className="text-xl font-black">{editing ? "تعديل السيارة" : "إضافة سيارة"}</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="sm:col-span-2 lg:col-span-3"><Field label="العميل"><Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} — {customer.phone}</option>)}</Select></Field></div><Field label="الشركة"><Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required /></Field><Field label="الموديل"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></Field><Field label="السنة"><Input type="number" min={1980} max={new Date().getFullYear() + 1} value={form.modelYear} onChange={(e) => setForm({ ...form, modelYear: e.target.value })} required /></Field><Field label="رقم اللوحة"><Input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} /></Field><Field label="رقم الهيكل VIN"><Input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })} dir="ltr" className="text-right" maxLength={17} /></Field><Field label="قراءة العداد"><Input type="number" min={0} value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} /></Field><Field label="المحرك"><Input value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} /></Field><Field label="اللون"><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>{editing ? <Field label="الحالة"><Select value={form.isActive ? "active" : "archived"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}><option value="active">نشطة</option><option value="archived">مؤرشفة</option></Select></Field> : null}<div className="sm:col-span-2 lg:col-span-3"><Field label="ملاحظات"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div></div>{error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200">{error}</div> : null}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={busy}>إلغاء</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={17} /> : null}حفظ السيارة</Button></div></form></div> : null}
  </>;
}
