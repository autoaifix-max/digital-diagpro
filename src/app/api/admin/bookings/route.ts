import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";

export async function GET(request: Request) {
  const context = await getStaffApiContext(["admin", "receptionist"]);
  if (!context) return apiError("غير مصرح", 401);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.trim();
  const date = url.searchParams.get("date");

  let query = context.supabase
    .from("bookings")
    .select(`
      id, booking_number, service_code, complaint, preferred_at, confirmed_at,
      status, priority, source, internal_notes, created_at, updated_at,
      customer_id, vehicle_id,
      customers!inner(id, full_name, phone, email),
      vehicles!inner(id, make, model, model_year, plate_number, vin, mileage),
      work_orders(id, work_order_number, status)
    `)
    .order("preferred_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") query = query.eq("status", status);
  if (date) {
    const start = new Date(`${date}T00:00:00+03:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query = query.gte("preferred_at", start.toISOString()).lt("preferred_at", end.toISOString());
  }
  if (search) {
    query = query.or(`booking_number.ilike.%${search}%,complaint.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return apiError("تعذر تحميل الحجوزات", 500, error.message);
  return apiSuccess(data ?? []);
}
