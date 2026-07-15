import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";

export async function GET(request: Request) {
  const context = await getStaffApiContext();
  if (!context) return apiError("غير مصرح", 401);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.trim();

  let query = context.supabase
    .from("work_orders")
    .select(`
      id, work_order_number, booking_id, customer_id, vehicle_id, complaint,
      status, priority, assigned_to, odometer_in, fuel_level_percent, promised_at,
      labor_total, parts_total, discount_total, tax_total, grand_total,
      approval_note, internal_notes, opened_at, completed_at, delivered_at, created_at, updated_at,
      customers!inner(id, full_name, phone, email),
      vehicles!inner(id, make, model, model_year, plate_number, vin, mileage),
      diagnostic_reports(id, report_number, title, status, customer_visible)
    `)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`work_order_number.ilike.%${search}%,complaint.ilike.%${search}%`);

  const [ordersResult, staffResult] = await Promise.all([
    query,
    context.supabase
      .from("users")
      .select("id, full_name, role")
      .eq("workshop_id", context.profile.workshop_id)
      .eq("is_active", true)
      .order("full_name"),
  ]);

  if (ordersResult.error) return apiError("تعذر تحميل أوامر العمل", 500);
  if (staffResult.error) return apiError("تعذر تحميل قائمة الموظفين", 500);
  return apiSuccess({ orders: ordersResult.data ?? [], staff: staffResult.data ?? [] });
}
