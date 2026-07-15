import type { Metadata } from "next";
import { VehiclesManager } from "@/components/admin/vehicles-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/auth/guards";
export const metadata: Metadata = { title: "السيارات" };
export default async function AdminVehiclesPage() { await requireStaff(["admin", "receptionist"]); return <><PageHeader eyebrow="ملفات المركبات" title="إدارة السيارات" description="ربط السيارة بمالكها وتحديث اللوحة والهيكل والعداد وبيانات التشغيل." /><VehiclesManager /></>; }
