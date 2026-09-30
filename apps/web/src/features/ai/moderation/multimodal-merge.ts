import "server-only";

export type MultimodalAction = "allow" | "ask_edit" | "review";
export type MergeableModerationSignal = { code: string; field: string; evidence: string; recommendedAction: MultimodalAction };

/** Keeps independent bounded evidence while applying the existing action precedence. */
export function mergeMultimodalSignals<T extends MergeableModerationSignal>(signals: readonly T[]): T[] {
  return signals.filter((signal, index) => signals.findIndex((candidate) => candidate.code === signal.code && candidate.field === signal.field && candidate.evidence === signal.evidence) === index);
}

export function multimodalActionFor(signals: readonly MergeableModerationSignal[]): MultimodalAction {
  return signals.some((signal) => signal.recommendedAction === "review") ? "review" : signals.some((signal) => signal.recommendedAction === "ask_edit") ? "ask_edit" : "allow";
}
