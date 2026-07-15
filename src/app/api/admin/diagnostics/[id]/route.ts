import { apiError, apiSuccess } from "@/lib/api/responses";
import { getStaffApiContext } from "@/lib/auth/api-guards";
import { diagnosticPatchSchema } from "@/lib/domain/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getStaffApiContext(["admin", "technician"]);
  if (!context) return apiError("غير مصرح", 401);

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = diagnosticPatchSchema.safeParse(body);
  if (!parsed.success) return apiError("تحقق من بيانات التقرير", 422, parsed.error.flatten());

  const data = parsed.data;
  const { data: report, error } = await context.supabase.rpc("update_diagnostic_report", {
    p_report_id: id,
    p_title: data.title,
    p_complaint: data.complaint,
    p_findings: data.findings,
    p_recommendations: data.recommendations,
    p_technician_conclusion: data.technicianConclusion,
    p_customer_summary: data.customerSummary,
    p_status: data.status,
    p_customer_visible: data.customerVisible,
    p_dtcs: data.dtcs,
  });

  if (error) return apiError("تعذر تحديث تقرير التشخيص", 409, error.message);
  return apiSuccess(report);
}
