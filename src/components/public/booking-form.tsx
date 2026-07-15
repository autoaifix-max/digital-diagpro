"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, CheckCircle2, ChevronLeft, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const makes = ["Toyota", "Hyundai", "Kia", "Nissan", "Honda", "Ford", "Chevrolet", "GMC", "Dodge", "Chrysler", "Jeep", "Geely", "Changan", "MG", "Other"];

interface BookingResponse {
  bookingNumber: string;
  bookingId: string;
}

export interface BookingServiceOption { value: string; label: string; }

export function BookingForm({ services }: { services: BookingServiceOption[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BookingResponse | null>(null);

  const minDate = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      customerName: form.get("customerName"),
      phone: form.get("phone"),
      vehicleMake: form.get("vehicleMake"),
      vehicleModel: form.get("vehicleModel"),
      vehicleYear: form.get("vehicleYear"),
      plateNumber: form.get("plateNumber"),
      serviceCode: form.get("serviceCode"),
      complaint: form.get("complaint"),
      preferredDate: form.get("preferredDate"),
      preferredTime: form.get("preferredTime"),
      consent: form.get("consent") === "on",
    };

    try {
      const response = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر إرسال الحجز");
      setResult(body.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="panel rounded-3xl p-6 text-center sm:p-10">
        <div className="mx-auto grid size-18 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 size={38} />
        </div>
        <h2 className="mt-6 text-3xl font-black">تم استلام طلب الحجز</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#a5abb5]">سيراجع فريق المركز الطلب ويتواصل لتأكيد الموعد. احتفظ برقم الحجز.</p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[#FFD100]/25 bg-[#FFD100]/8 p-5">
          <span className="text-xs text-[#aeb4bd]">رقم الحجز</span>
          <strong className="mt-2 block text-2xl tracking-wider text-[#FFD100]">{result.bookingNumber}</strong>
        </div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => setResult(null)}>حجز سيارة أخرى</Button>
          <Link href="/" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-[#343943] px-4 text-sm font-bold">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <section className="panel rounded-3xl p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#FFD100] font-black text-[#111]">1</span>
          <div><h2 className="text-lg font-black">بيانات العميل</h2><p className="text-xs text-[#8f96a3]">للتواصل وتأكيد الموعد</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم الكامل"><Input name="customerName" autoComplete="name" placeholder="مثال: أحمد محمد" required minLength={2} maxLength={120} /></Field>
          <Field label="رقم الجوال"><Input name="phone" inputMode="tel" autoComplete="tel" placeholder="05xxxxxxxx" required /></Field>
        </div>
      </section>

      <section className="panel rounded-3xl p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#FFD100] font-black text-[#111]">2</span>
          <div><h2 className="text-lg font-black">بيانات السيارة</h2><p className="text-xs text-[#8f96a3]">تساعدنا على تجهيز الخدمة المناسبة</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الشركة">
            <Select name="vehicleMake" required defaultValue="">
              <option value="" disabled>اختر الشركة</option>
              {makes.map((make) => <option key={make} value={make}>{make}</option>)}
            </Select>
          </Field>
          <Field label="الموديل"><Input name="vehicleModel" placeholder="مثال: Camry" required maxLength={80} /></Field>
          <Field label="سنة الصنع"><Input name="vehicleYear" type="number" inputMode="numeric" min={1980} max={new Date().getFullYear() + 1} placeholder="2019" required /></Field>
          <Field label="رقم اللوحة" hint="اختياري"><Input name="plateNumber" placeholder="أ ب ج 1234" maxLength={30} /></Field>
        </div>
      </section>

      <section className="panel rounded-3xl p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#FFD100] font-black text-[#111]">3</span>
          <div><h2 className="text-lg font-black">الخدمة والمشكلة</h2><p className="text-xs text-[#8f96a3]">اكتب الأعراض كما تظهر لك</p></div>
        </div>
        <div className="grid gap-4">
          <Field label="الخدمة المطلوبة">
            <Select name="serviceCode" required defaultValue="computer-diagnostic">
              {services.map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}
            </Select>
          </Field>
          <Field label="وصف المشكلة" hint="اذكر متى تظهر المشكلة، اللمبات، الأصوات، وأي إصلاح سابق">
            <Textarea name="complaint" required minLength={5} maxLength={1500} placeholder="مثال: السيارة تقطع على الوقوف وتظهر لمبة المكينة أحيانًا..." />
          </Field>
        </div>
      </section>

      <section className="panel rounded-3xl p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#FFD100] font-black text-[#111]">4</span>
          <div><h2 className="text-lg font-black">الموعد المفضل</h2><p className="text-xs text-[#8f96a3]">يصبح الموعد نهائيًا بعد تأكيد المركز</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="التاريخ"><Input name="preferredDate" type="date" min={minDate} required /></Field>
          <Field label="الوقت"><Input name="preferredTime" type="time" min="08:00" max="22:00" required /></Field>
        </div>
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#31363e] bg-[#14161a] p-4 text-sm leading-6 text-[#c5c9d0]">
        <input name="consent" type="checkbox" required className="mt-1 size-4 accent-[#FFD100]" />
        <span>أوافق على استخدام البيانات لإدارة الحجز والخدمة والتواصل المتعلق بها.</span>
      </label>

      {error ? <div role="alert" className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}

      <div className="sticky bottom-22 z-30 rounded-2xl border border-[#343943] bg-[#101216]/95 p-3 shadow-2xl backdrop-blur-xl md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? <><Loader2 className="animate-spin" size={20} /> جارٍ إرسال الحجز</> : <><CalendarCheck size={20} /> إرسال طلب الحجز <ChevronLeft size={18} /></>}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-[#7f8793]"><ShieldCheck size={15} /> لا يتم تخزين أي معلومات دفع داخل النظام.</div>
    </form>
  );
}
