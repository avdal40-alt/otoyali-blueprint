import "server-only";

import sharp from "sharp";
import { z } from "zod";
import { detectLicensePlateRegions } from "@/features/ai/photo/plate-region-vision";
import { PLATE_REGION_MAX_BYTES, type PlateDetectionOutput } from "@/features/ai/photo/plate-region-contract";

export const SANITIZED_PHOTO_PLATE_CONFIDENCE_THRESHOLD = 0;
const sizes = { master: 2400, large: 1600, card: 800, thumb: 300 } as const;

export const sanitizedPhotoRequestSchema = z.object({
  mediaId: z.string().uuid(),
  tempPath: z.string().regex(/^temp\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/),
  sortOrder: z.number().int().min(0).max(32767),
  isCover: z.boolean()
}).strict();

type PixelRegion = { left: number; top: number; width: number; height: number };

export async function sanitizePrivatePhoto(input: { bytes: Uint8Array; mimeType: "image/jpeg" | "image/png" | "image/webp"; requestId: string }) {
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > PLATE_REGION_MAX_BYTES) throw new Error("invalid_source_image");
  // rotate() applies EXIF orientation; detector and blur calculations share this canonical raster.
  const oriented = await sharp(input.bytes, { limitInputPixels: 40_000_000 }).rotate().webp({ quality: 92 }).toBuffer({ resolveWithObject: true });
  if (!oriented.info.width || !oriented.info.height) throw new Error("invalid_source_image");
  const detection = await detectLicensePlateRegions({ image: { mimeType: "image/webp", bytes: oriented.data, width: oriented.info.width, height: oriented.info.height }, requestId: input.requestId });
  const regions = mapRegions(detection, oriented.info.width, oriented.info.height);
  let sanitized = oriented.data;
  for (const region of regions) {
    const blurred = await sharp(sanitized).extract(region).blur(30).webp({ quality: 92 }).toBuffer();
    sanitized = await sharp(sanitized).composite([{ input: blurred, left: region.left, top: region.top }]).webp({ quality: 92 }).toBuffer();
  }
  const metadata = await sharp(sanitized).metadata();
  if (!metadata.width || !metadata.height) throw new Error("invalid_sanitized_image");
  const variants = await Promise.all(Object.entries(sizes).map(async ([name, maxDimension]) => [name, await sharp(sanitized).resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true }).webp({ quality: name === "thumb" ? 76 : name === "card" ? 80 : name === "large" ? 84 : 90 }).toBuffer()] as const));
  return { variants: Object.fromEntries(variants) as Record<keyof typeof sizes, Buffer>, width: metadata.width, height: metadata.height, aspectRatio: metadata.width / metadata.height, blurredRegionCount: regions.length };
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
