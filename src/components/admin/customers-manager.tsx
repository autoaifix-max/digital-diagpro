"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Edit3, KeyRound, Loader2, Mail, Phone, Plus, RefreshCw, Search, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vehicles: Array<{ id: string }>;
  bookings: Array<{ id: string }>;
  work_orders: Array<{ id: string }>;
  customer_accounts: Array<{ id: string; is_active: boolean }>;
};

type FormState = { fullName: string; phone: string; email: string; notes: string; isActive: boolean };
const emptyForm: FormState = { fullName: "", phone: "", email: "", notes: "", isActive: true };

export function CustomersManager() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "archived">("all");
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [portalTarget, setPortalTarget] = useState<CustomerRow | null>(null);
  const [portalEmail, setPortalEmail] = useState("");
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalCredentials, setPortalCredentials] = useState<{ email: string; temporaryPassword: string; customerName: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/customers", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر تحميل العملاء");
      setRows(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل العملاء");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = activeFilter === "all" || (activeFilter === "active" ? row.is_active : !row.is_active);
      const matchesSearch = !term || [row.full_name, row.phone, row.email ?? ""].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [activeFilter, rows, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
  }

  function openEdit(row: CustomerRow) {
    setEditing(row);
    setForm({ fullName: row.full_name, phone: row.phone, email: row.email ?? "", notes: row.notes ?? "", isActive: row.is_active });
    setFormOpen(true);
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/admin/customers/${editing.id}` : "/api/admin/customers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر حفظ العميل");
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ العميل");
    } finally {
      setBusy(false);
    }
  }

  function openPortal(row: CustomerRow) {
    setPortalTarget(row);
    setPortalEmail(row.email ?? "");
    setPortalCredentials(null);
    setError("");
  }

  async function activatePortal(event: React.FormEvent) {
    event.preventDefault();
    if (!portalTarget) return;
    setPortalBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/customers/${portalTarget.id}/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: portalEmail }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر تفعيل بوابة العميل");
      setPortalCredentials(body.data);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تفعيل بوابة العميل");
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative max-w-xl flex-1"><Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#727986]" size={18} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو الجوال أو البريد" className="pr-11" /></div>
          <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)} className="focus-ring min-h-12 rounded-xl border border-[#343943] bg-[#111318] px-4 text-sm font-bold">
            <option value="all">كل العملاء</option><option value="active">نشط</option><option value="archived">مؤرشف</option>
          </select>
        </div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => void load()}><RefreshCw size={17} /> تحديث</Button><Button onClick={openCreate}><Plus size={18} /> عميل جديد</Button></div>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200">{error}</div> : null}
      {loading ? <LoadingBlock label="جاري تحميل العملاء" /> : filtered.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((row) => (
            <article key={row.id} className="panel rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#FFD100]/10 text-[#FFD100]"><UserRound size={22} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{row.full_name}</h3><Badge tone={row.is_active ? "success" : "neutral"}>{row.is_active ? "نشط" : "مؤرشف"}</Badge>{row.customer_accounts?.some((account) => account.is_active) ? <Badge tone="brand">بوابة مفعلة</Badge> : null}</div>
                  <div className="mt-3 grid gap-2 text-sm text-[#b8bdc6] sm:grid-cols-2"><span className="flex items-center gap-2" dir="ltr"><Phone size={15} /> {row.phone}</span><span className="flex items-center gap-2 truncate" dir="ltr"><Mail size={15} /> {row.email || "لا يوجد بريد"}</span></div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label={`تعديل ${row.full_name}`}><Edit3 size={17} /></Button>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white/[0.035] p-3"><strong className="block text-lg">{row.vehicles?.length ?? 0}</strong><span className="text-[11px] text-[#7f8793]">سيارات</span></div><div className="rounded-xl bg-white/[0.035] p-3"><strong className="block text-lg">{row.bookings?.length ?? 0}</strong><span className="text-[11px] text-[#7f8793]">حجوزات</span></div><div className="rounded-xl bg-white/[0.035] p-3"><strong className="block text-lg">{row.work_orders?.length ?? 0}</strong><span className="text-[11px] text-[#7f8793]">أوامر</span></div></div>
              {row.notes ? <p className="mt-4 line-clamp-2 text-sm leading-7 text-[#9299a5]">{row.notes}</p> : null}
              <div className="mt-4 flex items-center justify-between gap-3"><p className="text-[11px] text-[#6f7682]">أضيف: {formatDate(row.created_at)}</p>{!row.customer_accounts?.some((account) => account.is_active) ? <Button size="sm" variant="secondary" onClick={() => openPortal(row)}><KeyRound size={15} /> تفعيل البوابة</Button> : null}</div>
            </article>
          ))}
        </div>
      ) : <EmptyState title="لا توجد نتائج" description="أضف أول عميل أو غيّر كلمات البحث والتصفية." />}

      {formOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4">
          <button className="absolute inset-0" onClick={() => !busy && setFormOpen(false)} aria-label="إغلاق" />
          <form onSubmit={submit} className="panel relative z-10 my-8 w-full max-w-2xl rounded-3xl bg-[#111318] p-5 sm:p-7">
            <button type="button" onClick={() => setFormOpen(false)} className="absolute left-4 top-4 grid size-9 place-items-center rounded-xl bg-white/5" aria-label="إغلاق"><X size={18} /></button>
            <h2 className="text-xl font-black">{editing ? "تعديل العميل" : "إضافة عميل"}</h2>
            <p className="mt-2 text-sm text-[#8f96a3]">بيانات موحدة تُستخدم في الحجوزات والسيارات وأوامر العمل.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="اسم العميل"><Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required maxLength={120} /></Field>
              <Field label="رقم الجوال السعودي"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required inputMode="tel" dir="ltr" className="text-right" placeholder="05xxxxxxxx" /></Field>
              <Field label="البريد الإلكتروني" hint="اختياري، ويُستخدم لاحقًا لدعوة بوابة العميل"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" dir="ltr" className="text-right" /></Field>
              {editing ? <Field label="حالة العميل"><select value={form.isActive ? "active" : "archived"} onChange={(event) => setForm({ ...form, isActive: event.target.value === "active" })} className="focus-ring min-h-12 rounded-xl border border-[#343943] bg-[#111318] px-4"><option value="active">نشط</option><option value="archived">مؤرشف</option></select></Field> : null}
              <div className="sm:col-span-2"><Field label="ملاحظات"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength={2000} placeholder="معلومات مهمة عن العميل أو طريقة التواصل" /></Field></div>
            </div>
            {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200">{error}</div> : null}
            <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={busy}>إلغاء</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={17} /> : null}{editing ? "حفظ التعديلات" : "إضافة العميل"}</Button></div>
          </form>
        </div>
      ) : null}

      {portalTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4">
          <button className="absolute inset-0" onClick={() => !portalBusy && setPortalTarget(null)} aria-label="إغلاق" />
          <form onSubmit={activatePortal} className="panel relative z-10 w-full max-w-lg rounded-3xl bg-[#111318] p-5 sm:p-7">
            <button type="button" onClick={() => setPortalTarget(null)} className="absolute left-4 top-4 grid size-9 place-items-center rounded-xl bg-white/5"><X size={18} /></button>
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#FFD100]/10 text-[#FFD100]"><KeyRound /></span><div><h2 className="text-xl font-black">تفعيل بوابة العميل</h2><p className="text-sm text-[#8f96a3]">{portalTarget.full_name}</p></div></div>
            {!portalCredentials ? <><div className="mt-6"><Field label="بريد تسجيل دخول العميل" hint="سيتم إنشاء حساب مؤكد وكلمة مرور مؤقتة"><Input type="email" value={portalEmail} onChange={(event) => setPortalEmail(event.target.value)} required dir="ltr" className="text-right" /></Field></div>{error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200">{error}</div> : null}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPortalTarget(null)} disabled={portalBusy}>إلغاء</Button><Button type="submit" disabled={portalBusy}>{portalBusy ? <Loader2 className="animate-spin" size={17} /> : <KeyRound size={17} />} إنشاء الحساب</Button></div></> : <div className="mt-6"><div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/8 p-4"><div className="flex items-center gap-2 font-bold text-emerald-200"><CheckCircle2 size={18} /> تم تفعيل بوابة العميل</div><p className="mt-2 text-xs leading-6 text-[#aeb4bd]">انسخ البيانات وأرسلها للعميل. كلمة المرور المؤقتة تظهر الآن فقط.</p></div><div className="mt-4 grid gap-3"><div className="rounded-xl border border-[#343943] p-4"><span className="text-xs text-[#7f8793]">البريد</span><div className="mt-2 flex items-center justify-between gap-3"><code dir="ltr" className="truncate text-sm">{portalCredentials.email}</code><Button type="button" size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(portalCredentials.email)}><Copy size={15} /></Button></div></div><div className="rounded-xl border border-[#FFD100]/25 bg-[#FFD100]/6 p-4"><span className="text-xs text-[#a89b4f]">كلمة المرور المؤقتة</span><div className="mt-2 flex items-center justify-between gap-3"><code dir="ltr" className="truncate text-sm font-bold text-[#FFD100]">{portalCredentials.temporaryPassword}</code><Button type="button" size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(portalCredentials.temporaryPassword)}><Copy size={15} /></Button></div></div></div><Button type="button" className="mt-5 w-full" onClick={() => setPortalTarget(null)}>تم الحفظ</Button></div>}
          </form>
        </div>
      ) : null}
    </>
  );
}
