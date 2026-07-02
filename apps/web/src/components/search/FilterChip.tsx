"use client";

import { cn } from "@/lib/cn";

export function FilterChip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-xs font-bold transition",
        active ? "border-oto-blue bg-blue-50 text-oto-blue" : "border-oto-border bg-white text-oto-muted hover:text-oto-text"
      )}
    >
      {label}
    </button>
  );
}
