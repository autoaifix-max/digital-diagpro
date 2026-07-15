import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { approvalDecisionSchema } from "@/lib/domain/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = approvalDecisionSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من قرار الموافقة", 422, parsed.error.flatten());

  const { data, error } = await context.supabase.rpc("decide_approval", {
    p_approval_id: id,
    p_status: parsed.data.status,
    p_channel: parsed.data.channel,
    p_response_note: parsed.data.responseNote || null,
  });

  if (error) return apiError("تعذر تسجيل قرار الموافقة", 409, error.message);
  return apiSuccess(data);
}
