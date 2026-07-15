import Link from "next/link";
import { CalendarCheck, ClipboardList, ScanLine, TimerReset } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { bookingStatusLabels, workOrderStatusLabels } from "@/lib/domain/labels";
import type { BookingStatus, WorkOrderStatus } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/utils";

type DashboardBooking = {
  id: string;
  booking_number: string;
  status: BookingStatus;
  preferred_at: string;
  customers: { full_name: string } | null;
  vehicles: { make: string; model: string; model_year: number } | null;
};

type DashboardOrder = {
  id: string;
  work_order_number: string;
  status: WorkOrderStatus;
  customers: { full_name: string } | null;
  vehicles: { make: string; model: string; model_year: number } | null;
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [todayBookings, activeOrders, waitingApproval, completedToday, upcomingResult, activeResult] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).gte("preferred_at", start.toISOString()).lt("preferred_at", end.toISOString()),
    supabase.from("work_orders").select("id", { count: "exact", head: true }).not("status", "in", '("delivered","cancelled")'),
    supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("status", "waiting_approval"),
    supabase.from("work_orders").select("id", { count: "exact", head: true }).gte("completed_at", start.toISOString()).lt("completed_at", end.toISOString()),
    supabase.from("bookings").select("id, booking_number, status, preferred_at, customers(full_name), vehicles(make, model, model_year)").gte("preferred_at", start.toISOString()).order("preferred_at", { ascending: true }).limit(6),
    supabase.from("work_orders").select("id, work_order_number, status, customers(full_name), vehicles(make, model, model_year)").not("status", "in", '("delivered","cancelled")').order("updated_at", { ascending: false }).limit(6),
  ]);

  const upcoming = (upcomingResult.data ?? []) as unknown as DashboardBooking[];
  const active = (activeResult.data ?? []) as unknown as DashboardOrder[];

  return (
    <>
      <PageHeader eyebrow="مركز العمليات" title="لوحة اليوم" description="ملخص مباشر للحجوزات والسيارات داخل مسار العمل." actions={<Link href="/admin/bookings" className="focus-ring inline-flex min-h-10 items-center rounded-xl bg-[#FFD100] px-4 text-sm font-black text-[#111]">إدارة الحجوزات</Link>} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="حجوزات اليوم" value={todayBookings.count ?? 0} hint="حسب الموعد المفضل" icon={CalendarCheck} />
        <StatCard label="أوامر نشطة" value={activeOrders.count ?? 0} hint="لم تُسلّم أو تُلغَ" icon={ClipboardList} />
        <StatCard label="بانتظار الموافقة" value={waitingApproval.count ?? 0} hint="تحتاج متابعة العميل" icon={TimerReset} />
        <StatCard label="اكتملت اليوم" value={completedToday.count ?? 0} hint="وصلت إلى الجاهزية" icon={ScanLine} />
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">الحجوزات القادمة</h2><Link href="/admin/bookings" className="text-xs font-bold text-[#FFD100]">عرض الكل</Link></div>
          {upcoming.length ? <div className="panel overflow-hidden rounded-2xl divide-y divide-white/6">{upcoming.map((item) => <Link href="/admin/bookings" key={item.id} className="flex items-center gap-3 p-4 hover:bg-white/[0.025]"><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.customers?.full_name ?? "عميل"} — {item.vehicles ? `${item.vehicles.make} ${item.vehicles.model} ${item.vehicles.model_year}` : "سيارة"}</strong><span className="mt-1 block text-xs text-[#7f8793]">{item.booking_number} • {formatDateTime(item.preferred_at)}</span></div><Badge tone={item.status === "new" ? "brand" : "neutral"}>{bookingStatusLabels[item.status]}</Badge></Link>)}</div> : <EmptyState title="لا توجد حجوزات قادمة" description="ستظهر الحجوزات الجديدة هنا بمجرد إرسالها من صفحة الحجز." />}
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">أوامر العمل النشطة</h2><Link href="/admin/work-orders" className="text-xs font-bold text-[#FFD100]">عرض الكل</Link></div>
          {active.length ? <div className="panel overflow-hidden rounded-2xl divide-y divide-white/6">{active.map((item) => <Link href="/admin/work-orders" key={item.id} className="flex items-center gap-3 p-4 hover:bg-white/[0.025]"><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.customers?.full_name ?? "عميل"} — {item.vehicles ? `${item.vehicles.make} ${item.vehicles.model}` : "سيارة"}</strong><span className="mt-1 block text-xs text-[#7f8793]">{item.work_order_number}</span></div><Badge tone={item.status === "waiting_approval" ? "warning" : item.status === "ready" ? "success" : "neutral"}>{workOrderStatusLabels[item.status]}</Badge></Link>)}</div> : <EmptyState title="لا توجد أوامر نشطة" description="حوّل الحجز إلى أمر عمل عند وصول السيارة لبدء المسار التشغيلي." />}
        </div>
      </section>
    </>
  );
}
