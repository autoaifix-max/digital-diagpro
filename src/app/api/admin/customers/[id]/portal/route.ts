import { randomBytes } from "node:crypto";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.email("البريد الإلكتروني غير صحيح").max(160),
});

function temporaryPassword() {
  return `Dp!${randomBytes(8).toString("hex")}#7`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin"]);
  if (!context) return apiError("تفعيل بوابة العميل متاح للمدير فقط", 403);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من البريد الإلكتروني", 422, parsed.error.flatten());

  const { data: customer, error: customerError } = await context.supabase
    .from("customers")
    .select("id, full_name, phone, auth_user_id")
    .eq("id", id)
    .eq("workshop_id", context.profile.workshop_id)
    .single();
  if (customerError || !customer) return apiError("العميل غير موجود", 404);
  if (customer.auth_user_id) return apiError("بوابة العميل مفعلة مسبقًا", 409);

  const password = temporaryPassword();
  let admin;
  try {
    admin = createAdminClient();
  } catch (cause) {
    return apiError("مفتاح Service Role غير مضاف في بيئة الخادم", 503, cause instanceof Error ? cause.message : cause);
  }

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: customer.full_name, account_type: "customer" },
  });
  if (authError || !created.user) {
    const message = authError?.message?.toLowerCase().includes("already") ? "البريد مستخدم في حساب آخر" : "تعذر إنشاء حساب بوابة العميل";
    return apiError(message, 409, authError?.message);
  }

  const phoneLast4 = customer.phone.replace(/\D/g, "").slice(-4);
  const { error: linkError } = await admin.from("customer_accounts").insert({
    workshop_id: context.profile.workshop_id,
    customer_id: customer.id,
    auth_user_id: created.user.id,
    display_name: customer.full_name,
    phone_last4: phoneLast4,
    is_active: true,
  });

  if (linkError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return apiError("تم إلغاء إنشاء الحساب لأن ربطه بالعميل فشل", 500, linkError.message);
  }

  const { error: customerLinkError } = await admin
    .from("customers")
    .update({ auth_user_id: created.user.id, email: parsed.data.email.toLowerCase() })
    .eq("id", customer.id)
    .eq("workshop_id", context.profile.workshop_id);

  if (customerLinkError) {
    await admin.from("customer_accounts").delete().eq("auth_user_id", created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return apiError("تم إلغاء إنشاء الحساب لأن تحديث ملف العميل فشل", 500, customerLinkError.message);
  }

  return apiSuccess({ email: parsed.data.email.toLowerCase(), temporaryPassword: password, customerName: customer.full_name }, 201);
}
