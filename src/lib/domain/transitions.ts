import type { BookingStatus, WorkOrderStatus } from "@/lib/domain/types";

export const bookingTransitions: Record<BookingStatus, readonly BookingStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["arrived", "no_show", "cancelled"],
  arrived: ["in_diagnosis", "cancelled"],
  in_diagnosis: ["waiting_approval", "in_service", "cancelled"],
  waiting_approval: ["approved", "cancelled"],
  approved: ["in_service", "cancelled"],
  in_service: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: ["confirmed", "cancelled"],
};

export const workOrderTransitions: Record<WorkOrderStatus, readonly WorkOrderStatus[]> = {
  open: ["diagnosing", "cancelled"],
  diagnosing: ["waiting_approval", "approved", "in_progress", "cancelled"],
  waiting_approval: ["approved", "cancelled"],
  approved: ["in_progress", "cancelled"],
  in_progress: ["quality_check", "cancelled"],
  quality_check: ["in_progress", "ready"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return bookingTransitions[from].includes(to);
}

export function canTransitionWorkOrder(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return workOrderTransitions[from].includes(to);
}
