import type {
  ApprovalChannel,
  ApprovalStatus,
  BookingStatus,
  DiagnosticStatus,
  DocumentType,
  Priority,
  QualityCheckStatus,
  QualityItemResult,
  StaffRole,
  WorkOrderStatus,
} from "@/lib/domain/types";

export const bookingStatusLabels: Record<BookingStatus, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  arrived: "وصل",
  in_diagnosis: "تحت التشخيص",
  waiting_approval: "بانتظار الموافقة",
  approved: "تمت الموافقة",
  in_service: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  no_show: "لم يحضر",
};

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  open: "مفتوح",
  diagnosing: "تشخيص",
  waiting_approval: "بانتظار الموافقة",
  approved: "معتمد",
  in_progress: "قيد العمل",
  quality_check: "فحص الجودة",
  ready: "جاهز للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const diagnosticStatusLabels: Record<DiagnosticStatus, string> = {
  draft: "مسودة",
  in_progress: "قيد التشخيص",
  completed: "مكتمل",
};

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  pending: "بانتظار قرار العميل",
  approved: "موافق",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

export const approvalChannelLabels: Record<ApprovalChannel, string> = {
  in_person: "حضوري",
  phone: "اتصال هاتفي",
  whatsapp: "واتساب",
  portal: "بوابة العميل",
  other: "أخرى",
};

export const qualityStatusLabels: Record<QualityCheckStatus, string> = {
  draft: "مسودة",
  passed: "اجتاز الجودة",
  failed: "يحتاج إعادة عمل",
};

export const qualityItemResultLabels: Record<QualityItemResult, string> = {
  pending: "لم يُفحص",
  pass: "ناجح",
  fail: "غير ناجح",
  not_applicable: "لا ينطبق",
};

export const priorityLabels: Record<Priority, string> = {
  normal: "عادي",
  urgent: "عاجل",
};

export const documentTypeLabels: Record<DocumentType, string> = {
  diagnostic_report: "تقرير تشخيص",
  estimate: "عرض سعر",
  invoice: "فاتورة",
  work_order: "أمر عمل",
  photo: "صورة",
  other: "أخرى",
};

export const roleLabels: Record<StaffRole, string> = {
  admin: "مدير",
  receptionist: "استقبال",
  technician: "فني",
};
