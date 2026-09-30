import type { ReactNode } from "react";

export type AiPresentationState = "loading" | "error" | "temporarily_unavailable" | "feature_disabled" | "insufficient_data" | "consent_required";

export function AiStateMessage({ state, children, action }: { state: AiPresentationState; children: ReactNode; action?: ReactNode }) {
  const isError = state === "error" || state === "temporarily_unavailable";
  return <div role={isError ? "alert" : "status"} aria-live={isError ? "assertive" : "polite"} className={isError ? "rounded-md border border-oto-danger/15 bg-oto-danger/10 p-3 text-sm font-bold text-oto-danger" : "rounded-md border border-oto-border bg-oto-surface p-3 text-sm text-oto-muted"}>{children}{action ? <div className="mt-2">{action}</div> : null}</div>;
}
