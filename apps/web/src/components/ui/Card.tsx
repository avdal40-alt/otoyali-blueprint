import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "listing" | "category" | "seller" | "video" | "admin" | "placeholder";
type CardPadding = "none" | "sm" | "md" | "lg";

const cardVariantClass: Record<CardVariant, string> = {
  default: "border-oto-border bg-white shadow-soft",
  listing: "border-oto-border bg-white shadow-soft hover:shadow-oto",
  category: "border-oto-border bg-white shadow-soft hover:border-oto-blue",
  seller: "border-oto-border bg-white shadow-soft",
  video: "border-oto-border bg-white shadow-soft hover:border-oto-blue",
  admin: "border-oto-border bg-white shadow-soft",
  placeholder: "border-dashed border-oto-border bg-oto-surface shadow-none"
};

const cardPaddingClass: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-6"
};

export function Card({
  children,
  className,
  variant = "default",
  padding = "md",
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border transition duration-base",
        cardVariantClass[variant],
        cardPaddingClass[padding],
        interactive && "hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-title text-oto-text", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-body text-oto-muted", className)}>{children}</p>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-body text-oto-muted", className)}>{children}</div>;
}
