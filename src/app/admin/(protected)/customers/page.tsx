import type { Metadata } from "next";
import { CustomersManager } from "@/components/admin/customers-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "العملاء" };

export default async function AdminCustomersPage() {
  await requireStaff(["admin", "receptionist"]);
  return <><PageHeader eyebrow="ملفات العملاء" title="إدارة العملاء" description="إضافة وتعديل وأرشفة العملاء مع ملخص السيارات والحجوزات وأوامر العمل." /><CustomersManager /></>;
}
