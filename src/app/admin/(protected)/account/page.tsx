import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/customer/change-password-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "حسابي" };

export default async function AccountPage() {
  const profile = await requireStaff();
  return <><PageHeader eyebrow="الأمان" title="حسابي" description="غيّر كلمة المرور المؤقتة واحفظ بيانات الدخول بشكل آمن." /><section className="panel max-w-2xl rounded-2xl p-5"><h2 className="font-black">{profile.full_name}</h2><p className="mt-2 text-sm text-[#8f96a3]">استخدم كلمة مرور طويلة وفريدة ولا تشاركها مع أي موظف آخر.</p><ChangePasswordForm /></section></>;
}
