"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CarFront, Loader2, Phone, RefreshCw, Search, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { bookingStatusLabels, priorityLabels } from "@/lib/domain/labels";
import { bookingTransitions } from "@/lib/domain/transitions";
import type { BookingStatus, Priority, WorkOrderStatus } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/utils";

type BookingRow = {
  id: string;
  booking_number: string;
  service_code: string;
  complaint: string;
  preferred_at: string;
  confirmed_at: string | null;
  status: BookingStatus;
  priority: Priority;
  source: string;
  customer_id: string;
  vehicle_id: string;
  customers: { id: string; full_name: string; phone: string; email: string | null };
  vehicles: { id: string; make: string; model: string; model_year: number; plate_number: string | null; vin: string | null; mileage: number | null };
  work_orders: Array<{ id: string; work_order_number: string; status: WorkOrderStatus }>;
};

const statuses: Array<BookingStatus | "all"> = ["all", "new", "confirmed", "arrived", "in_diagnosis", "waiting_approval", "approved", "in_service", "completed", "cancelled", "no_show"];

function statusTone(status: BookingStatus) {
  if (status === "new") return "brand" as const;
  if (status === "completed") return "success" as const;
  if (status === "cancelled" || status === "no_show") return "danger" as const;
  if (status === "waiting_approval") return "warning" as const;
  return "neutral" as const;
}

export function BookingsBoard() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    if (date) params.set("date", date);

    try {
      const response = await fetch(`/api/admin/bookings?${params.toString()}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر التحميل");
      setRows(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل الحجوزات");
    } finally {
      setLoading(false);
    }
  }, [date, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function changeStatus(id: string, nextStatus: BookingStatus) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر تغيير الحالة");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تغيير الحالة");
    } finally {
      setBusyId(null);
    }
  }

  async function convert(id: string) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/bookings/${id}/convert`, { method: "POST" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر إنشاء أمر العمل");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء أمر العمل");
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {}), [rows]);

  return (
    <div>
      <div className="panel mb-5 grid gap-3 rounded-2xl p-4 lg:grid-cols-[1fr_190px_180px_auto]">
        <div className="relative"><Search className="pointer-events-none absolute right-3 top-3.5 text-[#707783]" size={18} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث برقم الحجز أو وصف المشكلة" className="pr-10" /></div>
        <Select value={status} onChange={(event) => setStatus(event.target.value as BookingStatus | "all")}>
          {statuses.map((item) => <option key={item} value={item}>{item === "all" ? "كل الحالات" : `${bookingStatusLabels[item]}${counts[item] ? ` (${counts[item]})` : ""}`}</option>)}
        </Select>
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={17} /> تحديث</Button>
      </div>

      {error ? <div role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}
      {loading ? <LoadingBlock label="تحميل الحجوزات..." /> : rows.length === 0 ? <EmptyState title="لا توجد حجوزات مطابقة" description="غيّر الفلاتر أو انتظر وصول حجوزات جديدة من الموقع." /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((row) => {
            const order = row.work_orders?.[0];
            const next = bookingTransitions[row.status];
            return (
              <article key={row.id} className="panel rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><strong className="text-base">{row.customers.full_name}</strong><Badge tone={statusTone(row.status)}>{bookingStatusLabels[row.status]}</Badge>{row.priority === "urgent" ? <Badge tone="danger">{priorityLabels[row.priority]}</Badge> : null}</div>
                    <p className="mt-1 text-xs text-[#7f8793]">{row.booking_number}</p>
                  </div>
                  <div className="text-left text-xs text-[#8f96a3]"><CalendarDays className="mb-1 inline text-[#FFD100]" size={16} /> {formatDateTime(row.preferred_at)}</div>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-[#111318] p-4 sm:grid-cols-2">
                  <div className="flex gap-3"><CarFront className="mt-0.5 shrink-0 text-[#FFD100]" size={18} /><div><strong className="block text-sm">{row.vehicles.make} {row.vehicles.model} {row.vehicles.model_year}</strong><span className="text-xs text-[#7f8793]">{row.vehicles.plate_number || "بدون لوحة مسجلة"}</span></div></div>
                  <a href={`tel:${row.customers.phone}`} className="flex gap-3"><Phone className="mt-0.5 shrink-0 text-[#FFD100]" size={18} /><div><strong dir="ltr" className="block text-sm">{row.customers.phone}</strong><span className="text-xs text-[#7f8793]">اتصال بالعميل</span></div></a>
                </div>

                <div className="mt-4"><span className="text-xs font-bold text-[#8f96a3]">شكوى العميل</span><p className="mt-1 line-clamp-3 text-sm leading-7 text-[#d8dbe0]">{row.complaint}</p></div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/6 pt-4">
                  {order ? <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 text-xs font-bold text-emerald-200"><Wrench size={16} /> {order.work_order_number}</span> : <Button size="sm" onClick={() => void convert(row.id)} disabled={busyId === row.id}>{busyId === row.id ? <Loader2 className="animate-spin" size={16} /> : <Wrench size={16} />} إنشاء أمر عمل</Button>}
                  {next.length ? (
                    <Select className="min-h-10 w-auto min-w-40 py-0 text-sm" defaultValue="" disabled={busyId === row.id} onChange={(event) => { const value = event.target.value as BookingStatus; if (value) void changeStatus(row.id, value); event.currentTarget.value = ""; }}>
                      <option value="" disabled>تغيير الحالة إلى...</option>
                      {next.map((item) => <option key={item} value={item}>{bookingStatusLabels[item]}</option>)}
                    </Select>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
