import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-6xl px-4 pb-24 pt-4 md:px-6 lg:px-8", className)}>{children}</main>;
}

export function SectionHeader({
  title,
  eyebrow,
  action
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-wide text-oto-blue">{eyebrow}</p> : null}
        <h2 className="text-xl font-bold text-oto-text md:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
