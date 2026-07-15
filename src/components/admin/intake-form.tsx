"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Save, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils";

type Service = { id: string; code: string; name_ar: string; base_price: number | null; estimated_minutes: number | null };
type Result = { work_order_id: string; work_order_number: string; booking_number: string };

const initial = { customerName: "", phone: "", email: "", vehicleMake: "", vehicleModel: "", vehicleYear: String(new Date().getFullYear()), vin: "", plateNumber: "", serviceCode: "", complaint: "", priority: "normal", odometerIn: "", fuelLevelPercent: "", promisedAt: "" };

export function IntakeForm() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/intake", { cache: "no-store" }).then((r) => r.json()).then((body) => {
      if (!cancelled && body.ok) {
        setServices(body.data);
        if (body.data[0]) setForm((current) => ({ ...current, serviceCode: current.serviceCode || body.data[0].code }));
      }
    });
    return () => { cancelled = true; };
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/admin/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر استقبال السيارة");
      setResult(body.data);
      setForm({ ...initial, serviceCode: services[0]?.code ?? "" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر استقبال السيارة"); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
    <form onSubmit={submit} className="panel rounded-2xl p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم العميل"><Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required /></Field>
        <Field label="رقم الجوال"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="05xxxxxxxx" dir="ltr" className="text-right" required /></Field>
        <Field label="البريد الإلكتروني" hint="اختياري"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} dir="ltr" className="text-right" /></Field>
        <Field label="الأولوية"><Select value={form.priority} onChange={(e) => set("priority", e.target.value)}><option value="normal">عادي</option><option value="urgent">عاجل</option></Select></Field>
        <Field label="الشركة"><Input value={form.vehicleMake} onChange={(e) => set("vehicleMake", e.target.value)} required /></Field>
        <Field label="الموديل"><Input value={form.vehicleModel} onChange={(e) => set("vehicleModel", e.target.value)} required /></Field>
        <Field label="السنة"><Input type="number" value={form.vehicleYear} onChange={(e) => set("vehicleYear", e.target.value)} required /></Field>
        <Field label="رقم اللوحة"><Input value={form.plateNumber} onChange={(e) => set("plateNumber", e.target.value)} /></Field>
        <Field label="رقم الهيكل VIN" hint="اختياري"><Input value={form.vin} onChange={(e) => set("vin", e.target.value.toUpperCase())} maxLength={17} dir="ltr" className="text-right" /></Field>
        <Field label="الخدمة"><Select value={form.serviceCode} onChange={(e) => set("serviceCode", e.target.value)} required>{services.map((service) => <option key={service.id} value={service.code}>{service.name_ar} — {formatMoney(service.base_price)}</option>)}</Select></Field>
        <Field label="قراءة العداد" hint="اختياري"><Input type="number" value={form.odometerIn} onChange={(e) => set("odometerIn", e.target.value)} min={0} /></Field>
        <Field label="مستوى الوقود %" hint="اختياري"><Input type="number" value={form.fuelLevelPercent} onChange={(e) => set("fuelLevelPercent", e.target.value)} min={0} max={100} /></Field>
        <Field label="موعد التسليم المتوقع" hint="اختياري"><Input type="datetime-local" value={form.promisedAt} onChange={(e) => set("promisedAt", e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="شكوى العميل"><Textarea value={form.complaint} onChange={(e) => set("complaint", e.target.value)} required rows={4} placeholder="اكتب وصف المشكلة كما ذكرها العميل دون تشخيص مسبق" /></Field></div>
      </div>
      {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200">{error}</div> : null}
      <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={busy || services.length === 0}>{busy ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} إنشاء الاستقبال وأمر العمل</Button>
    </form>
    <aside className="panel h-fit rounded-2xl p-5"><h2 className="font-black">ما الذي ينشأ؟</h2><ol className="mt-4 grid gap-3 text-sm leading-6 text-[#aeb4bd]"><li>1. ملف العميل أو تحديثه.</li><li>2. السيارة أو ربط السيارة الموجودة.</li><li>3. حجز حضوري بحالة «وصل».</li><li>4. أمر عمل مفتوح جاهز للتشخيص.</li></ol>{result ? <div className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/8 p-4"><div className="flex items-center gap-2 font-bold text-emerald-200"><CheckCircle2 size={18} /> تم استقبال السيارة</div><p className="mt-3 text-sm">{result.work_order_number}</p><Link href="/admin/work-orders" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#FFD100] px-4 py-2 text-sm font-black text-[#111]"><Wrench size={16} /> فتح أوامر العمل</Link></div> : null}</aside>
  </div>;
}
