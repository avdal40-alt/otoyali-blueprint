import type { SupabaseClient } from "@supabase/supabase-js";

export type PasswordEnrollmentMethod = "registration" | "legacy_enrollment" | "recovery_reset";

export async function getPasswordEnrollmentStatus(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_own_password_enrollment_status");
  if (error) return { enrolled: false, error };
  const status = Array.isArray(data) ? data[0] : data;
  return { enrolled: Boolean(status?.password_enrolled), error: null };
}

export async function completePasswordEnrollment(supabase: SupabaseClient, method: PasswordEnrollmentMethod) {
  const { error } = await supabase.rpc("complete_own_password_enrollment", { p_enrollment_method: method });
  return error;
}
