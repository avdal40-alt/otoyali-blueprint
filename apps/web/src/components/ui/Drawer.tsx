"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type DrawerSide = "left" | "right" | "bottom";

const drawerSideClass: Record<DrawerSide, string> = {
  left: "inset-y-0 left-0 h-full max-w-sm rounded-r-modal animate-oto-fade-in",
  right: "inset-y-0 right-0 h-full max-w-sm rounded-l-modal animate-oto-drawer-in",
  bottom: "safe-bottom inset-x-0 bottom-0 max-h-[88vh] rounded-t-modal animate-oto-slide-up"
};

export function Drawer({
  open,
  title,
  children,
  footer,
  side = "right",
  onClose,
  className
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  onClose?: () => void;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-drawer bg-oto-text/60" role="presentation">
      {onClose ? <button type="button" aria-label="Kapat" className="absolute inset-0 cursor-default" onClick={onClose} /> : null}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="otoyali-drawer-title"
        className={cn(
          "absolute flex w-full flex-col overflow-hidden border border-oto-border bg-white shadow-modal",
          drawerSideClass[side],
          className
        )}
      >
        <header className="flex items-center justify-between gap-4 border-b border-oto-border px-5 py-4">
          <h2 id="otoyali-drawer-title" className="text-title text-oto-text">
            {title}
          </h2>
          {onClose ? (
            <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm font-black text-oto-muted transition hover:bg-oto-surface">
              Kapat
            </button>
          ) : null}
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="border-t border-oto-border px-5 py-4">{footer}</footer> : null}
      </aside>
    </div>
  );
}
