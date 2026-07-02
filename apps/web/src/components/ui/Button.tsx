import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "orange" | "ghost" | "danger";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-oto-blue text-white hover:bg-blue-700",
  secondary: "border border-oto-border bg-white text-oto-text hover:bg-oto-surface",
  orange: "bg-oto-orange text-white hover:bg-amber-600",
  ghost: "bg-transparent text-oto-text hover:bg-oto-surface",
  danger: "bg-oto-danger text-white hover:bg-red-700"
};

type BaseProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  variant = "primary",
  className,
  ...props
}: BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <Link
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition",
        variantClass[variant],
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
