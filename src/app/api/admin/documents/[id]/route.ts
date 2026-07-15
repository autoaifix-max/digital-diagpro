import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext();
  if (!context) return apiError("غير مصرح", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null) as { customerVisible?: unknown; title?: unknown } | null;

  const updates: { customer_visible?: boolean; title?: string } = {};
  if (typeof body?.customerVisible === "boolean") updates.customer_visible = body.customerVisible;
  if (typeof body?.title === "string" && body.title.trim().length >= 3) updates.title = body.title.trim();
  if (!Object.keys(updates).length) return apiError("لا توجد تغييرات صالحة", 422);

  const { data, error } = await context.supabase.from("customer_documents").update(updates).eq("id", id).select("id, title, customer_visible").single();
  if (error) return apiError("تعذر تحديث المستند", 500, error.message);
  return apiSuccess(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin"]);
  if (!context) return apiError("الحذف متاح للمدير فقط", 403);
  const { id } = await params;

  const { data: document, error: readError } = await context.supabase.from("customer_documents").select("storage_bucket, storage_path").eq("id", id).maybeSingle();
  if (readError || !document) return apiError("المستند غير موجود", 404);

  const { error: storageError } = await context.supabase.storage.from(document.storage_bucket).remove([document.storage_path]);
  if (storageError) return apiError("تعذر حذف الملف من التخزين", 500, storageError.message);

  const { error: deleteError } = await context.supabase.from("customer_documents").delete().eq("id", id);
  if (deleteError) return apiError("حُذف الملف لكن تعذر حذف سجل المستند؛ راجع قاعدة البيانات", 500, deleteError.message);
  return apiSuccess({ id });
}
