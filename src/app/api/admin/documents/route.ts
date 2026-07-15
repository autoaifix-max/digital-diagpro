import { randomUUID } from "node:crypto";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import type { DocumentType } from "@/lib/domain/types";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/csv"]);
const documentTypes = new Set<DocumentType>(["diagnostic_report", "estimate", "invoice", "work_order", "photo", "other"]);
const maxBytes = 15 * 1024 * 1024;

function safeFileName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned.slice(-120) || "document";
}

export async function GET() {
  const context = await getStaffApiContext();
  if (!context) return apiError("غير مصرح", 401);

  const [documentsResult, customersResult, vehiclesResult, ordersResult, bookingsResult, diagnosticsResult] = await Promise.all([
    context.supabase.from("customer_documents").select(`
      id, customer_id, vehicle_id, work_order_id, booking_id, diagnostic_report_id,
      title, document_type, file_name, mime_type, size_bytes, customer_visible, created_at,
      customers!inner(full_name, phone), vehicles(make, model, model_year), work_orders(work_order_number)
    `).order("created_at", { ascending: false }).limit(200),
    context.supabase.from("customers").select("id, full_name, phone").eq("is_active", true).order("updated_at", { ascending: false }).limit(300),
    context.supabase.from("vehicles").select("id, customer_id, make, model, model_year, plate_number").order("updated_at", { ascending: false }).limit(500),
    context.supabase.from("work_orders").select("id, customer_id, vehicle_id, work_order_number, status").order("updated_at", { ascending: false }).limit(300),
    context.supabase.from("bookings").select("id, customer_id, vehicle_id, booking_number, status").order("updated_at", { ascending: false }).limit(300),
    context.supabase.from("diagnostic_reports").select("id, customer_id, vehicle_id, work_order_id, report_number, title").order("updated_at", { ascending: false }).limit(300),
  ]);

  const firstError = [documentsResult.error, customersResult.error, vehiclesResult.error, ordersResult.error, bookingsResult.error, diagnosticsResult.error].find(Boolean);
  if (firstError) return apiError("تعذر تحميل بيانات المستندات", 500, firstError.message);

  return apiSuccess({
    documents: documentsResult.data ?? [],
    customers: customersResult.data ?? [],
    vehicles: vehiclesResult.data ?? [],
    workOrders: ordersResult.data ?? [],
    bookings: bookingsResult.data ?? [],
    diagnostics: diagnosticsResult.data ?? [],
  });
}

export async function POST(request: Request) {
  const context = await getStaffApiContext();
  if (!context) return apiError("غير مصرح", 401);

  const form = await request.formData();
  const file = form.get("file");
  const customerId = String(form.get("customerId") ?? "");
  const vehicleId = String(form.get("vehicleId") ?? "") || null;
  const workOrderId = String(form.get("workOrderId") ?? "") || null;
  const bookingId = String(form.get("bookingId") ?? "") || null;
  const diagnosticReportId = String(form.get("diagnosticReportId") ?? "") || null;
  const title = String(form.get("title") ?? "").trim();
  const documentType = String(form.get("documentType") ?? "other") as DocumentType;
  const customerVisible = String(form.get("customerVisible") ?? "false") === "true";

  if (!(file instanceof File)) return apiError("اختر ملفًا للرفع", 422);
  if (!customerId || title.length < 3) return apiError("اختر العميل واكتب عنوانًا واضحًا", 422);
  if (!documentTypes.has(documentType)) return apiError("نوع المستند غير صحيح", 422);
  if (!allowedTypes.has(file.type)) return apiError("نوع الملف غير مدعوم. المسموح: PDF، JPG، PNG، WEBP، CSV", 415);
  if (file.size <= 0 || file.size > maxBytes) return apiError("حجم الملف يجب ألا يتجاوز 15 MB", 413);

  const { data: customer, error: customerError } = await context.supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("workshop_id", context.profile.workshop_id)
    .maybeSingle();
  if (customerError || !customer) return apiError("العميل غير موجود في ورشة المستخدم", 422);

  const ownershipChecks: Array<PromiseLike<{ data: { id: string } | null; error: { message: string } | null }> | null> = [
    vehicleId ? context.supabase.from("vehicles").select("id").eq("id", vehicleId).eq("customer_id", customerId).eq("workshop_id", context.profile.workshop_id).maybeSingle() : null,
    workOrderId ? context.supabase.from("work_orders").select("id").eq("id", workOrderId).eq("customer_id", customerId).eq("workshop_id", context.profile.workshop_id).maybeSingle() : null,
    bookingId ? context.supabase.from("bookings").select("id").eq("id", bookingId).eq("customer_id", customerId).eq("workshop_id", context.profile.workshop_id).maybeSingle() : null,
    diagnosticReportId ? context.supabase.from("diagnostic_reports").select("id").eq("id", diagnosticReportId).eq("customer_id", customerId).eq("workshop_id", context.profile.workshop_id).maybeSingle() : null,
  ];

  const results = await Promise.all(ownershipChecks.filter((check): check is NonNullable<typeof check> => check !== null));
  if (results.some((result) => result.error || !result.data)) return apiError("أحد الروابط المحددة لا يتبع العميل نفسه", 422);

  const path = `${context.profile.workshop_id}/${customerId}/${randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await context.supabase.storage.from("customer-documents").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return apiError("تعذر رفع الملف إلى التخزين", 500, uploadError.message);

  const { data: document, error: insertError } = await context.supabase
    .from("customer_documents")
    .insert({
      workshop_id: context.profile.workshop_id,
      customer_id: customerId,
      vehicle_id: vehicleId,
      work_order_id: workOrderId,
      booking_id: bookingId,
      diagnostic_report_id: diagnosticReportId,
      title,
      document_type: documentType,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      storage_bucket: "customer-documents",
      storage_path: path,
      customer_visible: customerVisible,
      uploaded_by: context.user.id,
    })
    .select("id, title, document_type, customer_visible, created_at")
    .single();

  if (insertError) {
    await context.supabase.storage.from("customer-documents").remove([path]);
    return apiError("تم إلغاء الرفع لأن حفظ بيانات المستند فشل", 500, insertError.message);
  }

  return apiSuccess(document, 201);
}
