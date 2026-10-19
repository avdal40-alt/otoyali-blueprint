import "server-only";

import { ZodError, type ZodIssue } from "zod";
import { safeLog } from "@/lib/observability/safe-logger";

export type PlateRegionValidationBoundary = "normalized_image_input" | "openai_plate_output" | "normalized_plate_regions";

type NormalizedImageMetadata = {
  mimeType: string | null;
  width: number | null;
  height: number | null;
  byteLength: number | null;
  correlationId?: string;
};

/** Logs schema structure only; raw provider data and private image content never reach this boundary. */
export function logPlateRegionZodFailure(boundary: PlateRegionValidationBoundary, error: unknown, image: NormalizedImageMetadata) {
  if (!(error instanceof ZodError)) return false;

  safeLog("warn", "plate_region_validation_failed", {
    validation_boundary: boundary,
    zod_issue_count: error.issues.length,
    zod_issues: error.issues.slice(0, 20).map((issue) => ({
      issue_fields: safeIssuePath(issue),
      issue_code: issue.code,
      issue_category: issueCategory(issue)
    })),
    normalized_image_width: image.width,
    normalized_image_height: image.height,
    normalized_byte_length: image.byteLength,
    normalized_mime_type: image.mimeType,
    correlation_id: image.correlationId ?? null
  });
  return true;
}

export function getNormalizedImageMetadata(image: unknown, correlationId?: string): NormalizedImageMetadata {
  const candidate = image && typeof image === "object" ? image as Record<string, unknown> : {};
  const bytes = candidate.bytes;
  return {
    mimeType: typeof candidate.mimeType === "string" ? candidate.mimeType : null,
    width: isSafeDimension(candidate.width) ? candidate.width : null,
    height: isSafeDimension(candidate.height) ? candidate.height : null,
    byteLength: bytes instanceof Uint8Array ? bytes.byteLength : null,
    correlationId
  };
}

function safeIssuePath(issue: ZodIssue) {
  return issue.path.slice(0, 10).map((segment) => typeof segment === "number" ? segment : segment.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64));
}

function issueCategory(issue: ZodIssue) {
  switch (issue.code) {
    case "invalid_type": return "type";
    case "invalid_enum_value": return "enum";
    case "unrecognized_keys": return "object_shape";
    case "too_small":
    case "too_big": return "range";
    case "custom": return "constraint";
    default: return "validation";
  }
}

function isSafeDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 40_000_000;
}
