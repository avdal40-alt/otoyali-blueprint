import "server-only";

export type VinPresence = "missing" | "present";
export type VinFormatStatus = "valid_structure" | "invalid_structure" | "not_checked";
export type VinTrustProviderStatus = "not_configured" | "unavailable" | "consent_required" | "available";
export type VinTrustProvenance = "seller_supplied" | "yolmod_internal" | "external_provider" | "unavailable";
export type VinTrustSignalCode = "vin_present" | "vin_format_valid" | "vin_format_invalid" | "vin_reference_review_required" | "external_check_not_available" | "external_check_requires_consent";

export type VinTrustSignal = {
  code: VinTrustSignalCode;
  provenance: VinTrustProvenance;
};

export type VinTrustInspectionInput = {
  vinPresence: VinPresence;
  vinFormatStatus: VinFormatStatus;
  reviewState: "bound" | "review_required" | null;
  externalLookupRequested: boolean;
  externalProviderConfigured: boolean;
  externalProviderReachable: boolean;
  consentGranted: boolean;
};

export type VinTrustInspection = {
  available: boolean;
  providerStatus: VinTrustProviderStatus;
  vinPresence: VinPresence;
  vinFormatStatus: VinFormatStatus;
  externalHistoryStatus: "not_checked" | "not_available" | "consent_required";
  consentRequired: boolean;
  signals: VinTrustSignal[];
};

/** Future providers receive only this derived, consent-gated inspection input by default. */
export interface VinTrustProvider {
  readonly id: "not_configured";
  readonly capabilities: { externalHistory: false; requiresExplicitConsent: true; transmitsRawVin: false };
  inspect(input: VinTrustInspectionInput): VinTrustInspection;
}

export const notConfiguredVinTrustProvider: VinTrustProvider = {
  id: "not_configured",
  capabilities: { externalHistory: false, requiresExplicitConsent: true, transmitsRawVin: false },
  inspect: inspectVinTrust
};

/**
 * Reports only evidence that Yolmod currently holds. It never treats VIN
 * structure, seller submission, or a dealer state as vehicle verification.
 */
export function inspectVinTrust(input: VinTrustInspectionInput): VinTrustInspection {
  const providerStatus = resolveVinTrustProviderStatus(input);
  const signals: VinTrustSignal[] = [];
  if (input.vinPresence === "present") {
    signals.push({ code: "vin_present", provenance: "seller_supplied" });
    if (input.vinFormatStatus === "valid_structure") signals.push({ code: "vin_format_valid", provenance: "yolmod_internal" });
    if (input.vinFormatStatus === "invalid_structure") signals.push({ code: "vin_format_invalid", provenance: "yolmod_internal" });
    if (input.reviewState === "review_required") signals.push({ code: "vin_reference_review_required", provenance: "yolmod_internal" });
  }
  if (providerStatus === "consent_required") signals.push({ code: "external_check_requires_consent", provenance: "unavailable" });
  if (providerStatus === "not_configured" || providerStatus === "unavailable") signals.push({ code: "external_check_not_available", provenance: "unavailable" });

  return {
    available: providerStatus === "available",
    providerStatus,
    vinPresence: input.vinPresence,
    vinFormatStatus: input.vinFormatStatus,
    externalHistoryStatus: providerStatus === "consent_required" ? "consent_required" : providerStatus === "available" ? "not_checked" : "not_available",
    consentRequired: providerStatus === "consent_required",
    signals
  };
}

export function resolveVinTrustProviderStatus(input: VinTrustInspectionInput): VinTrustProviderStatus {
  if (!input.externalProviderConfigured) return "not_configured";
  if (input.externalLookupRequested && input.vinPresence === "present" && !input.consentGranted) return "consent_required";
  return input.externalProviderReachable ? "available" : "unavailable";
}
