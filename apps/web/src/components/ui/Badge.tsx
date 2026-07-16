import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "pending"
  | "active"
  | "rejected"
  | "archived"
  | "draft"
  | "featured"
  | "gallery"
  | "new"
  | "ai";

const badgeVariantClass: Record<BadgeVariant, string> = {
  neutral: "border-oto-border bg-oto-surface text-oto-muted",
  primary: "border-oto-blue/15 bg-oto-blue/10 text-oto-blue",
  success: "border-oto-success/15 bg-oto-success/10 text-oto-success",
  warning: "border-oto-warning/20 bg-oto-warning/10 text-oto-warning",
  danger: "border-oto-danger/15 bg-oto-danger/10 text-oto-danger",
  info: "border-oto-info/15 bg-oto-info/10 text-oto-info",
  pending: "border-oto-warning/20 bg-oto-warning/10 text-oto-warning",
  active: "border-oto-success/15 bg-oto-success/10 text-oto-success",
  rejected: "border-oto-danger/15 bg-oto-danger/10 text-oto-danger",
  archived: "border-oto-border bg-oto-surface text-oto-muted",
  draft: "border-oto-border bg-oto-surface text-oto-muted",
  featured: "border-oto-orange/20 bg-oto-orange text-white",
  gallery: "border-oto-blue/15 bg-oto-blue/10 text-oto-blue",
  new: "border-oto-cyan/20 bg-oto-cyan/10 text-oto-info",
  ai: "border-oto-cyan/20 bg-oto-cyan/10 text-oto-info"
};

export function Badge({
  children,
  className,
  variant = "neutral"
}: {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-badge transition duration-base",
        badgeVariantClass[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, children, className }: { status: BadgeVariant; children?: ReactNode; className?: string }) {
  return (
    <Badge variant={status} className={className}>
      {children ?? status}
    </Badge>
  );
}
