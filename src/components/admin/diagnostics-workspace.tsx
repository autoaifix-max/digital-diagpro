"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, FilePlus2, Loader2, RefreshCw, Save, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { diagnosticStatusLabels } from "@/lib/domain/labels";
import type { DiagnosticStatus, WorkOrderStatus } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/utils";

type DiagnosticItem = {
  id: string;
  item_type: string;
  code: string | null;
  title: string;
  interpretation: string | null;
  sort_order: number;
};

type DiagnosticReport = {
  id: string;
  report_number: string;
  work_order_id: string;
  customer_id: string;
  vehicle_id: string;
  title: string;
  complaint: string;
  status: DiagnosticStatus;
  findings: string | null;
  recommendations: string | null;
  technician_conclusion: string | null;
  customer_summary: string | null;
  customer_visible: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  customers: { full_name: string; phone: string };
  vehicles: { make: string; model: string; model_year: number; plate_number: string | null };
  work_orders: { work_order_number: string; status: WorkOrderStatus };
  diagnostic_items: DiagnosticItem[];
};

type WorkOrderOption = {
  id: string;
  work_order_number: string;
  customer_id: string;
  vehicle_id: string;
  complaint: string;
  status: WorkOrderStatus;
  customers: { full_name: string };
  vehicles: { make: string; model: string; model_year: number };
};

type EditorState = {
  id?: string;
  workOrderId: string;
  title: string;
  complaint: string;
  dtcText: string;
  findings: string;
  recommendations: string;
  technicianConclusion: string;
  customerSummary: string;
  status: DiagnosticStatus;
  customerVisible: boolean;
};

const blank: EditorState = {
  workOrderId: "",
  title: "تقرير تشخيص المركبة",
  complaint: "",
  dtcText: "",
  findings: "",
  recommendations: "",
  technicianConclusion: "",
  customerSummary: "",
  status: "draft",
  customerVisible: false,
};

function parseDtcs(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [code, ...rest] = line.split("|");
      return { code: code.trim().toUpperCase(), description: rest.join("|").trim() };
    });
}

function reportToEditor(report: DiagnosticReport): EditorState {
  return {
    id: report.id,
    workOrderId: report.work_order_id,
    title: report.title,
    complaint: report.complaint,
    dtcText: report.diagnostic_items.filter((item) => item.item_type === "dtc").sort((a, b) => a.sort_order - b.sort_order).map((item) => `${item.code ?? ""}${item.interpretation ? ` | ${item.interpretation}` : ""}`).join("\n"),
    findings: report.findings ?? "",
    recommendations: report.recommendations ?? "",
    technicianConclusion: report.technician_conclusion ?? "",
    customerSummary: report.customer_summary ?? "",
    status: report.status,
    customerVisible: report.customer_visible,
  };
}

export function DiagnosticsWorkspace() {
  const searchParams = useSearchParams();
  const requestedWorkOrderId = searchParams.get("workOrderId") ?? "";
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [editor, setEditor] = useState<EditorState>({ ...blank, workOrderId: requestedWorkOrderId });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/diagnostics", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر التحميل");
      setReports(body.data.reports);
      setWorkOrders(body.data.workOrders);
      const selected = body.data.reports.find((report: DiagnosticReport) => report.work_order_id === requestedWorkOrderId);
      if (selected) setEditor(reportToEditor(selected));
      else if (requestedWorkOrderId) {
        const order = body.data.workOrders.find((item: WorkOrderOption) => item.id === requestedWorkOrderId);
        if (order) setEditor((current) => ({ ...current, workOrderId: order.id, complaint: order.complaint }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل التشخيصات");
    } finally {
      setLoading(false);
    }
  }, [requestedWorkOrderId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedOrder = useMemo(() => workOrders.find((item) => item.id === editor.workOrderId), [editor.workOrderId, workOrders]);

  function chooseOrder(id: string) {
    const order = workOrders.find((item) => item.id === id);
    const existing = reports.find((report) => report.work_order_id === id);
    if (existing) setEditor(reportToEditor(existing));
    else setEditor({ ...blank, workOrderId: id, complaint: order?.complaint ?? "" });
    setSuccess("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const selected = workOrders.find((item) => item.id === editor.workOrderId);
    if (!selected) {
      setError("اختر أمر عمل أولًا.");
      setSaving(false);
      return;
    }

    const payload = editor.id
      ? {
          title: editor.title,
          complaint: editor.complaint,
          dtcs: parseDtcs(editor.dtcText),
          findings: editor.findings,
          recommendations: editor.recommendations,
          technicianConclusion: editor.technicianConclusion,
          customerSummary: editor.customerSummary,
          status: editor.status,
          customerVisible: editor.customerVisible,
        }
      : {
          workOrderId: editor.workOrderId,
          customerId: selected.customer_id,
          vehicleId: selected.vehicle_id,
          title: editor.title,
          complaint: editor.complaint,
          dtcs: parseDtcs(editor.dtcText),
          findings: editor.findings,
          recommendations: editor.recommendations,
          status: editor.status,
        };

    try {
      const response = await fetch(editor.id ? `/api/admin/diagnostics/${editor.id}` : "/api/admin/diagnostics", {
        method: editor.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? "تعذر حفظ التقرير");
      setSuccess(editor.id ? "تم تحديث تقرير التشخيص." : "تم إنشاء تقرير التشخيص.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ التقرير");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock label="تحميل مساحة التشخيص..." />;

  return (
    <div className="grid gap-5 2xl:grid-cols-[330px_1fr]">
      <aside className="panel h-fit rounded-2xl p-4 2xl:sticky 2xl:top-23">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black">التقارير</h2><p className="text-xs text-[#7f8793]">{reports.length} تقرير</p></div><Button size="sm" variant="secondary" onClick={() => void load()}><RefreshCw size={15} /></Button></div>
        <Select value={editor.workOrderId} onChange={(event) => chooseOrder(event.target.value)}>
          <option value="">اختر أمر عمل...</option>
          {workOrders.map((order) => <option key={order.id} value={order.id}>{order.work_order_number} — {order.customers.full_name}</option>)}
        </Select>
        <div className="mt-4 grid max-h-[56vh] gap-2 overflow-y-auto pl-1">
          {reports.map((report) => (
            <button key={report.id} onClick={() => setEditor(reportToEditor(report))} className={`focus-ring rounded-xl border p-3 text-right ${editor.id === report.id ? "border-[#FFD100]/50 bg-[#FFD100]/8" : "border-white/6 bg-[#111318] hover:bg-white/[0.04]"}`}>
              <div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{report.report_number}</strong>{report.customer_visible ? <Eye size={15} className="shrink-0 text-emerald-300" /> : <EyeOff size={15} className="shrink-0 text-[#737b87]" />}</div>
              <p className="mt-1 truncate text-xs text-[#8f96a3]">{report.customers.full_name} — {report.vehicles.make} {report.vehicles.model}</p>
              <div className="mt-2"><Badge tone={report.status === "completed" ? "success" : report.status === "in_progress" ? "brand" : "neutral"}>{diagnosticStatusLabels[report.status]}</Badge></div>
            </button>
          ))}
          {!reports.length ? <EmptyState title="لا توجد تقارير" description="اختر أمر عمل وأنشئ أول تقرير تشخيص." /> : null}
        </div>
      </aside>

      <section className="panel rounded-2xl p-5 sm:p-7">
        {!editor.workOrderId ? (
          <EmptyState title="اختر أمر عمل" description="يُربط كل تقرير تشخيص بأمر عمل وعميل وسيارة محددين." action={<span className="inline-flex items-center gap-2 text-sm font-bold text-[#FFD100]"><FilePlus2 size={18} /> ابدأ من القائمة</span>} />
        ) : (
          <form onSubmit={save} className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/6 pb-5">
              <div><div className="flex items-center gap-2 text-[#FFD100]"><ScanLine size={19} /><span className="text-xs font-bold">{editor.id ? "تحرير تقرير" : "تقرير جديد"}</span></div><h2 className="mt-2 text-xl font-black">{selectedOrder?.work_order_number ?? "أمر العمل"}</h2><p className="mt-1 text-xs text-[#8f96a3]">{selectedOrder ? `${selectedOrder.customers.full_name} — ${selectedOrder.vehicles.make} ${selectedOrder.vehicles.model} ${selectedOrder.vehicles.model_year}` : ""}</p></div>
              {editor.id ? <div className="text-left text-xs text-[#7f8793]">آخر تعديل<br />{reports.find((item) => item.id === editor.id)?.updated_at ? formatDateTime(reports.find((item) => item.id === editor.id)!.updated_at) : ""}</div> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان التقرير"><Input value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} required minLength={3} /></Field>
              <Field label="حالة التقرير"><Select value={editor.status} onChange={(event) => { const status = event.target.value as DiagnosticStatus; setEditor({ ...editor, status, customerVisible: status === "completed" ? editor.customerVisible : false }); }}><option value="draft">مسودة</option><option value="in_progress">قيد التشخيص</option><option value="completed">مكتمل</option></Select></Field>
            </div>

            <Field label="شكوى العميل"><Textarea value={editor.complaint} onChange={(event) => setEditor({ ...editor, complaint: event.target.value })} required /></Field>
            <Field label="أكواد الأعطال DTC" hint="كل كود في سطر: P0300 | Random/Multiple Cylinder Misfire"><Textarea value={editor.dtcText} onChange={(event) => setEditor({ ...editor, dtcText: event.target.value })} dir="ltr" placeholder="P0300 | Random/Multiple Cylinder Misfire\nP0171 | System Too Lean Bank 1" /></Field>
            <Field label="نتائج الفحص والقياسات"><Textarea value={editor.findings} onChange={(event) => setEditor({ ...editor, findings: event.target.value })} placeholder="اكتب القراءات والاختبارات والنتائج المؤكدة..." /></Field>
            <Field label="التوصيات وخطوات الإصلاح"><Textarea value={editor.recommendations} onChange={(event) => setEditor({ ...editor, recommendations: event.target.value })} placeholder="الاختبارات التالية أو الإصلاح المقترح مع ترتيب الأولوية..." /></Field>

            {editor.id ? (
              <>
                <Field label="خلاصة الفني"><Textarea value={editor.technicianConclusion} onChange={(event) => setEditor({ ...editor, technicianConclusion: event.target.value })} placeholder="الحكم الفني النهائي وحدود التأكد..." /></Field>
                <Field label="ملخص مبسط للعميل"><Textarea value={editor.customerSummary} onChange={(event) => setEditor({ ...editor, customerSummary: event.target.value })} placeholder="شرح واضح بدون مصطلحات معقدة..." /></Field>
                <label className="flex items-start gap-3 rounded-2xl border border-[#343943] bg-[#111318] p-4 text-sm"><input type="checkbox" checked={editor.customerVisible} disabled={editor.status !== "completed"} onChange={(event) => setEditor({ ...editor, customerVisible: event.target.checked })} className="mt-1 size-4 accent-[#FFD100]" /><span><strong className="block">إظهار التقرير في بوابة العميل</strong><span className="mt-1 block text-xs leading-6 text-[#8f96a3]">يتفعّل فقط عندما تكون حالة التقرير «مكتمل» وبعد مراجعته.</span></span></label>
              </>
            ) : null}

            {error ? <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}
            {success ? <div className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200"><CheckCircle2 size={18} /> {success}</div> : null}

            <div className="flex flex-wrap gap-3 border-t border-white/6 pt-5">
              <Button type="submit" size="lg" disabled={saving}>{saving ? <><Loader2 size={19} className="animate-spin" /> جارٍ الحفظ</> : <><Save size={19} /> حفظ تقرير التشخيص</>}</Button>
              {editor.id && editor.customerVisible ? <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/8 px-4 text-sm font-bold text-emerald-200"><Eye size={17} /> ظاهر للعميل</span> : null}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
