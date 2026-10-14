import "server-only";

import { randomUUID } from "node:crypto";
import { safeLog } from "./safe-logger";

export const TELEMETRY_CONTRACT_VERSION = "jlc-1505-v1";

export type TelemetryPath = "api" | "db" | "job";
export type TelemetryOutcome = "success" | "failure" | "retryable_failure";

export type TelemetryContext = Readonly<{
  path: TelemetryPath;
  operation: string;
  correlationId: string;
}>;

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

export function createCorrelationId(prefix: "api" | "db" | "job" = "api"): string {
  return `${prefix}:${randomUUID()}`;
}

export function correlationIdFromRequest(headers: Headers): string {
  const supplied = headers.get("x-request-id")?.trim();
  return supplied && IDENTIFIER.test(supplied) ? supplied : createCorrelationId("api");
}

export function recordTelemetry(context: TelemetryContext, outcome: TelemetryOutcome, startedAt: number): void {
  assertContext(context);
  const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
  safeLog(outcome === "failure" ? "error" : outcome === "retryable_failure" ? "warn" : "info", "operation_telemetry", {
    telemetryVersion: TELEMETRY_CONTRACT_VERSION,
    path: context.path,
    operation: context.operation,
    correlationId: context.correlationId,
    outcome,
    durationMs
  });
}

export async function observeOperation<T>(context: TelemetryContext, operation: () => PromiseLike<T>, isFailure: (result: T) => boolean = () => false): Promise<T> {
  const startedAt = performance.now();
  try {
    const result = await operation();
    recordTelemetry(context, isFailure(result) ? "failure" : "success", startedAt);
    return result;
  } catch (error) {
    recordTelemetry(context, "failure", startedAt);
    throw error;
  }
}

function assertContext(context: TelemetryContext): void {
  if (!IDENTIFIER.test(context.operation)) throw new Error("operation must be a safe non-empty identifier");
  if (!IDENTIFIER.test(context.correlationId)) throw new Error("correlationId must be a safe non-empty identifier");
}
