import "server-only";

import sharp from "sharp";
import { z } from "zod";
import { detectLicensePlateRegions, verifyNoReadableLicensePlate } from "@/features/ai/photo/plate-region-vision";
import { PLATE_REGION_MAX_BYTES, type PlateDetectionOutput, type PlateDetectionRequest, type PlatePrivacyVerificationOutput } from "@/features/ai/photo/plate-region-contract";

export const SANITIZED_PHOTO_PLATE_CONFIDENCE_THRESHOLD = 0;
const sizes = { master: 2400, large: 1600, card: 800, thumb: 300 } as const;

export const sanitizedPhotoRequestSchema = z.object({
  mediaId: z.string().uuid(),
  tempPath: z.string().regex(/^temp\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/),
  sortOrder: z.number().int().min(0).max(32767),
  isCover: z.boolean()
}).strict();

export type PixelRegion = { left: number; top: number; width: number; height: number };
export const PLATE_REDACTION_HORIZONTAL_MARGIN = 0.2;
export const PLATE_REDACTION_VERTICAL_MARGIN = 0.25;
const PLATE_REDACTION_MASK_COLOR = { r: 72, g: 72, b: 72, alpha: 1 };
export type PrivacyOutcome = "blurred" | "skipped";
export type PrivacyTelemetry = { normalizedWidth: number | null; normalizedHeight: number | null; initialDetectionCount: number | null; validatedInitialRegionCount: number | null; compositedRegionCount: number | null; verificationDetectionCount: number | null };
type PrivacyVision = { detect(request: PlateDetectionRequest): Promise<PlateDetectionOutput>; verify(request: PlateDetectionRequest): Promise<PlatePrivacyVerificationOutput> };
const productionVision: PrivacyVision = { detect: detectLicensePlateRegions, verify: verifyNoReadableLicensePlate };
export class PrivacyProcessingError extends Error { constructor(readonly outcome: "manual_required" | "failed", readonly telemetry: PrivacyTelemetry) { super(outcome); this.name = "PrivacyProcessingError"; } }

export function decidePrivacyOutcome(initialDetectionCount: number, compositedRegionCount: number, verificationDetectionCount: number): PrivacyOutcome | "manual_required" {
  if (initialDetectionCount === 0) return verificationDetectionCount === 0 ? "skipped" : "manual_required";
  return compositedRegionCount > 0 && verificationDetectionCount === 0 ? "blurred" : "manual_required";
}

export async function sanitizePrivatePhoto(input: { bytes: Uint8Array; mimeType: "image/jpeg" | "image/png" | "image/webp"; requestId: string }, vision: PrivacyVision = productionVision) {
  const telemetry: PrivacyTelemetry = { normalizedWidth: null, normalizedHeight: null, initialDetectionCount: null, validatedInitialRegionCount: null, compositedRegionCount: null, verificationDetectionCount: null };
  try {
    if (input.bytes.byteLength === 0 || input.bytes.byteLength > PLATE_REGION_MAX_BYTES) throw new Error("invalid_source_image");
    // rotate() applies EXIF orientation; detector, verifier, and blur calculations share this canonical raster.
    const oriented = await sharp(input.bytes, { limitInputPixels: 40_000_000 }).rotate().webp({ quality: 92 }).toBuffer({ resolveWithObject: true });
    if (!oriented.info.width || !oriented.info.height) throw new Error("invalid_source_image");
    telemetry.normalizedWidth = oriented.info.width; telemetry.normalizedHeight = oriented.info.height;
    const normalizedImage = { mimeType: "image/webp" as const, bytes: oriented.data, width: oriented.info.width, height: oriented.info.height };
    const detection = await vision.detect({ image: normalizedImage, requestId: input.requestId });
    telemetry.initialDetectionCount = detection.plates.length;
    const regions = mapRegions(detection, oriented.info.width, oriented.info.height);
    telemetry.validatedInitialRegionCount = regions.length;
    let sanitized = oriented.data; let compositedRegionCount = 0;
    for (const region of regions) {
      const redaction = expandPlateRedactionRegion(region, oriented.info.width, oriented.info.height);
      const mask = await sharp({ create: { width: redaction.width, height: redaction.height, channels: 4, background: PLATE_REDACTION_MASK_COLOR } }).png().toBuffer();
      sanitized = await sharp(sanitized).composite([{ input: mask, left: redaction.left, top: redaction.top }]).webp({ quality: 92 }).toBuffer();
      compositedRegionCount += 1;
    }
    telemetry.compositedRegionCount = compositedRegionCount;
    const verification = await vision.verify({ image: { ...normalizedImage, bytes: detection.plates.length > 0 ? sanitized : oriented.data }, requestId: input.requestId });
    telemetry.verificationDetectionCount = verification.readable_plate_count;
    const privacyOutcome = decidePrivacyOutcome(detection.plates.length, compositedRegionCount, verification.readable_plate_count);
    if (privacyOutcome === "manual_required") throw new PrivacyProcessingError("manual_required", telemetry);
    const metadata = await sharp(sanitized).metadata();
    if (!metadata.width || !metadata.height) throw new Error("invalid_sanitized_image");
    const variants = await Promise.all(Object.entries(sizes).map(async ([name, maxDimension]) => [name, await sharp(sanitized).resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true }).webp({ quality: name === "thumb" ? 76 : name === "card" ? 80 : name === "large" ? 84 : 90 }).toBuffer()] as const));
    return { variants: Object.fromEntries(variants) as Record<keyof typeof sizes, Buffer>, width: metadata.width, height: metadata.height, aspectRatio: metadata.width / metadata.height, privacyOutcome, telemetry };
  } catch (error) {
    if (error instanceof PrivacyProcessingError) throw error;
    throw new PrivacyProcessingError("failed", telemetry);
  }
}

function mapRegions(detection: PlateDetectionOutput, width: number, height: number): PixelRegion[] {
  return detection.plates.filter((region) => region.confidence >= SANITIZED_PHOTO_PLATE_CONFIDENCE_THRESHOLD).map((region) => {
    const left = Math.floor(region.x * width); const top = Math.floor(region.y * height);
    const right = Math.ceil((region.x + region.width) * width); const bottom = Math.ceil((region.y + region.height) * height);
    const mapped = { left, top, width: right - left, height: bottom - top };
    if (!Number.isSafeInteger(left) || !Number.isSafeInteger(top) || !Number.isSafeInteger(mapped.width) || !Number.isSafeInteger(mapped.height) || left < 0 || top < 0 || mapped.width < 2 || mapped.height < 2 || left + mapped.width > width || top + mapped.height > height) throw new Error("invalid_plate_region");
    return mapped;
  });
}

export function expandPlateRedactionRegion(region: PixelRegion, imageWidth: number, imageHeight: number): PixelRegion {
  const left = Math.max(0, Math.floor(region.left - region.width * PLATE_REDACTION_HORIZONTAL_MARGIN));
  const top = Math.max(0, Math.floor(region.top - region.height * PLATE_REDACTION_VERTICAL_MARGIN));
  const right = Math.min(imageWidth, Math.ceil(region.left + region.width + region.width * PLATE_REDACTION_HORIZONTAL_MARGIN));
  const bottom = Math.min(imageHeight, Math.ceil(region.top + region.height + region.height * PLATE_REDACTION_VERTICAL_MARGIN));
  const width = right - left;
  const height = bottom - top;
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(top) || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) throw new Error("invalid_redaction_region");
  return { left, top, width, height };
}
