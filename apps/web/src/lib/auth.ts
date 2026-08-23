import { safeNextPath } from "./auth/return-path";

export function nextPathFromSearchParams(searchParams: URLSearchParams) {
  return safeNextPath(searchParams.get("next"), "/");
}

export function loginPath(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}
