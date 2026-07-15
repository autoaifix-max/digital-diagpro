import { apiError, apiSuccess } from "@/lib/api/responses";
import { publicBookingSchema } from "@/lib/domain/validators";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = publicBookingSchema.safeParse(json);
  if (!parsed.success) {
    return apiError("تحقق من بيانات الحجز", 422, parsed.error.flatten());
  }

  const supabase = await createClient();
  const data = parsed.data;
  const preferredAt = new Date(`${data.preferredDate}T${data.preferredTime}:00+03:00`).toISOString();

  const { data: result, error } = await supabase.rpc("create_public_booking", {
    p_customer_name: data.customerName,
    p_phone: data.phone,
    p_vehicle_make: data.vehicleMake,
    p_vehicle_model: data.vehicleModel,
    p_vehicle_year: data.vehicleYear,
    p_plate_number: data.plateNumber || null,
    p_service_code: data.serviceCode,
    p_complaint: data.complaint,
    p_preferred_at: preferredAt,
  });

  if (error) {
    console.error("create_public_booking failed", error);
    return apiError("تعذر إنشاء الحجز الآن. حاول مرة أخرى أو تواصل مع المركز.", 500);
  }

  const row = Array.isArray(result) ? result[0] : result;
  return apiSuccess({ bookingId: row.booking_id, bookingNumber: row.booking_number }, 201);
}
