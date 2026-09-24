import "server-only";

import { isAiFeatureEnabled } from "../feature-registry";
import { getConfiguredAiProvider } from "../providers/provider-registry";
import {
  plateDetectionOutputSchema,
  privateVisionImageInputSchema,
  type PlateDetectionOutput,
  type PlateDetectionRequest
} from "./plate-region-contract";

/**
 * Detect normalized [0,1] plate rectangles from a private image already retrieved
 * under server authorization. This operation is read-only and rejects unsafe output.
 */
export async function detectLicensePlateRegions(request: PlateDetectionRequest): Promise<PlateDetectionOutput> {
  const image = privateVisionImageInputSchema.parse(request.image);
  if (!isAiFeatureEnabled("ai_vision")) throw new Error("vision_feature_disabled");

  const provider = getConfiguredAiProvider();
  if (!(await provider.isAvailable())) throw new Error("vision_provider_unavailable");

  return plateDetectionOutputSchema.parse(await provider.detectPlateRegions({ ...request, image }));
}
