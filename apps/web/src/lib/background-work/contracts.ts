/**
 * Provider-neutral contracts for follow-up work that must not delay an HTTP
 * response after the authoritative write has committed. This module does not
 * enqueue, execute, or retry work; a future measured implementation may bind
 * these contracts to a provider.
 */

export const BACKGROUND_WORK_KINDS = [
  "image_processing",
  "notification_delivery",
  "analytics_projection",
  "saved_search_matching",
  "dealer_inventory_import",
  "ai_deferred_execution",
  "search_indexing"
] as const;

export type BackgroundWorkKind = (typeof BACKGROUND_WORK_KINDS)[number];

export type BackgroundWorkSubject = Readonly<{
  kind: string;
  id: string;
}>;

export type BackgroundWorkCommand<TPayload extends Record<string, unknown> = Record<string, unknown>> = Readonly<{
  version: 1;
  kind: BackgroundWorkKind;
  /** Stable across delivery attempts for exactly-once-effect handling. */
  idempotencyKey: string;
  /** Correlates safe structured logs and traces; never carries PII. */
  correlationId: string;
  /** The trusted server-side actor that authorized creation of this command. */
  actorId: string | null;
  subject: BackgroundWorkSubject;
  payload: TPayload;
  occurredAt: string;
}>;

export type BackgroundWorkResult =
  | Readonly<{ status: "completed"; idempotencyKey: string }>
  | Readonly<{ status: "retryable_failure"; idempotencyKey: string; retryAfterSeconds: number }>
  | Readonly<{ status: "permanent_failure"; idempotencyKey: string; reason: string }>;

/** A provider adapter must preserve the command unchanged and return only this result contract. */
export type BackgroundWorkDispatchContext = Readonly<{
  attempt: number;
  signal: AbortSignal;
}>;

export interface BackgroundWorkDispatcher {
  dispatch(command: BackgroundWorkCommand, context: BackgroundWorkDispatchContext): Promise<BackgroundWorkResult>;
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function assertIdentifier(value: string, field: string): void {
  if (!IDENTIFIER.test(value)) throw new Error(`${field} must be a safe non-empty identifier`);
}

export function createBackgroundWorkCommand<TPayload extends Record<string, unknown>>(
  command: BackgroundWorkCommand<TPayload>
): BackgroundWorkCommand<TPayload> {
  assertIdentifier(command.idempotencyKey, "idempotencyKey");
  assertIdentifier(command.correlationId, "correlationId");
  assertIdentifier(command.subject.kind, "subject.kind");
  assertIdentifier(command.subject.id, "subject.id");
  if (command.actorId !== null) assertIdentifier(command.actorId, "actorId");
  if (!BACKGROUND_WORK_KINDS.includes(command.kind)) throw new Error("kind must be a supported background-work kind");
  if (!ISO_TIMESTAMP.test(command.occurredAt) || Number.isNaN(Date.parse(command.occurredAt))) throw new Error("occurredAt must be an ISO timestamp");
  return Object.freeze({ ...command, subject: Object.freeze({ ...command.subject }), payload: Object.freeze({ ...command.payload }) });
}
