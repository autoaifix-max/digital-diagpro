"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, EyeOff, FileText, Loader2, RefreshCw, Search, Trash2, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { documentTypeLabels } from "@/lib/domain/labels";
import type { DocumentType, WorkOrderStatus } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/utils";

type DocumentRow = {
  id: string;
  customer_id: string;
  vehicle_id: string | null;
  work_order_id: string | null;
  booking_id: string | null;
  diagnostic_report_id: string | null;
  title: string;
  document_type: DocumentType;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  customer_visible: boolean;
  created_at: string;
  customers: { full_name: string; phone: string };
  vehicles: { make: string; model: string; model_year: number } | null;
  work_orders: { work_order_number: string } | null;
};

type Customer = { id: string; full_name: string; phone: string };
type Vehicle = { id: string; customer_id: string; make: string; model: string; model_year: number; plate_number: string | null };
type WorkOrder = { id: string; customer_id: string; vehicle_id: string; work_order_number: string; status: WorkOrderStatus };
type Booking = { id: string; customer_id: string; vehicle_id: string; booking_number: string; status: string };
type Diagnostic = { id: string; customer_id: string; vehicle_id: string; work_order_id: string; report_number: string; title: string };

type Payload = {
  documents: DocumentRow[];
  customers: Customer[];
  vehicles: Vehicle[];
  workOrders: WorkOrder[];
  bookings: Booking[];
  diagnostics: Diagnostic[];
};

function sizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsManager() {
  const [payload, setPayload] = useState<Payload>({ documents: [], customers: [], vehicles: [], workOrders: [], bookings: [], diagnostics: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/documents", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر التحميل");
      setPayload(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل المستندات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return payload.documents;
    return payload.documents.filter((doc) => [doc.title, doc.file_name, doc.customers.full_name, doc.work_orders?.work_order_number ?? ""].some((value) => value.toLowerCase().includes(term)));
  }, [payload.documents, search]);

  const customerVehicles = payload.vehicles.filter((item) => item.customer_id === customerId);
  const customerOrders = payload.workOrders.filter((item) => item.customer_id === customerId);
  const customerBookings = payload.bookings.filter((item) => item.customer_id === customerId);
  const customerDiagnostics = payload.diagnostics.filter((item) => item.customer_id === customerId);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    form.set("customerVisible", form.get("customerVisible") === "on" ? "true" : "false");

    try {
      const response = await fetch("/api/admin/documents", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر رفع المستند");
      setSuccess("تم رفع المستند وحفظ بياناته.");
      event.currentTarget.reset();
      setCustomerId("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر رفع المستند");
    } finally {
      setUploading(false);
    }
  }

  async function toggleVisibility(doc: DocumentRow) {
    setBusyId(doc.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerVisible: !doc.customer_visible }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر تحديث الرؤية");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحديث الرؤية");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(doc: DocumentRow) {
    if (!window.confirm(`حذف المستند «${doc.title}» نهائيًا؟`)) return;
    setBusyId(doc.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/documents/${doc.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر حذف المستند");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حذف المستند");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingBlock label="تحميل المستندات..." />;

  return (
    <div className="grid gap-6 2xl:grid-cols-[410px_1fr]">
      <section className="panel h-fit rounded-2xl p-5 2xl:sticky 2xl:top-23">
        <div className="mb-5 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#FFD100]/10 text-[#FFD100]"><UploadCloud /></span><div><h2 className="font-black">رفع مستند</h2><p className="text-xs text-[#7f8793]">PDF أو صورة أو CSV — حتى 15 MB</p></div></div>
        <form onSubmit={upload} className="grid gap-4">
          <Field label="العميل">
            <Select name="customerId" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required>
              <option value="">اختر العميل...</option>
              {payload.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} — {customer.phone}</option>)}
            </Select>
          </Field>
          <Field label="عنوان المستند"><Input name="title" required minLength={3} placeholder="مثال: تقرير فحص الأعطال" /></Field>
          <Field label="نوع المستند"><Select name="documentType" defaultValue="diagnostic_report">{Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
          <Field label="السيارة" hint="اختياري"><Select name="vehicleId" defaultValue=""><option value="">بدون ربط</option>{customerVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} {vehicle.model_year} {vehicle.plate_number ? `— ${vehicle.plate_number}` : ""}</option>)}</Select></Field>
          <Field label="أمر العمل" hint="اختياري"><Select name="workOrderId" defaultValue=""><option value="">بدون ربط</option>{customerOrders.map((order) => <option key={order.id} value={order.id}>{order.work_order_number}</option>)}</Select></Field>
          <Field label="الحجز" hint="اختياري"><Select name="bookingId" defaultValue=""><option value="">بدون ربط</option>{customerBookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.booking_number}</option>)}</Select></Field>
          <Field label="تقرير التشخيص" hint="اختياري"><Select name="diagnosticReportId" defaultValue=""><option value="">بدون ربط</option>{customerDiagnostics.map((report) => <option key={report.id} value={report.id}>{report.report_number} — {report.title}</option>)}</Select></Field>
          <Field label="الملف"><Input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,text/csv" required className="pt-2.5 file:ml-3 file:rounded-lg file:border-0 file:bg-[#FFD100] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-[#111]" /></Field>
          <label className="flex items-start gap-3 rounded-xl border border-[#343943] bg-[#111318] p-3 text-sm"><input name="customerVisible" type="checkbox" className="mt-1 size-4 accent-[#FFD100]" /><span><strong className="block">إظهار للعميل مباشرة</strong><span className="text-xs text-[#7f8793]">الأفضل مراجعته أولًا ثم تفعيل الرؤية.</span></span></label>
          <Button type="submit" size="lg" disabled={uploading || !customerId}>{uploading ? <><Loader2 className="animate-spin" size={19} /> جارٍ الرفع</> : <><UploadCloud size={19} /> رفع المستند</>}</Button>
        </form>
      </section>

      <section>
        <div className="panel mb-4 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
          <div className="relative flex-1"><Search className="pointer-events-none absolute right-3 top-3.5 text-[#707783]" size={18} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالعنوان أو العميل أو أمر العمل" className="pr-10" /></div>
          <Button variant="secondary" onClick={() => void load()}><RefreshCw size={17} /> تحديث</Button>
        </div>

        {error ? <div role="alert" className="mb-4 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}
        {success ? <div className="mb-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">{success}</div> : null}

        {!filtered.length ? <EmptyState title="لا توجد مستندات" description="ارفع أول تقرير أو عرض سعر أو فاتورة للعميل." /> : (
          <div className="grid gap-3">
            {filtered.map((doc) => (
              <article key={doc.id} className="panel rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#FFD100]/10 text-[#FFD100]"><FileText size={21} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{doc.title}</h3><Badge tone={doc.customer_visible ? "success" : "neutral"}>{doc.customer_visible ? "ظاهر للعميل" : "داخلي"}</Badge><Badge>{documentTypeLabels[doc.document_type]}</Badge></div>
                    <p className="mt-1 text-sm text-[#a5abb5]">{doc.customers.full_name}{doc.vehicles ? ` — ${doc.vehicles.make} ${doc.vehicles.model} ${doc.vehicles.model_year}` : ""}</p>
                    <p className="mt-1 truncate text-xs text-[#737b87]">{doc.file_name} • {sizeLabel(doc.size_bytes)} • {formatDateTime(doc.created_at)}{doc.work_orders ? ` • ${doc.work_orders.work_order_number}` : ""}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/6 pt-4">
                  <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#FFD100] px-3 text-xs font-black text-[#111]"><Download size={15} /> فتح</a>
                  <Button size="sm" variant="secondary" onClick={() => void toggleVisibility(doc)} disabled={busyId === doc.id}>{doc.customer_visible ? <EyeOff size={15} /> : <Eye size={15} />}{doc.customer_visible ? "إخفاء عن العميل" : "إظهار للعميل"}</Button>
                  <Button size="sm" variant="danger" onClick={() => void remove(doc)} disabled={busyId === doc.id}><Trash2 size={15} /> حذف</Button>
                  {busyId === doc.id ? <Loader2 className="animate-spin self-center text-[#FFD100]" size={17} /> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
