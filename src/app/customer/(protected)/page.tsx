import type { Metadata } from "next";
import { CalendarClock, CarFront, CheckCircle2, ClipboardList, Download, FileSearch, FileText, Gauge, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CustomerApprovals, type CustomerApprovalRow } from "@/components/customer/customer-approvals";
import { ChangePasswordForm } from "@/components/customer/change-password-form";
import { EmptyState } from "@/components/ui/empty-state";
import { getAuthenticatedUser } from "@/lib/auth/guards";
import { bookingStatusLabels, diagnosticStatusLabels, documentTypeLabels, workOrderStatusLabels } from "@/lib/domain/labels";
import type { BookingStatus, DiagnosticStatus, DocumentType, WorkOrderStatus } from "@/lib/domain/types";
import { formatDateTime, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "حساب العميل" };

type Vehicle = { id: string; make: string; model: string; model_year: number; plate_number: string | null; vin: string | null; mileage: number | null };
type Booking = { id: string; booking_number: string; service_code: string; complaint: string; preferred_at: string; status: BookingStatus; vehicles: Vehicle | null };
type WorkOrder = { id: string; work_order_number: string; complaint: string; status: WorkOrderStatus; grand_total: number; opened_at: string; completed_at: string | null; delivered_at: string | null; vehicles: Vehicle | null };
type Diagnostic = { id: string; report_number: string; title: string; complaint: string; status: DiagnosticStatus; findings: string | null; recommendations: string | null; customer_summary: string | null; completed_at: string | null; vehicles: Vehicle | null; diagnostic_items: Array<{ id: string; code: string | null; title: string; interpretation: string | null; item_type: string; sort_order: number }> };
type Document = { id: string; title: string; document_type: DocumentType; file_name: string; mime_type: string; size_bytes: number; created_at: string; vehicles: Vehicle | null; work_orders: { work_order_number: string } | null };

function orderProgress(status: WorkOrderStatus) {
  const sequence: WorkOrderStatus[] = ["open", "diagnosing", "waiting_approval", "approved", "in_progress", "quality_check", "ready", "delivered"];
  const index = sequence.indexOf(status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / sequence.length) * 100);
}

export default async function CustomerPortalPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: account } = await supabase.from("customer_accounts").select("customer_id, display_name, phone_last4").eq("auth_user_id", user!.id).single();

  if (!account) return null;

  const [customerResult, vehiclesResult, bookingsResult, ordersResult, diagnosticsResult, documentsResult, approvalsResult] = await Promise.all([
    supabase.from("customers").select("id, full_name, phone, email, created_at").eq("id", account.customer_id).single(),
    supabase.from("vehicles").select("id, make, model, model_year, plate_number, vin, mileage").order("updated_at", { ascending: false }),
    supabase.from("bookings").select("id, booking_number, service_code, complaint, preferred_at, status, vehicles(id, make, model, model_year, plate_number, vin, mileage)").order("created_at", { ascending: false }).limit(20),
    supabase.from("work_orders").select("id, work_order_number, complaint, status, grand_total, opened_at, completed_at, delivered_at, vehicles(id, make, model, model_year, plate_number, vin, mileage)").order("created_at", { ascending: false }).limit(20),
    supabase.from("diagnostic_reports").select("id, report_number, title, complaint, status, findings, recommendations, customer_summary, completed_at, vehicles(id, make, model, model_year, plate_number, vin, mileage), diagnostic_items(id, code, title, interpretation, item_type, sort_order)").eq("customer_visible", true).order("created_at", { ascending: false }).limit(20),
    supabase.from("customer_documents").select("id, title, document_type, file_name, mime_type, size_bytes, created_at, vehicles(id, make, model, model_year, plate_number, vin, mileage), work_orders(work_order_number)").eq("customer_visible", true).order("created_at", { ascending: false }).limit(50),
    supabase.from("work_order_approvals").select("id, requested_amount, items_summary, status, channel, response_note, requested_at, responded_at, work_orders!inner(work_order_number, vehicles!inner(make, model, model_year))").eq("customer_visible", true).order("requested_at", { ascending: false }).limit(30),
  ]);

  const customer = customerResult.data;
  const vehicles = (vehiclesResult.data ?? []) as unknown as Vehicle[];
  const bookings = (bookingsResult.data ?? []) as unknown as Booking[];
  const orders = (ordersResult.data ?? []) as unknown as WorkOrder[];
  const diagnostics = (diagnosticsResult.data ?? []) as unknown as Diagnostic[];
  const documents = (documentsResult.data ?? []) as unknown as Document[];
  const approvals = (approvalsResult.data ?? []) as unknown as CustomerApprovalRow[];
  const activeOrder = orders.find((order) => !["delivered", "cancelled"].includes(order.status));

  return (
    <>
      <section className="mb-8">
        <span className="text-sm font-bold text-[#FFD100]">بوابة العميل</span>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">مرحبًا، {customer?.full_name ?? account.display_name}</h1>
        <p className="mt-3 text-sm leading-7 text-[#9ca3af]">هنا تظهر الحالات والتقارير والمستندات التي اعتمد المركز مشاركتها معك.</p>
      </section>

      {activeOrder ? (
        <section className="panel mb-7 rounded-3xl border-[#FFD100]/25 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="flex items-center gap-2 text-[#FFD100]"><Gauge size={19} /><span className="text-xs font-bold">السيارة داخل مسار العمل</span></div><h2 className="mt-2 text-xl font-black">{activeOrder.vehicles ? `${activeOrder.vehicles.make} ${activeOrder.vehicles.model} ${activeOrder.vehicles.model_year}` : "سيارتك"}</h2><p className="mt-1 text-xs text-[#7f8793]">{activeOrder.work_order_number}</p></div>
            <Badge tone={activeOrder.status === "ready" ? "success" : activeOrder.status === "waiting_approval" ? "warning" : "brand"}>{workOrderStatusLabels[activeOrder.status]}</Badge>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[#FFD100]" style={{ width: `${orderProgress(activeOrder.status)}%` }} /></div>
          <div className="mt-2 flex justify-between text-[11px] text-[#737b87]"><span>الاستلام</span><span>التشخيص</span><span>الإصلاح</span><span>الجودة</span><span>التسليم</span></div>
          <p className="mt-5 text-sm leading-7 text-[#c6cad1]">{activeOrder.complaint}</p>
          <div className="mt-4 text-sm"><span className="text-[#8f96a3]">الإجمالي المسجل: </span><strong className="text-[#FFD100]">{formatMoney(activeOrder.grand_total)}</strong></div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel rounded-2xl p-5"><CarFront className="text-[#FFD100]" /><strong className="mt-4 block text-3xl font-black">{vehicles.length}</strong><span className="text-xs text-[#7f8793]">مركبات مرتبطة</span></div>
        <div className="panel rounded-2xl p-5"><CalendarClock className="text-[#FFD100]" /><strong className="mt-4 block text-3xl font-black">{bookings.length}</strong><span className="text-xs text-[#7f8793]">حجوزات</span></div>
        <div className="panel rounded-2xl p-5"><ClipboardList className="text-[#FFD100]" /><strong className="mt-4 block text-3xl font-black">{orders.length}</strong><span className="text-xs text-[#7f8793]">أوامر عمل</span></div>
        <div className="panel rounded-2xl p-5"><FileText className="text-[#FFD100]" /><strong className="mt-4 block text-3xl font-black">{documents.length}</strong><span className="text-xs text-[#7f8793]">مستندات متاحة</span></div>
      </section>

      <section className="mt-9 grid gap-7 xl:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-black">أوامر العمل</h2>
          {orders.length ? <div className="grid gap-3">{orders.map((order) => <article key={order.id} className="panel rounded-2xl p-5"><div className="flex items-start justify-between gap-3"><div><strong>{order.work_order_number}</strong><p className="mt-1 text-xs text-[#7f8793]">{order.vehicles ? `${order.vehicles.make} ${order.vehicles.model} ${order.vehicles.model_year}` : "سيارة"} • {formatDateTime(order.opened_at)}</p></div><Badge tone={order.status === "delivered" || order.status === "ready" ? "success" : order.status === "waiting_approval" ? "warning" : "neutral"}>{workOrderStatusLabels[order.status]}</Badge></div><p className="mt-4 text-sm leading-7 text-[#c4c8cf]">{order.complaint}</p></article>)}</div> : <EmptyState title="لا توجد أوامر عمل" description="ستظهر أوامر العمل بعد وصول السيارة وفتح أمر تشغيل." />}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-black">الحجوزات</h2>
          {bookings.length ? <div className="grid gap-3">{bookings.map((booking) => <article key={booking.id} className="panel rounded-2xl p-5"><div className="flex items-start justify-between gap-3"><div><strong>{booking.booking_number}</strong><p className="mt-1 text-xs text-[#7f8793]">{formatDateTime(booking.preferred_at)}</p></div><Badge tone={booking.status === "completed" ? "success" : booking.status === "cancelled" ? "danger" : booking.status === "new" ? "brand" : "neutral"}>{bookingStatusLabels[booking.status]}</Badge></div><p className="mt-4 text-sm leading-7 text-[#c4c8cf]">{booking.complaint}</p></article>)}</div> : <EmptyState title="لا توجد حجوزات" description="يمكنك إرسال طلب حجز جديد من الموقع العام." />}
        </div>
      </section>

      <CustomerApprovals approvals={approvals} />

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2"><FileSearch className="text-[#FFD100]" /><h2 className="text-xl font-black">تقارير التشخيص</h2></div>
        {diagnostics.length ? <div className="grid gap-4 lg:grid-cols-2">{diagnostics.map((report) => <article key={report.id} className="panel rounded-2xl p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{report.title}</strong><p className="mt-1 text-xs text-[#7f8793]">{report.report_number}</p></div><Badge tone={report.status === "completed" ? "success" : "brand"}>{diagnosticStatusLabels[report.status]}</Badge></div>{report.customer_summary ? <div className="mt-5 rounded-xl border border-[#FFD100]/15 bg-[#FFD100]/6 p-4"><span className="text-xs font-bold text-[#FFD100]">الخلاصة</span><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#e1e3e7]">{report.customer_summary}</p></div> : null}{report.diagnostic_items.filter((item) => item.item_type === "dtc").length ? <div className="mt-4"><span className="text-xs font-bold text-[#8f96a3]">أكواد الأعطال</span><div className="mt-2 flex flex-wrap gap-2">{report.diagnostic_items.filter((item) => item.item_type === "dtc").map((item) => <span key={item.id} dir="ltr" className="rounded-lg border border-red-400/20 bg-red-400/8 px-2.5 py-1 text-xs font-bold text-red-200">{item.code}</span>)}</div></div> : null}{report.findings ? <div className="mt-4"><span className="text-xs font-bold text-[#8f96a3]">النتائج</span><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#c9cdd3]">{report.findings}</p></div> : null}{report.recommendations ? <div className="mt-4"><span className="text-xs font-bold text-[#8f96a3]">التوصيات</span><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#c9cdd3]">{report.recommendations}</p></div> : null}</article>)}</div> : <EmptyState title="لا توجد تقارير متاحة" description="لا يظهر أي تقرير هنا إلا بعد مراجعة المركز وتفعيل مشاركته." />}
      </section>

      <section id="documents" className="mt-10 scroll-mt-24">
        <div className="mb-4 flex items-center gap-2"><FileText className="text-[#FFD100]" /><h2 className="text-xl font-black">المستندات</h2></div>
        {documents.length ? <div className="grid gap-3 sm:grid-cols-2">{documents.map((doc) => <article key={doc.id} className="panel flex items-start gap-4 rounded-2xl p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#FFD100]/10 text-[#FFD100]"><FileText size={20} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{doc.title}</strong><Badge>{documentTypeLabels[doc.document_type]}</Badge></div><p className="mt-1 truncate text-xs text-[#7f8793]">{doc.file_name} • {formatDateTime(doc.created_at)}</p><a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noreferrer" className="focus-ring mt-4 inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#FFD100] px-3 text-xs font-black text-[#111]"><Download size={15} /> فتح المستند</a></div></article>)}</div> : <EmptyState title="لا توجد مستندات متاحة" description="سيظهر التقرير أو عرض السعر أو الفاتورة بعد اعتماد مشاركته من المركز." />}
      </section>

      <section id="account" className="panel mt-10 scroll-mt-24 rounded-2xl p-5">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#FFD100]/10 text-[#FFD100]"><UserRound /></span><div><h2 className="font-black">بيانات الحساب</h2><p className="text-xs text-[#7f8793]">للعرض فقط. التعديل يتم عبر المركز.</p></div></div>
        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><span className="block text-xs text-[#7f8793]">الاسم</span><strong className="mt-1 block">{customer?.full_name ?? account.display_name}</strong></div><div><span className="block text-xs text-[#7f8793]">رقم الجوال</span><strong dir="ltr" className="mt-1 block text-right">{customer?.phone}</strong></div><div><span className="block text-xs text-[#7f8793]">حالة الحساب</span><strong className="mt-1 flex items-center gap-2 text-emerald-300"><CheckCircle2 size={16} /> مفعّل</strong></div></div>
      <ChangePasswordForm />
      </section>
    </>
  );
}
