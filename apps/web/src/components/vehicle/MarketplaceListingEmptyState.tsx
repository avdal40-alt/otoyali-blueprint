"use client";

import { EmptyState } from "@/components/ui/States";
import {
  platformStaffNavigationAction,
  usePlatformStaffNavigation,
} from "@/components/layout/PlatformStaffNavigation";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/types";

export function MarketplaceListingEmptyState({
  title,
  body,
  locale,
}: {
  title: string;
  body: string;
  locale: Locale;
}) {
  const { dictionary } = useI18n();
  const marketplaceAction = platformStaffNavigationAction(
    usePlatformStaffNavigation(),
  );
  const isStaff = marketplaceAction === "admin";

  return (
    <EmptyState
      title={title}
      body={body}
      href={
        marketplaceAction
          ? localizePath(isStaff ? "/admin" : "/sell", locale)
          : undefined
      }
      action={
        marketplaceAction
          ? String(
              isStaff
                ? dictionary.common.adminPanel
                : dictionary.common.publishListing,
            )
          : undefined
      }
    />
  );
}
