import { apiError, apiSuccess } from "@/lib/api/responses";
import { getAuthenticatedUser } from "@/lib/auth/guards";
import { customerApprovalDecisionSchema } from "@/lib/domain/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return apiError("يلزم تسجيل الدخول", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = customerApprovalDecisionSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من القرار", 422, parsed.error.flatten());

  const { data, error } = await supabase.rpc("customer_decide_approval", {
    p_approval_id: id,
    p_status: parsed.data.status,
    p_response_note: parsed.data.responseNote || null,
  });

  if (error) return apiError("تعذر تسجيل القرار", 409, error.message);
  return apiSuccess(data);
}
