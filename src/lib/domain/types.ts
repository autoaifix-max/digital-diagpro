export type StaffRole = "admin" | "receptionist" | "technician";

export type BookingStatus =
  | "new"
  | "confirmed"
  | "arrived"
  | "in_diagnosis"
  | "waiting_approval"
  | "approved"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show";

export type WorkOrderStatus =
  | "open"
  | "diagnosing"
  | "waiting_approval"
  | "approved"
  | "in_progress"
  | "quality_check"
  | "ready"
  | "delivered"
  | "cancelled";

export type DiagnosticStatus = "draft" | "in_progress" | "completed";
export type Priority = "normal" | "urgent";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ApprovalChannel = "in_person" | "phone" | "whatsapp" | "portal" | "other";
export type QualityCheckStatus = "draft" | "passed" | "failed";
export type QualityItemResult = "pending" | "pass" | "fail" | "not_applicable";
export type DocumentType =
  | "diagnostic_report"
  | "estimate"
  | "invoice"
  | "work_order"
  | "photo"
  | "other";

export interface QualityChecklistItem {
  key: string;
  label: string;
  result: QualityItemResult;
  note: string;
}

export interface StaffProfile {
  id: string;
  workshop_id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
}
