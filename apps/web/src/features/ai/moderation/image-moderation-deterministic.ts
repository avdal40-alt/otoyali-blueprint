import "server-only";

import { imageModerationOutputSchema, type ImageModerationProviderInput } from "./image-moderation";

/** Local-only deterministic fixtures. They classify test markers only and are never used as production fallback. */
export function moderateListingImageDeterministically(input: ImageModerationProviderInput) {
  if (input.testFixture === "unavailable") throw new Error("image_moderation_provider_unavailable");
  if (input.testFixture === "malformed") return { signals: [{ code: "CONTACT_IN_IMAGE", confidence: "high", evidence: "[qr-present]", recommendedAction: "ask_edit" }] } as never;
  const signals = input.testFixture === "contact" ? [{ code: "CONTACT_IN_IMAGE", confidence: "high", evidence: "[contact-overlay]", recommendedAction: "ask_edit" }]
    : input.testFixture === "qr" ? [{ code: "QR_CODE_PRESENT", confidence: "high", evidence: "[qr-present]", recommendedAction: "ask_edit" }]
    : input.testFixture === "low_quality" ? [{ code: "LOW_QUALITY_IMAGE", confidence: "medium", evidence: "[low-quality-image]", recommendedAction: "ask_edit" }]
    : input.testFixture === "damage" ? [{ code: "POSSIBLE_VISIBLE_DAMAGE", confidence: "low", evidence: "[possible-visible-damage]", recommendedAction: "review" }]
    : input.testFixture === "contact_qr" ? [{ code: "CONTACT_IN_IMAGE", confidence: "high", evidence: "[contact-overlay]", recommendedAction: "ask_edit" }, { code: "QR_CODE_PRESENT", confidence: "medium", evidence: "[qr-present]", recommendedAction: "ask_edit" }]
    : [];
  const vehicleIdentity = input.testFixture === "motorcycle" ? { category: "motorcycle", confidence: "high" }
    : input.testFixture === "commercial_van" ? { category: "commercial_van", confidence: "high", bodyType: "commercial" }
    : input.testFixture === "detail" ? { category: "insufficient_for_vehicle_identity", confidence: "high" }
    : input.testFixture === "uncertain_make" ? { category: "passenger_car", confidence: "low" }
    : { category: "passenger_car", confidence: "high", bodyType: input.expectedVehicle?.bodyType === "suv" ? "suv" : "sedan" };
  return imageModerationOutputSchema.parse({ signals, vehicleIdentity });
}
