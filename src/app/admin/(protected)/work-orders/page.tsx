import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { WorkOrdersBoard } from "@/components/admin/work-orders-board";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "أوامر العمل" };

export default async function WorkOrdersPage() {
  const profile = await requireStaff();
  return (
    <>
      <PageHeader eyebrow="التشغيل" title="أوامر العمل" description="تتبع السيارة من الاستلام والتشخيص حتى الجودة والجاهزية والتسليم." />
      <WorkOrdersBoard role={profile.role} />
    </>
  );
}
