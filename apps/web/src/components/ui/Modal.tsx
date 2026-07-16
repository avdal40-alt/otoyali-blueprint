"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ModalSize = "sm" | "md" | "lg" | "xl";

const modalSizeClass: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl"
};

export function Modal({
  open,
  title,
  children,
  footer,
  size = "md",
  onClose,
  className
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  onClose?: () => void;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-end justify-center bg-oto-text/60 p-0 md:items-center md:p-4" role="presentation">
      {onClose ? <button type="button" aria-label="Kapat" className="absolute inset-0 cursor-default" onClick={onClose} /> : null}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="otoyali-modal-title"
        className={cn(
          "safe-bottom relative max-h-[92vh] w-full overflow-hidden rounded-t-modal border border-oto-border bg-white shadow-modal animate-oto-slide-up md:rounded-modal",
          modalSizeClass[size],
          className
        )}
      >
        <header className="flex items-center justify-between gap-4 border-b border-oto-border px-5 py-4">
          <h2 id="otoyali-modal-title" className="text-title text-oto-text">
            {title}
          </h2>
          {onClose ? (
            <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm font-black text-oto-muted transition hover:bg-oto-surface">
              Kapat
            </button>
          ) : null}
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="border-t border-oto-border px-5 py-4">{footer}</footer> : null}
      </section>
    </div>
  );
}
