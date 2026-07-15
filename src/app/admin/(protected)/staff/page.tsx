import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { StaffManager } from "@/components/admin/staff-manager";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "الموظفون" };

export default async function StaffPage() {
  await requireStaff(["admin"]);
  return <><PageHeader eyebrow="الإدارة" title="موظفو المركز" description="إنشاء حسابات الموظفين وتحديد الأدوار وإيقاف الحسابات عند الحاجة." /><StaffManager /></>;
}
