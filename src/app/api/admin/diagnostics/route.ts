import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { diagnosticCreateSchema } from "@/lib/domain/validators";

export async function GET() {
  const context = await getStaffApiContext(["admin", "technician"]);
  if (!context) return apiError("غير مصرح", 401);

  const [reportsResult, ordersResult] = await Promise.all([
    context.supabase
      .from("diagnostic_reports")
      .select(`
        id, report_number, work_order_id, customer_id, vehicle_id, title, complaint,
        status, findings, recommendations, technician_conclusion, customer_summary,
        customer_visible, completed_at, created_at, updated_at,
        customers!inner(full_name, phone),
        vehicles!inner(make, model, model_year, plate_number),
        work_orders!inner(work_order_number, status),
        diagnostic_items(id, item_type, code, title, interpretation, sort_order)
      `)
      .order("updated_at", { ascending: false })
      .limit(100),
    context.supabase
      .from("work_orders")
      .select("id, work_order_number, customer_id, vehicle_id, complaint, status, customers!inner(full_name), vehicles!inner(make, model, model_year)")
      .not("status", "in", '("delivered","cancelled")')
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  if (reportsResult.error) return apiError("تعذر تحميل تقارير التشخيص", 500, reportsResult.error.message);
  if (ordersResult.error) return apiError("تعذر تحميل أوامر العمل", 500, ordersResult.error.message);

  return apiSuccess({ reports: reportsResult.data ?? [], workOrders: ordersResult.data ?? [] });
}

export async function POST(request: Request) {
  const context = await getStaffApiContext(["admin", "technician"]);
  if (!context) return apiError("غير مصرح", 401);

  const body = await request.json().catch(() => null);
  const parsed = diagnosticCreateSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات تقرير التشخيص", 422, parsed.error.flatten());

  const data = parsed.data;
  const { data: report, error } = await context.supabase.rpc("create_diagnostic_report", {
    p_work_order_id: data.workOrderId,
    p_title: data.title,
    p_complaint: data.complaint,
    p_findings: data.findings,
    p_recommendations: data.recommendations,
    p_status: data.status,
    p_dtcs: data.dtcs,
  });

  if (error) return apiError("تعذر إنشاء تقرير التشخيص", 409, error.message);
  return apiSuccess(report, 201);
}
