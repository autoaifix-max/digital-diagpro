import type { Metadata } from "next";
import { Suspense } from "react";
import { DiagnosticsWorkspace } from "@/components/admin/diagnostics-workspace";
import { PageHeader } from "@/components/admin/page-header";
import { LoadingBlock } from "@/components/ui/loading";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "التشخيص" };

export default async function DiagnosticsPage() {
  await requireStaff(["admin", "technician"]);
  return (
    <>
      <PageHeader eyebrow="الفحص الفني" title="تقارير التشخيص" description="وثّق الشكوى، الأكواد، القياسات، النتائج والتوصيات. لا يظهر التقرير للعميل إلا بتفعيل صريح." />
      <Suspense fallback={<LoadingBlock />}><DiagnosticsWorkspace /></Suspense>
    </>
  );
}
