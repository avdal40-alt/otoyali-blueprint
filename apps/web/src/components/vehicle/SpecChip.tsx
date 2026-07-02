import type { ReactNode } from "react";

export function SpecChip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-oto-surface px-3 py-1 text-xs font-semibold text-oto-muted">{children}</span>;
}
