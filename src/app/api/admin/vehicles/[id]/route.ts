import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { vehiclePatchSchema } from "@/lib/domain/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = vehiclePatchSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات السيارة", 422, parsed.error.flatten());

  const { data: customer } = await context.supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customerId)
    .eq("workshop_id", context.profile.workshop_id)
    .maybeSingle();
  if (!customer) return apiError("العميل غير موجود", 422);

  const { data, error } = await context.supabase
    .from("vehicles")
    .update({
      customer_id: parsed.data.customerId,
      make: parsed.data.make,
      model: parsed.data.model,
      model_year: parsed.data.modelYear,
      vin: parsed.data.vin || null,
      plate_number: parsed.data.plateNumber || null,
      engine: parsed.data.engine || null,
      color: parsed.data.color || null,
      mileage: parsed.data.mileage === "" ? null : parsed.data.mileage,
      notes: parsed.data.notes || null,
      is_active: parsed.data.isActive,
    })
    .eq("id", id)
    .eq("workshop_id", context.profile.workshop_id)
    .select("id, customer_id, make, model, model_year, vin, plate_number, engine, color, mileage, notes, is_active, created_at, updated_at")
    .single();

  if (error?.code === "23505") return apiError("رقم الهيكل مسجل لسيارة أخرى", 409);
  if (error) return apiError("تعذر تحديث السيارة", 500, error.message);
  return apiSuccess(data);
}
