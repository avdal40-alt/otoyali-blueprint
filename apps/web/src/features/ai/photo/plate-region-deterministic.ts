import "server-only";

import sharp from "sharp";
import { plateDetectionOutputSchema, type PlateDetectionRequest } from "./plate-region-contract";

type FixtureKind = "provider-error" | "negative" | "zero" | "nonfinite" | "out-of-range" | "oversized" | "too-many" | "extra-field" | "multiple" | "low-confidence" | "one";

const markerBlockSize = 8;
const markerSignature = [0, 1, 0, 1] as const;
const fixtureKinds: { readonly [code: number]: FixtureKind | undefined } = {
  1: "one", 2: "multiple", 3: "low-confidence", 4: "provider-error", 5: "negative", 6: "zero", 7: "nonfinite", 8: "out-of-range", 9: "oversized", 10: "too-many", 11: "extra-field"
};

/**
 * Local-only synthetic fixtures encode a high-contrast 8-block panel in the
 * top-left pixels. Unlike the previous byte-prefix marker, it survives the
 * canonical decode/rotate/WebP normalization path. It is not an OCR or a
 * production detection mechanism.
 */
export async function detectPlateRegionsDeterministically(request: PlateDetectionRequest) {
  const fixture = await readFixtureKind(request.image.bytes);
  if (fixture === "provider-error") throw new Error("vision_provider_error");
  if (fixture === "negative") return plateDetectionOutputSchema.parse({ plates: [{ x: -0.1, y: 0.4, width: 0.2, height: 0.06, confidence: 0.9 }] });
  if (fixture === "zero") return plateDetectionOutputSchema.parse({ plates: [{ x: 0.2, y: 0.4, width: 0, height: 0.06, confidence: 0.9 }] });
  if (fixture === "nonfinite") return plateDetectionOutputSchema.parse({ plates: [{ x: Number.NaN, y: 0.4, width: 0.2, height: 0.06, confidence: 0.9 }] });
  if (fixture === "out-of-range") return plateDetectionOutputSchema.parse({ plates: [{ x: 0.9, y: 0.4, width: 0.2, height: 0.06, confidence: 0.9 }] });
  if (fixture === "oversized") return plateDetectionOutputSchema.parse({ plates: [{ x: 0.1, y: 0.1, width: 0.8, height: 0.8, confidence: 0.9 }] });
  if (fixture === "too-many") return plateDetectionOutputSchema.parse({ plates: Array.from({ length: 11 }, () => ({ x: 0.2, y: 0.4, width: 0.22, height: 0.06, confidence: 0.9 })) });
  if (fixture === "extra-field") return plateDetectionOutputSchema.parse({ plates: [{ x: 0.2, y: 0.4, width: 0.22, height: 0.06, confidence: 0.9, text: "untrusted" }] });
  if (fixture === "multiple") return plateDetectionOutputSchema.parse({ plates: [{ x: 0.12, y: 0.35, width: 0.24, height: 0.06, confidence: 0.94 }, { x: 0.56, y: 0.48, width: 0.2, height: 0.05, confidence: 0.81 }] });
  if (fixture === "low-confidence") return plateDetectionOutputSchema.parse({ plates: [{ x: 0.2, y: 0.4, width: 0.22, height: 0.06, confidence: 0.1 }] });
  if (fixture === "one") return plateDetectionOutputSchema.parse({ plates: [{ x: 0.2, y: 0.4, width: 0.22, height: 0.06, confidence: 0.91 }] });
  return plateDetectionOutputSchema.parse({ plates: [] });
}

async function readFixtureKind(bytes: Uint8Array): Promise<FixtureKind | null> {
  try {
    const normalized = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
    if (!normalized.info.width || !normalized.info.height || normalized.info.width < markerBlockSize * 8 || normalized.info.height < markerBlockSize || normalized.info.channels < 3) return null;
    const bits = Array.from({ length: 8 }, (_, index) => readMarkerBit(normalized.data, normalized.info.width, normalized.info.channels, index));
    if (!markerSignature.every((bit, index) => bits[index] === bit)) return null;
    const code = bits.slice(markerSignature.length).reduce<number>((value, bit) => value * 2 + bit, 0);
    return fixtureKinds[code] ?? null;
  } catch {
    return null;
  }
}

function readMarkerBit(bytes: Buffer, width: number, channels: number, block: number) {
  let total = 0;
  for (let y = 2; y < markerBlockSize - 2; y += 1) for (let x = block * markerBlockSize + 2; x < (block + 1) * markerBlockSize - 2; x += 1) {
    const offset = (y * width + x) * channels;
    total += bytes[offset] + bytes[offset + 1] + bytes[offset + 2];
  }
  return total / 48 > 128 ? 1 : 0;
}
