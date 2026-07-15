import type { Metadata } from "next";
import { ApprovalsManager } from "@/components/admin/approvals-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/auth/guards";
export const metadata: Metadata = { title: "الموافقات" };
export default async function AdminApprovalsPage() { await requireStaff(["admin", "receptionist"]); return <><PageHeader eyebrow="اعتماد العميل" title="الموافقات التشغيلية" description="إنشاء طلبات الموافقة وتوثيق المبلغ والقرار والقناة ووقت الاستجابة." /><ApprovalsManager /></>; }
