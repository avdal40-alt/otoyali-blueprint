import "server-only";

import type { BackgroundWorkCommand, BackgroundWorkDispatcher, BackgroundWorkResult } from "./contracts";
import { recordTelemetry } from "../observability/telemetry";

export const BACKGROUND_WORK_RETRY_POLICY_VERSION = "jlc-1504-v1";

export type BackgroundWorkRetryPolicy = Readonly<{
  maxAttempts: number;
  timeoutMs: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
}>;

export const DEFAULT_BACKGROUND_WORK_RETRY_POLICY: BackgroundWorkRetryPolicy = Object.freeze({
  maxAttempts: 3,
  timeoutMs: 5_000,
  baseBackoffMs: 250,
  maxBackoffMs: 2_000
});

export type BackgroundWorkExecution = Readonly<{
  result: BackgroundWorkResult;
  attempts: number;
}>;

type Wait = (milliseconds: number) => Promise<void>;

const wait: Wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Runs a deferred provider operation with a bounded, abortable retry budget.
 * Each retry receives the original immutable command, including its idempotency
 * key. Dispatchers must still deduplicate effects durably at their canonical
 * handler/store boundary; process memory is never used as an idempotency store.
 */
export async function dispatchBackgroundWorkWithResilience(
  dispatcher: BackgroundWorkDispatcher,
  command: BackgroundWorkCommand,
  policy: BackgroundWorkRetryPolicy = DEFAULT_BACKGROUND_WORK_RETRY_POLICY,
  sleep: Wait = wait
): Promise<BackgroundWorkExecution> {
  validatePolicy(policy);
  const startedAt = performance.now();

  const complete = (execution: BackgroundWorkExecution): BackgroundWorkExecution => {
    recordTelemetry(
      { path: "job", operation: "background_work.dispatch", correlationId: command.correlationId },
      execution.result.status === "completed" ? "success" : execution.result.status === "retryable_failure" ? "retryable_failure" : "failure",
      startedAt
    );
    return execution;
  };

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let rejectTimeout: ((reason?: unknown) => void) | null = null;
    const timeoutFailure = new Promise<never>((_resolve, reject) => {
      rejectTimeout = reject;
    });
    const timeout = setTimeout(() => {
      controller.abort();
      rejectTimeout?.(new Error("background_work_timeout"));
    }, policy.timeoutMs);

    try {
      const result = await Promise.race([dispatcher.dispatch(command, { attempt, signal: controller.signal }), timeoutFailure]);
      if (result.idempotencyKey !== command.idempotencyKey) {
        return complete({ attempts: attempt, result: { status: "permanent_failure", idempotencyKey: command.idempotencyKey, reason: "idempotency_key_mismatch" } });
      }
      if (result.status !== "retryable_failure" || attempt === policy.maxAttempts) return complete({ attempts: attempt, result });
      await sleep(backoffForAttempt(attempt, policy));
    } catch {
      if (attempt === policy.maxAttempts) {
        return complete({
          attempts: attempt,
          result: {
            status: "retryable_failure",
            idempotencyKey: command.idempotencyKey,
            retryAfterSeconds: Math.max(1, Math.ceil(backoffForAttempt(attempt, policy) / 1_000))
          }
        });
      }
      await sleep(backoffForAttempt(attempt, policy));
    } finally {
      clearTimeout(timeout);
    }
  }

  return complete({
    attempts: policy.maxAttempts,
    result: { status: "retryable_failure", idempotencyKey: command.idempotencyKey, retryAfterSeconds: Math.max(1, Math.ceil(policy.maxBackoffMs / 1_000)) }
  });
}

export function backoffForAttempt(attempt: number, policy: BackgroundWorkRetryPolicy = DEFAULT_BACKGROUND_WORK_RETRY_POLICY): number {
  return Math.min(policy.maxBackoffMs, policy.baseBackoffMs * 2 ** Math.max(0, attempt - 1));
}

function validatePolicy(policy: BackgroundWorkRetryPolicy): void {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 5) throw new Error("maxAttempts must be an integer from 1 to 5");
  if (!Number.isInteger(policy.timeoutMs) || policy.timeoutMs < 100 || policy.timeoutMs > 60_000) throw new Error("timeoutMs must be an integer from 100 to 60000");
  if (!Number.isInteger(policy.baseBackoffMs) || policy.baseBackoffMs < 0 || policy.baseBackoffMs > policy.maxBackoffMs) throw new Error("baseBackoffMs must be a non-negative integer no greater than maxBackoffMs");
  if (!Number.isInteger(policy.maxBackoffMs) || policy.maxBackoffMs < 0 || policy.maxBackoffMs > 60_000) throw new Error("maxBackoffMs must be an integer from 0 to 60000");
}
