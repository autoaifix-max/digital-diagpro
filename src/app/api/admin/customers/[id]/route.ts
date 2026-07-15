import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { customerPatchSchema } from "@/lib/domain/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = customerPatchSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات العميل", 422, parsed.error.flatten());

  const { data, error } = await context.supabase
    .from("customers")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      is_active: parsed.data.isActive,
    })
    .eq("id", id)
    .eq("workshop_id", context.profile.workshop_id)
    .select("id, full_name, phone, email, notes, is_active, created_at, updated_at")
    .single();

  if (error?.code === "23505") return apiError("يوجد عميل مسجل بنفس رقم الجوال", 409);
  if (error) return apiError("تعذر تحديث العميل", 500, error.message);
  return apiSuccess(data);
}
