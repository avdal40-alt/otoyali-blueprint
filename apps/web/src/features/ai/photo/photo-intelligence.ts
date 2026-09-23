import "server-only";

import { z } from "zod";
import { getAiModel } from "../model-registry";

export const PHOTO_ANALYSIS_MAX_IMAGES = 12;
export const PHOTO_ANALYSIS_MAX_BYTES = 10 * 1024 * 1024;
const photoId = z.string().uuid();
export const photoAnalysisInputSchema = z.object({
  listingId: photoId,
  locale: z.enum(["tr", "en"]),
  expectedVehicle: z.object({ make: z.string().trim().max(80).optional(), model: z.string().trim().max(120).optional(), bodyType: z.string().trim().max(80).optional() }).strict().optional(),
  images: z.array(z.object({ mediaId: photoId, mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), sizeBytes: z.number().int().positive().max(PHOTO_ANALYSIS_MAX_BYTES), width: z.number().int().positive().max(8192), height: z.number().int().positive().max(8192), position: z.number().int().min(0).max(PHOTO_ANALYSIS_MAX_IMAGES - 1), testHint: z.enum(["clear", "blurry", "duplicate", "screenshot", "watermark", "contact", "qr", "plate", "mismatch", "body_mismatch", "damage"]).optional() }).strict()).min(1).max(PHOTO_ANALYSIS_MAX_IMAGES)
}).strict().superRefine((value, context) => { if (new Set(value.images.map((image) => image.mediaId)).size !== value.images.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["images"], message: "Duplicate media references are not allowed." }); });
export type PhotoAnalysisInput = z.infer<typeof photoAnalysisInputSchema>;

const signalType = z.enum(["image_quality", "blur", "framing", "resolution_or_small_image", "possible_duplicate", "possible_screenshot", "possible_watermark", "possible_contact_text", "possible_qr_code", "plate_visible", "possible_vehicle_mismatch", "possible_body_type_mismatch", "possible_visible_damage", "cover_suitability", "ordering_suggestion"]);
export const photoSignalSchema = z.object({ type: signalType, severity: z.enum(["info", "low", "medium", "high"]), confidence: z.enum(["low", "medium", "high"]), source: z.literal("ai"), kind: z.literal("inference"), mediaId: photoId.optional(), evidence: z.string().trim().min(1).max(180).optional(), recommendation: z.string().trim().min(1).max(180).optional() }).strict();
export const photoAnalysisOutputSchema = z.object({ analysisVersion: z.literal("ai-01e-a"), modelClass: z.literal("VISION"), signals: z.array(photoSignalSchema).max(80), cover: z.object({ mediaId: photoId, recommended: z.boolean(), score: z.number().int().min(0).max(100), reasons: z.array(z.string().max(120)).max(4) }).strict().optional(), suggestedOrder: z.array(photoId).max(PHOTO_ANALYSIS_MAX_IMAGES), provider: z.enum(["local", "openai"]), limitations: z.array(z.string().max(180)).max(4) }).strict();
export type PhotoAnalysisOutput = z.infer<typeof photoAnalysisOutputSchema>;

/** Advisory deterministic vision seam. testHint is only a mock fixture; it is never persisted or trusted for enforcement. */
export function analyzePhotosDeterministically(input: PhotoAnalysisInput): PhotoAnalysisOutput {
  const parsed = photoAnalysisInputSchema.parse(input); const signals: z.infer<typeof photoSignalSchema>[] = []; const order = [...parsed.images].sort((a, b) => score(a) - score(b)).map((image) => image.mediaId);
  for (const image of parsed.images) {
    const pixels = image.width * image.height; const lowResolution = pixels < 640 * 480;
    if (lowResolution) signal(signals, "resolution_or_small_image", image.mediaId, "medium", "high", "Image resolution is limited.");
    if (image.testHint === "blurry") { signal(signals, "blur", image.mediaId, "medium", "medium", "Image may be blurry."); signal(signals, "image_quality", image.mediaId, "medium", "medium", "Image quality appears limited."); }
    if (image.width / image.height > 2.2 || image.height / image.width > 2.2) signal(signals, "framing", image.mediaId, "low", "low", "Framing may not show the vehicle clearly.");
    const map: Record<string, z.infer<typeof signalType>> = { screenshot: "possible_screenshot", watermark: "possible_watermark", contact: "possible_contact_text", qr: "possible_qr_code", mismatch: "possible_vehicle_mismatch", body_mismatch: "possible_body_type_mismatch", damage: "possible_visible_damage" };
    if (image.testHint && map[image.testHint]) signal(signals, map[image.testHint], image.mediaId, "medium", "medium", evidenceFor(map[image.testHint]));
    if (image.testHint === "plate") signal(signals, "plate_visible", image.mediaId, "info", "medium", "A plate may be visible; no plate text is extracted.");
  }
  const duplicate = parsed.images.filter((image) => image.testHint === "duplicate"); if (duplicate.length > 1) for (const image of duplicate) signal(signals, "possible_duplicate", image.mediaId, "low", "medium", "Images may be visually similar.");
  const coverImage = [...parsed.images].sort((a, b) => score(a) - score(b))[0]; const coverScore = coverImage ? Math.max(0, 100 - score(coverImage)) : 0;
  if (coverImage) signal(signals, "cover_suitability", coverImage.mediaId, "info", "medium", coverScore >= 70 ? "This image may be suitable as a cover." : "A clearer, better-framed image may be preferable.");
  signals.push({ type: "ordering_suggestion", severity: "info", confidence: "low", source: "ai", kind: "inference", recommendation: "Suggested order is advisory and does not change media order." });
  return photoAnalysisOutputSchema.parse({ analysisVersion: "ai-01e-a", modelClass: "VISION", signals, cover: coverImage ? { mediaId: coverImage.mediaId, recommended: coverScore >= 70, score: coverScore, reasons: ["clarity", "resolution", "framing"] } : undefined, suggestedOrder: order, provider: "local", limitations: ["Analysis is advisory only.", "No plate or contact text is retained.", `VISION model path configured: ${getAiModel("VISION")?.id ?? "unavailable"}.`] });
}
function score(image: PhotoAnalysisInput["images"][number]) { return (image.width * image.height < 640 * 480 ? 40 : 0) + (image.testHint === "blurry" ? 35 : 0) + (["screenshot", "watermark", "contact", "qr"].includes(image.testHint ?? "") ? 25 : 0); }
function signal(target: z.infer<typeof photoSignalSchema>[], type: z.infer<typeof signalType>, mediaId: string, severity: "info" | "low" | "medium" | "high", confidence: "low" | "medium" | "high", evidence: string) { target.push({ type, severity, confidence, source: "ai", kind: "inference", mediaId, evidence }); }
function evidenceFor(type: z.infer<typeof signalType>) { return ({ possible_screenshot: "Image may include interface-like elements.", possible_watermark: "Visible overlay may be present.", possible_contact_text: "Image may contain contact-related text.", possible_qr_code: "Image may contain a QR-like code.", possible_vehicle_mismatch: "Vehicle may not match selected details.", possible_body_type_mismatch: "Body type may not match selected details.", possible_visible_damage: "A damage-like area may be visible." } as Partial<Record<z.infer<typeof signalType>, string>>)[type] ?? "Advisory visual signal."; }
