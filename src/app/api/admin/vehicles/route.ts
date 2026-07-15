import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { vehicleCreateSchema } from "@/lib/domain/validators";

export async function GET() {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const [vehiclesResult, customersResult] = await Promise.all([
    context.supabase
      .from("vehicles")
      .select(`
        id, customer_id, make, model, model_year, vin, plate_number, engine,
        color, mileage, notes, is_active, created_at, updated_at,
        customers!inner(id, full_name, phone), bookings(id), work_orders(id)
      `)
      .order("updated_at", { ascending: false })
      .limit(500),
    context.supabase
      .from("customers")
      .select("id, full_name, phone")
      .eq("is_active", true)
      .order("full_name")
      .limit(500),
  ]);

  if (vehiclesResult.error) return apiError("تعذر تحميل السيارات", 500, vehiclesResult.error.message);
  if (customersResult.error) return apiError("تعذر تحميل العملاء", 500, customersResult.error.message);
  return apiSuccess({ vehicles: vehiclesResult.data ?? [], customers: customersResult.data ?? [] });
}

export async function POST(request: Request) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const body = await request.json().catch(() => null);
  const parsed = vehicleCreateSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات السيارة", 422, parsed.error.flatten());

  const { data: customer } = await context.supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customerId)
    .eq("workshop_id", context.profile.workshop_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!customer) return apiError("العميل غير موجود أو غير نشط", 422);

  const { data, error } = await context.supabase
    .from("vehicles")
    .insert({
      workshop_id: context.profile.workshop_id,
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
      created_by: context.user.id,
    })
    .select("id, customer_id, make, model, model_year, vin, plate_number, engine, color, mileage, notes, is_active, created_at, updated_at")
    .single();

  if (error?.code === "23505") return apiError("رقم الهيكل مسجل لسيارة أخرى", 409);
  if (error) return apiError("تعذر إضافة السيارة", 500, error.message);
  return apiSuccess(data, 201);
}
