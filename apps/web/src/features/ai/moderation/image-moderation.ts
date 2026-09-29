import "server-only";

import { z } from "zod";
import { isAiFeatureEnabled } from "../feature-registry";
import { privateVisionImageInputSchema, type PrivateVisionImageInput } from "../photo/plate-region-contract";
import { getConfiguredAiProvider } from "../providers/provider-registry";

export const IMAGE_MODERATION_SCHEMA_VERSION = "ai-01g-c2a-v1";
export const imageModerationCodes = ["CONTACT_IN_IMAGE", "QR_CODE_PRESENT", "LOW_QUALITY_IMAGE", "POSSIBLE_VISIBLE_DAMAGE"] as const;

const signalSchema = z.object({
  code: z.enum(imageModerationCodes),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z.enum(["[contact-overlay]", "[qr-present]", "[low-quality-image]", "[possible-visible-damage]"]),
  recommendedAction: z.enum(["ask_edit", "review"])
}).strict().superRefine((value, context) => {
  const evidenceByCode = {
    CONTACT_IN_IMAGE: "[contact-overlay]",
    QR_CODE_PRESENT: "[qr-present]",
    LOW_QUALITY_IMAGE: "[low-quality-image]",
    POSSIBLE_VISIBLE_DAMAGE: "[possible-visible-damage]"
  } as const;
  if (value.evidence !== evidenceByCode[value.code]) context.addIssue({ code: z.ZodIssueCode.custom, message: "Evidence class does not match image moderation code." });
  if (value.code === "LOW_QUALITY_IMAGE" && value.recommendedAction !== "ask_edit") context.addIssue({ code: z.ZodIssueCode.custom, message: "Low-quality images must ask for an edit." });
});

export const imageModerationOutputSchema = z.object({
  signals: z.array(signalSchema).max(imageModerationCodes.length)
}).strict().superRefine((value, context) => {
  if (new Set(value.signals.map((signal) => signal.code)).size !== value.signals.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate image moderation signals are not allowed." });
});

export type ImageModerationOutput = z.infer<typeof imageModerationOutputSchema>;
export type ImageModerationProviderInput = { image: PrivateVisionImageInput; mediaId: string; schemaVersion: string; testFixture?: "clean" | "contact" | "qr" | "low_quality" | "damage" | "contact_qr" | "malformed" | "unavailable" };

/** Server-only image classification. It deliberately returns closed classifications, never OCR, QR content, image bytes, or model prose. */
export async function moderateListingImage(input: ImageModerationProviderInput): Promise<{ kind: "ok"; output: ImageModerationOutput } | { kind: "disabled" | "unavailable" | "invalid" }> {
  const image = privateVisionImageInputSchema.parse(input.image);
  if (!isAiFeatureEnabled("ai_vision") || !isAiFeatureEnabled("ai_moderation")) return { kind: "disabled" };
  const provider = getConfiguredAiProvider();
  if (!(await provider.isAvailable())) return { kind: "unavailable" };
  try {
    return { kind: "ok", output: imageModerationOutputSchema.parse(await provider.moderateListingImage({ ...input, image, schemaVersion: IMAGE_MODERATION_SCHEMA_VERSION })) };
  } catch {
    return { kind: "invalid" };
  }
}
