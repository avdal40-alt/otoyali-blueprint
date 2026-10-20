import type { AuthChangeEvent } from "@supabase/supabase-js";

export type PlatformStaffState =
  | "anonymous"
  | "staff"
  | "not_staff"
  | "unknown";

export type PlatformStaffClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: unknown | null;
    }>;
  };
  rpc: (
    name: "is_admin",
    args: { uid: string },
  ) => Promise<{ data: unknown; error: unknown | null }>;
};

export async function resolvePlatformStaffState(
  supabase: PlatformStaffClient,
): Promise<PlatformStaffState> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) return "unknown";
    if (!userData.user) return "anonymous";

    const { data: isStaff, error: staffError } = await supabase.rpc("is_admin", {
      uid: userData.user.id,
    });
    if (staffError || typeof isStaff !== "boolean") return "unknown";
    return isStaff ? "staff" : "not_staff";
  } catch {
    return "unknown";
  }
}

export function shouldRefreshPlatformStaffState(event: AuthChangeEvent) {
  return (
    event === "INITIAL_SESSION" ||
    event === "SIGNED_IN" ||
    event === "TOKEN_REFRESHED" ||
    event === "USER_UPDATED"
  );
}

export function platformStaffNavigationAction(
  state: PlatformStaffState,
): "admin" | "seller" | null {
  if (state === "staff") return "admin";
  if (state === "anonymous" || state === "not_staff") return "seller";
  return null;
}
