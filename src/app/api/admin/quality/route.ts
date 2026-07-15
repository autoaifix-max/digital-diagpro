import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { qualityCheckSchema } from "@/lib/domain/validators";

export async function GET() {
  const context = await getStaffApiContext(["admin", "technician"]);
  if (!context) return apiError("غير مصرح", 401);

  const [checksResult, ordersResult] = await Promise.all([
    context.supabase
      .from("quality_checks")
      .select(`
        id, work_order_id, status, checklist, notes, checked_at, created_at, updated_at,
        work_orders!inner(work_order_number, status, complaint, customers!inner(full_name, phone), vehicles!inner(make, model, model_year, plate_number))
      `)
      .order("updated_at", { ascending: false })
      .limit(300),
    context.supabase
      .from("work_orders")
      .select(`
        id, work_order_number, complaint, status, updated_at,
        customers!inner(full_name, phone), vehicles!inner(make, model, model_year, plate_number),
        quality_checks(id, status, checklist, notes, checked_at)
      `)
      .in("status", ["in_progress", "quality_check", "ready"])
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);

  if (checksResult.error) return apiError("تعذر تحميل فحوص الجودة", 500, checksResult.error.message);
  if (ordersResult.error) return apiError("تعذر تحميل أوامر العمل", 500, ordersResult.error.message);
  return apiSuccess({ checks: checksResult.data ?? [], workOrders: ordersResult.data ?? [] });
}

export async function POST(request: Request) {
  const context = await getStaffApiContext(["admin", "technician"]);
  if (!context) return apiError("غير مصرح", 401);

  const body = await request.json().catch(() => null);
  const parsed = qualityCheckSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من قائمة فحص الجودة", 422, parsed.error.flatten());

  const { data, error } = await context.supabase.rpc("save_quality_check", {
    p_work_order_id: parsed.data.workOrderId,
    p_status: parsed.data.status,
    p_checklist: parsed.data.checklist,
    p_notes: parsed.data.notes || null,
  });

  if (error) return apiError("تعذر حفظ فحص الجودة", 409, error.message);
  return apiSuccess(data);
}
