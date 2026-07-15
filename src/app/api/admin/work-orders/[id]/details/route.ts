import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { workOrderDetailsSchema } from "@/lib/domain/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("تعديل تفاصيل أمر العمل متاح للمدير والاستقبال فقط", 403);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = workOrderDetailsSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من تفاصيل أمر العمل", 422, parsed.error.flatten());

  const { data, error } = await context.supabase.rpc("update_work_order_details", {
    p_work_order_id: id,
    p_priority: parsed.data.priority,
    p_assigned_to: parsed.data.assignedTo || null,
    p_odometer_in: parsed.data.odometerIn === "" ? null : parsed.data.odometerIn,
    p_fuel_level_percent: parsed.data.fuelLevelPercent === "" ? null : parsed.data.fuelLevelPercent,
    p_promised_at: parsed.data.promisedAt ? new Date(parsed.data.promisedAt).toISOString() : null,
    p_labor_total: parsed.data.laborTotal,
    p_parts_total: parsed.data.partsTotal,
    p_discount_total: parsed.data.discountTotal,
    p_tax_total: parsed.data.taxTotal,
    p_approval_note: parsed.data.approvalNote || null,
    p_internal_notes: parsed.data.internalNotes || null,
  });

  if (error) return apiError("تعذر حفظ تفاصيل أمر العمل", 409);
  return apiSuccess(data);
}
