import type { QualityChecklistItem } from "@/lib/domain/types";

export const defaultQualityChecklist: QualityChecklistItem[] = [
  { key: "complaint_resolved", label: "تم التحقق من معالجة شكوى العميل", result: "pending", note: "" },
  { key: "no_warning_lights", label: "لا توجد لمبات تحذير مرتبطة بالعمل المنفذ", result: "pending", note: "" },
  { key: "no_leaks_or_loose_parts", label: "لا يوجد تهريب أو أجزاء أو فيش غير مثبتة", result: "pending", note: "" },
  { key: "road_or_function_test", label: "تم اختبار الوظيفة أو التجربة المناسبة للخدمة", result: "pending", note: "" },
  { key: "codes_rechecked", label: "تمت إعادة فحص الأكواد والبيانات عند الحاجة", result: "pending", note: "" },
  { key: "vehicle_clean_and_complete", label: "السيارة مكتملة ونظيفة من آثار العمل", result: "pending", note: "" },
];

export function cloneDefaultQualityChecklist(): QualityChecklistItem[] {
  return defaultQualityChecklist.map((item) => ({ ...item }));
}
