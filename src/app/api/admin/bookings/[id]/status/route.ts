import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { bookingStatusPatchSchema } from "@/lib/domain/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bookingStatusPatchSchema.safeParse(body);
  if (!parsed.success) return apiError("بيانات الحالة غير صحيحة", 422, parsed.error.flatten());

  const { data, error } = await context.supabase.rpc("set_booking_status", {
    p_booking_id: id,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
  });

  if (error) return apiError("تعذر تغيير الحالة. تحقق من تسلسل الحالات.", 409, error.message);
  return apiSuccess(data);
}
