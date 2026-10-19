import "server-only";

import { isAiFeatureEnabled } from "../feature-registry";
import { getConfiguredAiProvider } from "../providers/provider-registry";
import { getNormalizedImageMetadata, logPlateRegionZodFailure } from "./plate-region-observability";
import {
  plateDetectionOutputSchema,
  platePrivacyVerificationOutputSchema,
  privateVisionImageInputSchema,
  type PlateDetectionOutput,
  type PlatePrivacyVerificationOutput,
  type PlateDetectionRequest
} from "./plate-region-contract";

/**
 * Detect normalized [0,1] plate rectangles from a private image already retrieved
 * under server authorization. This operation is read-only and rejects unsafe output.
 */
export async function detectLicensePlateRegions(request: PlateDetectionRequest): Promise<PlateDetectionOutput> {
  const metadata = getNormalizedImageMetadata(request.image, request.requestId);
  let image;
  try {
    image = privateVisionImageInputSchema.parse(request.image);
  } catch (error) {
    logPlateRegionZodFailure("normalized_image_input", error, metadata);
    throw error;
  }
  if (!isAiFeatureEnabled("ai_vision")) throw new Error("vision_feature_disabled");

  const provider = getConfiguredAiProvider();
  if (!(await provider.isAvailable())) throw new Error("vision_provider_unavailable");

  const providerOutput = await provider.detectPlateRegions({ ...request, image });
  try {
    return plateDetectionOutputSchema.parse(providerOutput);
  } catch (error) {
    logPlateRegionZodFailure("normalized_plate_regions", error, metadata);
    throw error;
  }
}

/**
 * A semantically distinct pass over a raster: it answers only whether a readable
 * plate remains, without returning plate text or coordinates.
 */
export async function verifyNoReadableLicensePlate(request: PlateDetectionRequest): Promise<PlatePrivacyVerificationOutput> {
  const metadata = getNormalizedImageMetadata(request.image, request.requestId);
  let image;
  try {
    image = privateVisionImageInputSchema.parse(request.image);
  } catch (error) {
    logPlateRegionZodFailure("normalized_image_input", error, metadata);
    throw error;
  }
  if (!isAiFeatureEnabled("ai_vision")) throw new Error("vision_feature_disabled");

  const provider = getConfiguredAiProvider();
  if (!(await provider.isAvailable())) throw new Error("vision_provider_unavailable");

  const providerOutput = await provider.verifyPlatePrivacy({ ...request, image });
  try {
    return platePrivacyVerificationOutputSchema.parse(providerOutput);
  } catch (error) {
    logPlateRegionZodFailure("normalized_plate_verification", error, metadata);
    throw error;
  }
}
