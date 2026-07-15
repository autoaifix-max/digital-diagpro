import { randomBytes } from "node:crypto";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { staffCreateSchema } from "@/lib/domain/validators";
import { createAdminClient } from "@/lib/supabase/admin";

function temporaryPassword() {
  return `Dp!${randomBytes(8).toString("hex")}#7`;
}

export async function GET() {
  const context = await getStaffApiContext(["admin"]);
  if (!context) return apiError("إدارة الموظفين متاحة للمدير فقط", 403);

  const { data, error } = await context.supabase
    .from("users")
    .select("id, full_name, role, is_active, created_at, updated_at")
    .eq("workshop_id", context.profile.workshop_id)
    .order("created_at");

  if (error) return apiError("تعذر تحميل الموظفين", 500);
  return apiSuccess(data ?? []);
}

export async function POST(request: Request) {
  const context = await getStaffApiContext(["admin"]);
  if (!context) return apiError("إدارة الموظفين متاحة للمدير فقط", 403);

  const body = await request.json().catch(() => null);
  const parsed = staffCreateSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات الموظف", 422, parsed.error.flatten());

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return apiError("مفتاح Service Role غير مضاف في بيئة الخادم", 503);
  }

  const password = temporaryPassword();
  const email = parsed.data.email.toLowerCase();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, account_type: "staff", role: parsed.data.role },
  });

  if (authError || !created.user) {
    return apiError(authError?.message?.toLowerCase().includes("already") ? "البريد مستخدم في حساب آخر" : "تعذر إنشاء حساب الموظف", 409);
  }

  const { error: profileError } = await admin.from("users").insert({
    id: created.user.id,
    workshop_id: context.profile.workshop_id,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    is_active: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return apiError("تم إلغاء الحساب لأن ربط الموظف بالمركز فشل", 500);
  }

  return apiSuccess({ id: created.user.id, email, temporaryPassword: password, fullName: parsed.data.fullName, role: parsed.data.role }, 201);
}
