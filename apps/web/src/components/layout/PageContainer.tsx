import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("container w-full max-w-[1180px] pb-24 pt-4", className)}>{children}</main>;
}

export function PageBand({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("py-6 md:py-8", className)}>{children}</section>;
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
        {eyebrow ? <p className="text-label uppercase tracking-wide text-oto-blue">{eyebrow}</p> : null}
        <h2 className="text-h3 text-oto-text md:text-h2">{title}</h2>
      </div>
      {action}
    </div>
  );
}
