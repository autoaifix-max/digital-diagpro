import type { Metadata } from "next";
import { ServicesManager } from "@/components/admin/services-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/auth/guards";
export const metadata: Metadata = { title: "الخدمات" };
export default async function AdminServicesPage() { await requireStaff(["admin"]); return <><PageHeader eyebrow="كتالوج الورشة" title="إدارة الخدمات" description="إدارة أسماء الخدمات وأسعارها الأساسية ومددها وترتيب ظهورها في الحجز." /><ServicesManager /></>; }
