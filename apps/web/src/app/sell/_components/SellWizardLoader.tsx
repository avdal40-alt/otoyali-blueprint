"use client";

import { lazy, Suspense } from "react";
import type { SellWizardProps } from "./SellWizard";

const SellWizard = lazy(() => import("./SellWizard").then((module) => ({ default: module.SellWizard })));

export function SellWizardLoader(props: SellWizardProps) {
  return (
    <Suspense fallback={<p className="py-8 text-sm text-oto-muted" role="status" aria-live="polite">{props.copy.checkingSession}</p>}>
      <SellWizard {...props} />
    </Suspense>
  );
}
