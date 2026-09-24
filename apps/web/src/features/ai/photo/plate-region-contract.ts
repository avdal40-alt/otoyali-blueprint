import "server-only";

import { z } from "zod";

export const PLATE_REGION_MAX_BYTES = 10 * 1024 * 1024;
export const PLATE_REGION_MAX_REGIONS = 10;
const plateRegionMimeTypeSchema = z.enum(["image/jpeg", "image/png", "image/webp"]);

/** A private, server-obtained image. Bytes must never cross an API response boundary. */
export type PrivateVisionImageInput = {
  mimeType: z.infer<typeof plateRegionMimeTypeSchema>;
  bytes: Uint8Array;
  width?: number;
  height?: number;
};

export const privateVisionImageInputSchema = z
  .object({
    mimeType: plateRegionMimeTypeSchema,
    bytes: z.instanceof(Uint8Array),
    width: z.number().int().positive().max(8192).optional(),
    height: z.number().int().positive().max(8192).optional()
  })
  .strict()
  .superRefine((image, context) => {
    if (image.bytes.byteLength === 0 || image.bytes.byteLength > PLATE_REGION_MAX_BYTES) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["bytes"], message: "Image bytes must be between 1 byte and 10 MiB." });
    }
  });

const finiteNormalizedNumber = z.number().finite();
export const plateRegionSchema = z
  .object({
    x: finiteNormalizedNumber.min(0).max(1),
    y: finiteNormalizedNumber.min(0).max(1),
    width: finiteNormalizedNumber.gt(0).max(1),
    height: finiteNormalizedNumber.gt(0).max(1),
    confidence: finiteNormalizedNumber.min(0).max(1)
  })
  .strict()
  .superRefine((region, context) => {
    const area = region.width * region.height;
    const aspectRatio = region.width / region.height;
    if (region.x + region.width > 1 || region.y + region.height > 1) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Plate region must be contained within normalized image bounds." });
    }
    if (area < 0.00005 || area > 0.35) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Plate region area is outside allowed bounds." });
    }
    if (aspectRatio < 1.2 || aspectRatio > 12) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Plate region aspect ratio is outside allowed bounds." });
    }
  });

export const plateDetectionOutputSchema = z
  .object({ plates: z.array(plateRegionSchema).max(PLATE_REGION_MAX_REGIONS) })
  .strict();

export type PlateDetectionOutput = z.infer<typeof plateDetectionOutputSchema>;
export type PlateDetectionRequest = {
  image: PrivateVisionImageInput;
  locale?: "tr" | "en";
  requestId?: string;
};
