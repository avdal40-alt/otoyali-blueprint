import { z } from "zod";

export const aiFeatureSchema = z.enum(["assistant_chat", "ai_search", "ai_listing_qa", "ai_compare", "ai_sell", "ai_vision", "ai_price", "ai_vin", "ai_moderation"]);
export const aiProviderSchema = z.enum(["local", "openai", "disabled"]);
export const aiModelClassSchema = z.enum(["FAST", "REASONING", "VISION"]);
export const aiToolRequestSchema = z.object({ name: z.enum(["search", "listing", "catalog", "video"]), input: z.record(z.unknown()) }).strict();
export const aiProviderResponseSchema = z.object({
  status: z.enum(["success", "unavailable", "unsupported", "needs_clarification", "blocked", "error"]),
  message: z.string().min(1).max(1200),
  warnings: z.array(z.enum(["informational_only", "verify_independently", "incomplete_data", "provider_unavailable", "feature_not_connected"])).max(5).optional()
}).strict();
