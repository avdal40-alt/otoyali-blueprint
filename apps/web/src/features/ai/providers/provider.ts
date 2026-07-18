import type { AiCapabilityId, AiRequest, AiResponse } from "../domain/types";

export type AiProvider = {
  id: AiResponse["provider"];
  isAvailable(): boolean | Promise<boolean>;
  getCapabilities(): AiCapabilityId[];
  generate(request: AiRequest): Promise<AiResponse>;
};
