import "server-only";

import { plateDetectionOutputSchema, type PlateDetectionRequest } from "./plate-region-contract";

/**
 * Local test fixture provider. The marker is read only from server-supplied bytes;
 * it is not an API or browser authority and is never persisted.
 */
export function detectPlateRegionsDeterministically(request: PlateDetectionRequest) {
  const marker = new TextDecoder().decode(request.image.bytes.subarray(0, 128));
  if (marker.includes("fixture:provider-error")) throw new Error("vision_provider_error");
  if (marker.includes("fixture:negative")) return plateDetectionOutputSchema.parse({ plates: [{ x: -0.1, y: 0.4, width: 0.2, height: 0.06, confidence: 0.9 }] });
  if (marker.includes("fixture:zero")) return plateDetectionOutputSchema.parse({ plates: [{ x: 0.2, y: 0.4, width: 0, height: 0.06, confidence: 0.9 }] });
  if (marker.includes("fixture:nonfinite")) return plateDetectionOutputSchema.parse({ plates: [{ x: Number.NaN, y: 0.4, width: 0.2, height: 0.06, confidence: 0.9 }] });
  if (marker.includes("fixture:out-of-range")) return plateDetectionOutputSchema.parse({ plates: [{ x: 0.9, y: 0.4, width: 0.2, height: 0.06, confidence: 0.9 }] });
  if (marker.includes("fixture:oversized")) return plateDetectionOutputSchema.parse({ plates: [{ x: 0.1, y: 0.1, width: 0.8, height: 0.8, confidence: 0.9 }] });
  if (marker.includes("fixture:too-many")) return plateDetectionOutputSchema.parse({ plates: Array.from({ length: 11 }, () => ({ x: 0.2, y: 0.4, width: 0.22, height: 0.06, confidence: 0.9 })) });
  if (marker.includes("fixture:extra-field")) return plateDetectionOutputSchema.parse({ plates: [{ x: 0.2, y: 0.4, width: 0.22, height: 0.06, confidence: 0.9, text: "untrusted" }] });
  if (marker.includes("fixture:multiple")) return plateDetectionOutputSchema.parse({ plates: [{ x: 0.12, y: 0.35, width: 0.24, height: 0.06, confidence: 0.94 }, { x: 0.56, y: 0.48, width: 0.2, height: 0.05, confidence: 0.81 }] });
  if (marker.includes("fixture:low-confidence")) return plateDetectionOutputSchema.parse({ plates: [{ x: 0.2, y: 0.4, width: 0.22, height: 0.06, confidence: 0.1 }] });
  if (marker.includes("fixture:one")) return plateDetectionOutputSchema.parse({ plates: [{ x: 0.2, y: 0.4, width: 0.22, height: 0.06, confidence: 0.91 }] });
  return plateDetectionOutputSchema.parse({ plates: [] });
}
