import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { customerCreateSchema } from "@/lib/domain/validators";

export async function GET() {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const { data, error } = await context.supabase
    .from("customers")
    .select(`
      id, full_name, phone, email, notes, is_active, created_at, updated_at,
      vehicles(id), bookings(id), work_orders(id),
      customer_accounts(id, is_active)
    `)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) return apiError("تعذر تحميل العملاء", 500, error.message);
  return apiSuccess(data ?? []);
}

export async function POST(request: Request) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const body = await request.json().catch(() => null);
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات العميل", 422, parsed.error.flatten());

  const { data, error } = await context.supabase
    .from("customers")
    .insert({
      workshop_id: context.profile.workshop_id,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      created_by: context.user.id,
    })
    .select("id, full_name, phone, email, notes, is_active, created_at, updated_at")
    .single();

  if (error?.code === "23505") return apiError("يوجد عميل مسجل بنفس رقم الجوال", 409);
  if (error) return apiError("تعذر إضافة العميل", 500, error.message);
  return apiSuccess(data, 201);
}
