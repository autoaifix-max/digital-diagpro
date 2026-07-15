import type { Metadata } from "next";
import { QualityManager } from "@/components/admin/quality-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/auth/guards";
export const metadata: Metadata = { title: "الجودة" };
export default async function AdminQualityPage() { await requireStaff(["admin", "technician"]); return <><PageHeader eyebrow="قبل التسليم" title="فحص الجودة" description="قائمة فحص محفوظة؛ الاجتياز ينقل السيارة إلى جاهز، والفشل يعيدها إلى قيد العمل." /><QualityManager /></>; }
