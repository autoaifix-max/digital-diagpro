export const dynamic = "force-dynamic";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth/guards";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
