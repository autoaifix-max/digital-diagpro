import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { walkInIntakeSchema } from "@/lib/domain/validators";

export async function GET() {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("الاستقبال متاح للمدير وموظف الاستقبال فقط", 403);

  const { data, error } = await context.supabase
    .from("service_catalog")
    .select("id, code, name_ar, base_price, estimated_minutes")
    .eq("workshop_id", context.profile.workshop_id)
    .eq("is_active", true)
    .order("sort_order");

  if (error) return apiError("تعذر تحميل الخدمات", 500);
  return apiSuccess(data ?? []);
}

export async function POST(request: Request) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("الاستقبال متاح للمدير وموظف الاستقبال فقط", 403);

  const body = await request.json().catch(() => null);
  const parsed = walkInIntakeSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات الاستقبال", 422, parsed.error.flatten());

  const { data, error } = await context.supabase.rpc("create_walk_in_work_order", {
    p_customer_name: parsed.data.customerName,
    p_phone: parsed.data.phone,
    p_email: parsed.data.email || null,
    p_vehicle_make: parsed.data.vehicleMake,
    p_vehicle_model: parsed.data.vehicleModel,
    p_vehicle_year: parsed.data.vehicleYear,
    p_vin: parsed.data.vin || null,
    p_plate_number: parsed.data.plateNumber || null,
    p_service_code: parsed.data.serviceCode,
    p_complaint: parsed.data.complaint,
    p_priority: parsed.data.priority,
    p_odometer_in: parsed.data.odometerIn === "" ? null : parsed.data.odometerIn,
    p_fuel_level_percent: parsed.data.fuelLevelPercent === "" ? null : parsed.data.fuelLevelPercent,
    p_promised_at: parsed.data.promisedAt ? new Date(parsed.data.promisedAt).toISOString() : null,
  });

  if (error) return apiError("تعذر استقبال السيارة. تحقق من البيانات وحاول مرة أخرى.", 409);
  return apiSuccess(Array.isArray(data) ? data[0] : data, 201);
}
