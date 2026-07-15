import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { servicePatchSchema } from "@/lib/domain/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin"]);
  if (!context) return apiError("هذه العملية متاحة للمدير فقط", 403);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = servicePatchSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات الخدمة", 422, parsed.error.flatten());

  const { data, error } = await context.supabase
    .from("service_catalog")
    .update({
      name_ar: parsed.data.nameAr,
      description_ar: parsed.data.descriptionAr || null,
      base_price: parsed.data.basePrice === "" ? null : parsed.data.basePrice,
      estimated_minutes: parsed.data.estimatedMinutes === "" ? null : parsed.data.estimatedMinutes,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
    })
    .eq("id", id)
    .eq("workshop_id", context.profile.workshop_id)
    .select("id, code, name_ar, description_ar, base_price, estimated_minutes, is_active, sort_order, created_at, updated_at")
    .single();

  if (error?.code === "23505") return apiError("رمز الخدمة مستخدم مسبقًا", 409);
  if (error) return apiError("تعذر تحديث الخدمة", 500, error.message);
  return apiSuccess(data);
}
