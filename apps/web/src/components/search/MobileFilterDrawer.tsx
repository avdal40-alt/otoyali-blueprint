"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

export function MobileFilterDrawer({
  open,
  onOpen,
  onClose,
  children
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const { dictionary } = useI18n();
  return (
    <>
      <div className="mb-4 lg:hidden">
        <Button type="button" variant="secondary" onClick={onOpen} className="w-full">
          {String(dictionary.search.filters)}
        </Button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={String(dictionary.search.closeFilters)} className="absolute inset-0 bg-black/30" onClick={onClose} />
          <div className="safe-bottom absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-oto">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-oto-text">{String(dictionary.search.filters)}</h2>
              <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm font-bold text-oto-muted">
                {String(dictionary.common.close)}
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
