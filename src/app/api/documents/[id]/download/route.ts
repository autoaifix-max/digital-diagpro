import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: document, error } = await supabase
    .from("customer_documents")
    .select("storage_bucket, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (error || !document) return apiError("المستند غير موجود أو غير مسموح بعرضه", 404);

  const { data, error: signedError } = await supabase.storage.from(document.storage_bucket).createSignedUrl(document.storage_path, 60);
  if (signedError || !data?.signedUrl) return apiError("تعذر إنشاء رابط آمن للمستند", 500);

  return NextResponse.redirect(data.signedUrl);
}
