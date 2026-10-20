"use client";

import { ButtonLink } from "@/components/ui/Button";
import {
  platformStaffNavigationAction,
  usePlatformStaffNavigation,
} from "@/components/layout/PlatformStaffNavigation";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

type Props = {
  locale: Locale;
  sellTitle: string;
  sellBody: string;
  sellerLabel: string;
  adminLabel: string;
  adminBody: string;
};

export function HomeMarketplaceAction({
  locale,
  sellTitle,
  sellBody,
  sellerLabel,
  adminLabel,
  adminBody,
}: Props) {
  const marketplaceAction = platformStaffNavigationAction(
    usePlatformStaffNavigation(),
  );

  if (!marketplaceAction) {
    return (
      <section
        aria-busy="true"
        className="mt-10 min-h-40 rounded-oto border border-oto-border bg-oto-surface"
      />
    );
  }

  const isStaff = marketplaceAction === "admin";

  return (
    <section className="mt-10 rounded-oto border border-oto-border bg-oto-surface px-5 py-6 md:flex md:items-center md:justify-between md:gap-6 md:px-7">
      <div>
        <h2 className="text-h3 text-oto-text md:text-h2">
          {isStaff ? adminLabel : sellTitle}
        </h2>
        <p className="mt-2 text-body text-oto-muted">
          {isStaff ? adminBody : sellBody}
        </p>
      </div>
      <ButtonLink
        href={localizePath(isStaff ? "/admin" : "/sell", locale)}
        className="mt-5 md:mt-0"
        variant="primary"
      >
        {isStaff ? adminLabel : sellerLabel}
      </ButtonLink>
    </section>
  );
}
