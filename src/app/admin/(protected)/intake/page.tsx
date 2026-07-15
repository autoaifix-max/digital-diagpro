import type { Metadata } from "next";
import { IntakeForm } from "@/components/admin/intake-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "استقبال سيارة" };

export default async function IntakePage() {
  await requireStaff(["admin", "receptionist"]);
  return <><PageHeader eyebrow="الاستقبال" title="استقبال سيارة حضورية" description="أنشئ العميل والسيارة والحجز وأمر العمل في خطوة واحدة عند وصول السيارة." /><IntakeForm /></>;
}
