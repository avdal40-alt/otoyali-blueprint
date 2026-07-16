import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "orange";
type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-oto-blue text-white shadow-soft hover:bg-oto-blue/90",
  secondary: "border border-oto-border bg-white text-oto-text hover:bg-oto-surface",
  ghost: "bg-transparent text-oto-text hover:bg-oto-surface",
  outline: "border border-oto-blue bg-white text-oto-blue hover:bg-oto-blue/10",
  danger: "bg-oto-danger text-white shadow-soft hover:bg-oto-danger/90",
  orange: "bg-oto-orange text-white shadow-soft hover:bg-oto-orange/90"
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-button px-3 text-xs",
  md: "h-11 gap-2 rounded-button px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-button px-5 text-base"
};

type BaseProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
};

const baseClass =
  "inline-flex shrink-0 items-center justify-center font-bold transition duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oto-blue/15 disabled:cursor-not-allowed disabled:opacity-disabled aria-disabled:pointer-events-none aria-disabled:opacity-disabled";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  leftIcon,
  rightIcon,
  isLoading = false,
  disabled,
  ...props
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(baseClass, sizeClass[size], variantClass[variant], className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner /> : leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
}

export function ButtonLink({
  children,
  variant = "primary",
  size = "md",
  className,
  leftIcon,
  rightIcon,
  isLoading = false,
  ...props
}: BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const ariaDisabled = props["aria-disabled"] || isLoading || undefined;

  return (
    <Link
      className={cn(baseClass, sizeClass[size], variantClass[variant], className)}
      aria-disabled={ariaDisabled}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner /> : leftIcon}
      <span>{children}</span>
      {rightIcon}
    </Link>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}
