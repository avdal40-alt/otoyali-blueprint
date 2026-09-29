import type { AiCapabilityId, AiRequest, AiResponse } from "../domain/types";
import type { PlateDetectionOutput, PlateDetectionRequest } from "../photo/plate-region-contract";
import type { ContextualModerationOutput, ContextualModerationProviderInput } from "../moderation/contextual-moderation";

export type AiProvider = {
  id: AiResponse["provider"];
  isAvailable(): boolean | Promise<boolean>;
  getCapabilities(): AiCapabilityId[];
  generate(request: AiRequest): Promise<AiResponse>;
  detectPlateRegions(request: PlateDetectionRequest): Promise<PlateDetectionOutput>;
  moderateListingContext(input: ContextualModerationProviderInput): Promise<ContextualModerationOutput>;
};
