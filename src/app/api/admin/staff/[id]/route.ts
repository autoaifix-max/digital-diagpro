import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { staffPatchSchema } from "@/lib/domain/validators";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin"]);
  if (!context) return apiError("إدارة الموظفين متاحة للمدير فقط", 403);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = staffPatchSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات الموظف", 422, parsed.error.flatten());
  if (id === context.user.id && !parsed.data.isActive) return apiError("لا يمكنك إيقاف حسابك الحالي", 409);

  if (!parsed.data.isActive || parsed.data.role !== "admin") {
    const { count } = await context.supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("workshop_id", context.profile.workshop_id)
      .eq("role", "admin")
      .eq("is_active", true)
      .neq("id", id);
    const { data: target } = await context.supabase.from("users").select("role, is_active").eq("id", id).single();
    if (target?.role === "admin" && target.is_active && (count ?? 0) === 0) return apiError("يجب إبقاء مدير نشط واحد على الأقل", 409);
  }

  const { data, error } = await context.supabase
    .from("users")
    .update({ full_name: parsed.data.fullName, role: parsed.data.role, is_active: parsed.data.isActive })
    .eq("id", id)
    .eq("workshop_id", context.profile.workshop_id)
    .select("id, full_name, role, is_active, created_at, updated_at")
    .single();

  if (error) return apiError("تعذر تحديث الموظف", 500);

  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(id, {
      ban_duration: parsed.data.isActive ? "none" : "876000h",
      user_metadata: { full_name: parsed.data.fullName, account_type: "staff", role: parsed.data.role },
    });
  } catch {
    // The database profile remains the source of authorization; auth metadata is best-effort.
  }

  return apiSuccess(data);
}
