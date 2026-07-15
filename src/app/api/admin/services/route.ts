import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { serviceCreateSchema } from "@/lib/domain/validators";

export async function GET() {
  const context = await getStaffApiContext();
  if (!context) return apiError("غير مصرح", 401);

  const { data, error } = await context.supabase
    .from("service_catalog")
    .select("id, code, name_ar, description_ar, base_price, estimated_minutes, is_active, sort_order, created_at, updated_at")
    .order("sort_order")
    .order("name_ar");

  if (error) return apiError("تعذر تحميل الخدمات", 500, error.message);
  return apiSuccess(data ?? []);
}

export async function POST(request: Request) {
  const context = await getStaffApiContext(["admin"]);
  if (!context) return apiError("هذه العملية متاحة للمدير فقط", 403);

  const body = await request.json().catch(() => null);
  const parsed = serviceCreateSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات الخدمة", 422, parsed.error.flatten());

  const { data, error } = await context.supabase
    .from("service_catalog")
    .insert({
      workshop_id: context.profile.workshop_id,
      code: parsed.data.code,
      name_ar: parsed.data.nameAr,
      description_ar: parsed.data.descriptionAr || null,
      base_price: parsed.data.basePrice === "" ? null : parsed.data.basePrice,
      estimated_minutes: parsed.data.estimatedMinutes === "" ? null : parsed.data.estimatedMinutes,
      sort_order: parsed.data.sortOrder,
    })
    .select("id, code, name_ar, description_ar, base_price, estimated_minutes, is_active, sort_order, created_at, updated_at")
    .single();

  if (error?.code === "23505") return apiError("رمز الخدمة مستخدم مسبقًا", 409);
  if (error) return apiError("تعذر إضافة الخدمة", 500, error.message);
  return apiSuccess(data, 201);
}
