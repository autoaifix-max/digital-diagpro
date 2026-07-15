import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { approvalRequestSchema } from "@/lib/domain/validators";

export async function GET() {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const [approvalsResult, ordersResult] = await Promise.all([
    context.supabase
      .from("work_order_approvals")
      .select(`
        id, work_order_id, customer_id, requested_amount, items_summary, status,
        channel, response_note, customer_visible, requested_at, responded_at, created_at, updated_at,
        customers!inner(full_name, phone),
        work_orders!inner(work_order_number, status, vehicle_id, vehicles!inner(make, model, model_year, plate_number))
      `)
      .order("requested_at", { ascending: false })
      .limit(300),
    context.supabase
      .from("work_orders")
      .select(`
        id, work_order_number, customer_id, vehicle_id, complaint, status, grand_total,
        customers!inner(full_name, phone), vehicles!inner(make, model, model_year, plate_number),
        work_order_approvals(id, status)
      `)
      .in("status", ["diagnosing", "waiting_approval"])
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);

  if (approvalsResult.error) return apiError("تعذر تحميل الموافقات", 500, approvalsResult.error.message);
  if (ordersResult.error) return apiError("تعذر تحميل أوامر العمل", 500, ordersResult.error.message);
  return apiSuccess({ approvals: approvalsResult.data ?? [], workOrders: ordersResult.data ?? [] });
}

export async function POST(request: Request) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const body = await request.json().catch(() => null);
  const parsed = approvalRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات طلب الموافقة", 422, parsed.error.flatten());

  const { data, error } = await context.supabase.rpc("create_approval_request", {
    p_work_order_id: parsed.data.workOrderId,
    p_requested_amount: parsed.data.requestedAmount,
    p_items_summary: parsed.data.itemsSummary,
    p_channel: parsed.data.channel,
    p_customer_visible: parsed.data.customerVisible,
  });

  if (error) return apiError("تعذر إنشاء طلب الموافقة", 409, error.message);
  return apiSuccess(data, 201);
}
