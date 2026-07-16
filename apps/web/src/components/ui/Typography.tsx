import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type HeadingLevel = 1 | 2 | 3;

const headingClass: Record<HeadingLevel, string> = {
  1: "text-h1 tracking-tight text-oto-text",
  2: "text-h2 tracking-tight text-oto-text",
  3: "text-h3 text-oto-text"
};

export function Heading({
  level = 2,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  level?: HeadingLevel;
  children: ReactNode;
}) {
  const Tag = `h${level}` as ElementType;

  return (
    <Tag className={cn(headingClass[level], className)} {...props}>
      {children}
    </Tag>
  );
}

export function Text({
  as,
  tone = "body",
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  tone?: "body" | "subtitle" | "caption" | "label" | "helper" | "error";
  children: ReactNode;
}) {
  const Tag = as ?? "p";
  const toneClass = {
    body: "text-body text-oto-muted",
    subtitle: "text-subtitle text-oto-muted",
    caption: "text-caption text-oto-muted",
    label: "text-label text-oto-text",
    helper: "text-helper text-oto-muted",
    error: "text-error text-oto-danger"
  }[tone];

  return (
    <Tag className={cn(toneClass, className)} {...props}>
      {children}
    </Tag>
  );
}
