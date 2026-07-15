import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { StaffProfile, StaffRole } from "@/lib/domain/types";

export type StaffApiContext = {
  supabase: SupabaseClient;
  user: User;
  profile: StaffProfile;
};

export async function getStaffApiContext(roles?: StaffRole[]): Promise<StaffApiContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, workshop_id, full_name, role, is_active")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const profile = data as StaffProfile | null;
  if (!profile) return null;
  if (roles && !roles.includes(profile.role)) return null;

  return { supabase, user, profile };
}
