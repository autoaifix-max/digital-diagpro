import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { workOrderStatusPatchSchema } from "@/lib/domain/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext();
  if (!context) return apiError("غير مصرح", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = workOrderStatusPatchSchema.safeParse(body);
  if (!parsed.success) return apiError("بيانات الحالة غير صحيحة", 422, parsed.error.flatten());

  const { data, error } = await context.supabase.rpc("set_work_order_status", {
    p_work_order_id: id,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
  });

  if (error) return apiError("تعذر تغيير الحالة. تحقق من تسلسل أمر العمل.", 409, error.message);
  return apiSuccess(data);
}
