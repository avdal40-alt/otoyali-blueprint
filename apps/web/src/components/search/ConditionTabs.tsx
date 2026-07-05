"use client";

import { cn } from "@/lib/cn";

const options = [
  { value: "", label: "Tüm ilanlar" },
  { value: "used", label: "İkinci el" },
  { value: "new", label: "Sıfır km" }
];

export function ConditionTabs({
  value,
  onChange,
  compact = false
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-3 rounded-md bg-oto-surface p-1", compact ? "gap-1" : "gap-1.5")}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 rounded-md px-2 text-xs font-black transition sm:text-sm",
              active ? "bg-oto-blue text-white shadow-soft" : "text-oto-muted hover:bg-white hover:text-oto-text"
            )}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
