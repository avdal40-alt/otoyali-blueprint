export function nextPathFromSearchParams(searchParams: URLSearchParams) {
  const next = searchParams.get("next");
  if (!next || !next.startsWith("/")) {
    return "/";
  }
  return next;
}

export function loginPath(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}
