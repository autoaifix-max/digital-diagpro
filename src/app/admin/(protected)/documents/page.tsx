import type { Metadata } from "next";
import { DocumentsManager } from "@/components/admin/documents-manager";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "المستندات" };

export default function DocumentsPage() {
  return (
    <>
      <PageHeader eyebrow="ملفات العميل" title="المستندات" description="رفع خاص، ربط موثق بالعميل والسيارة وأمر العمل، وتحكم صريح بما يظهر في بوابة العميل." />
      <DocumentsManager />
    </>
  );
}
