import { t } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { formatPrice } from "@/lib/format";
import type { ServiceBookingMode, ServiceBranchStatus, ServicePricingMode, ServiceProviderStatus } from "./types";

export function serviceProviderStatusLabel(status: ServiceProviderStatus | string | null | undefined, locale: Locale) {
  if (status === "active") return t(locale, "services.status.activeProvider");
  if (status === "suspended") return t(locale, "services.status.suspended");
  if (status === "archived") return t(locale, "services.status.archived");
  if (status === "rejected") return t(locale, "services.status.rejected");
  return t(locale, "services.status.pendingReview");
}

export function serviceBranchStatusLabel(status: ServiceBranchStatus | string | null | undefined, locale: Locale) {
  if (status === "active") return t(locale, "services.status.activeBranch");
  if (status === "temporarily_closed") return t(locale, "services.status.temporarilyClosed");
  return t(locale, "services.status.unavailable");
}

export function servicePricingLabel({
  pricingMode,
  minAmount,
  maxAmount,
  currency,
  locale
}: {
  pricingMode?: ServicePricingMode | string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  currency?: string | null;
  locale: Locale;
}) {
  if (pricingMode === "fixed" && minAmount !== null && minAmount !== undefined) {
    return formatPrice(minAmount, currency ?? "TRY", locale);
  }
  if (pricingMode === "starting_from" && minAmount !== null && minAmount !== undefined) {
    return t(locale, "services.pricing.startingFrom", { price: formatPrice(minAmount, currency ?? "TRY", locale) });
  }
  if (pricingMode === "range" && minAmount !== null && minAmount !== undefined && maxAmount !== null && maxAmount !== undefined) {
    return `${formatPrice(minAmount, currency ?? "TRY", locale)} - ${formatPrice(maxAmount, currency ?? "TRY", locale)}`;
  }
  if (pricingMode === "unavailable") return t(locale, "services.pricing.unavailable");
  return t(locale, "services.pricing.quoteRequired");
}

export function serviceDurationLabel({
  minMinutes,
  maxMinutes,
  locale
}: {
  minMinutes?: number | null;
  maxMinutes?: number | null;
  locale: Locale;
}) {
  if (!minMinutes && !maxMinutes) return t(locale, "services.duration.notProvided");
  if (minMinutes && maxMinutes && minMinutes !== maxMinutes) {
    return t(locale, "services.duration.rangeMinutes", { min: minMinutes, max: maxMinutes });
  }
  return t(locale, "services.duration.minutes", { minutes: minMinutes ?? maxMinutes ?? 0 });
}

export function serviceBookingModeLabel(mode: ServiceBookingMode | string | null | undefined, locale: Locale) {
  if (mode === "contact_provider") return t(locale, "services.booking.contactProvider");
  if (mode === "instant_booking_future") return t(locale, "services.booking.instantFuture");
  if (mode === "unavailable") return t(locale, "services.booking.unavailable");
  return t(locale, "services.booking.requestOnly");
}
