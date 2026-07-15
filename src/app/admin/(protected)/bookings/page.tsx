import type { Metadata } from "next";
import { BookingsBoard } from "@/components/admin/bookings-board";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "الحجوزات" };

export default async function AdminBookingsPage() {
  await requireStaff(["admin", "receptionist"]);
  return (
    <>
      <PageHeader eyebrow="الاستقبال" title="إدارة الحجوزات" description="تأكيد الموعد، تسجيل الوصول، ثم تحويل الحجز إلى أمر عمل بدون تكرار." />
      <BookingsBoard />
    </>
  );
}
