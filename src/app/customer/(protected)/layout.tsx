export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer/customer-shell";
import { UnlinkedAccount } from "@/components/customer/unlinked-account";
import { getAuthenticatedUser } from "@/lib/auth/guards";

export default async function CustomerProtectedLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/customer/login");

  const { data: account } = await supabase
    .from("customer_accounts")
    .select("display_name, phone_last4")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!account) return <UnlinkedAccount />;
  return <CustomerShell account={account}>{children}</CustomerShell>;
}
