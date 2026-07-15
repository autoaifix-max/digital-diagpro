import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const { id } = await params;
  const { data, error } = await context.supabase.rpc("convert_booking_to_work_order", {
    p_booking_id: id,
  });

  if (error) return apiError("تعذر تحويل الحجز إلى أمر عمل", 409, error.message);
  return apiSuccess(data, 201);
}
