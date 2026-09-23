import "server-only";
import { z } from "zod";
import type { AiActor } from "../domain/types";
import { aiFeatureSchema } from "../schemas";
export type AiTool = { name: "search" | "listing" | "catalog" | "video"; feature: string; input: z.ZodType; output: z.ZodType; authorize(actor: AiActor): boolean; };
const publicTool = (name: AiTool["name"]): AiTool => ({ name, feature: "assistant_chat", input: z.object({}).strict(), output: z.object({}).strict(), authorize: () => true });
export const AI_TOOLS: Record<AiTool["name"], AiTool> = { search: publicTool("search"), listing: publicTool("listing"), catalog: publicTool("catalog"), video: publicTool("video") };
export function getAiTool(name: string, actor: AiActor) { const tool = AI_TOOLS[name as keyof typeof AI_TOOLS]; return tool && aiFeatureSchema.safeParse(tool.feature).success && tool.authorize(actor) ? tool : null; }
