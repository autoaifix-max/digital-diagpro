import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StaffProfile, StaffRole } from "@/lib/domain/types";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getStaffProfile(): Promise<StaffProfile | null> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, workshop_id, full_name, role, is_active")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return (data as StaffProfile | null) ?? null;
}

export async function requireStaff(roles?: StaffRole[]): Promise<StaffProfile> {
  const profile = await getStaffProfile();
  if (!profile) redirect("/admin/login");
  if (roles && !roles.includes(profile.role)) redirect("/admin?forbidden=1");
  return profile;
}

export async function getCustomerAccount() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return null;

  const { data } = await supabase
    .from("customer_accounts")
    .select("id, customer_id, workshop_id, display_name, phone_last4, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return data ?? null;
}
