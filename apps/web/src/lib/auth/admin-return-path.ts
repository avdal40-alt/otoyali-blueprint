import { safeNextPath } from "./return-path";

/**
 * Admin sign-in may return only to the local admin surface.  This is a UX
 * boundary; database RPCs and API handlers remain the authorization boundary.
 */
export function safeAdminNextPath(value: unknown, fallback = "/admin") {
  const candidate = safeNextPath(value, fallback);
  return candidate === "/admin" || candidate.startsWith("/admin/") ? candidate : "/admin";
}
