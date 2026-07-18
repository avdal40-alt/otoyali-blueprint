"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/client";
import { buildAssistantContext, shouldShowAssistantForPath } from "../domain/context";
import { readAiCopy } from "./copy";

const AssistantPanel = dynamic(() => import("./AssistantPanel").then((module) => module.AssistantPanel), {
  ssr: false,
  loading: () => null
});

export function AssistantRoot() {
  const { locale, dictionary } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const searchParamsKey = searchParams.toString();
  const visible = shouldShowAssistantForPath(pathname);
  const context = useMemo(
    () =>
      buildAssistantContext({
        locale,
        pathname,
        searchParams: new URLSearchParams(searchParamsKey)
      }),
    [locale, pathname, searchParamsKey]
  );

  if (!visible) return null;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-toast inline-flex h-14 items-center gap-2 rounded-full bg-oto-text px-4 text-sm font-black text-white shadow-modal transition hover:bg-oto-blue focus-visible:ring-2 focus-visible:ring-oto-blue/30 md:bottom-6 md:right-6"
          aria-label={readAiCopy(dictionary, "open", "Open Rif assistant")}
          aria-expanded={open}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-oto-blue text-white">
            <Icon name="info" className="h-4 w-4" />
          </span>
          <span>{readAiCopy(dictionary, "launcher", "Rif")}</span>
        </button>
      ) : null}
      <AssistantPanel open={open} context={context} onClose={() => setOpen(false)} />
    </>
  );
}
