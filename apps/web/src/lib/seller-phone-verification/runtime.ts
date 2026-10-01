import "server-only";

import { createClient } from "@supabase/supabase-js";
import { maskE164Phone, parseAuthPhoneNumber } from "@/lib/auth/phone";
import { getSellerPhoneVerificationProvider, type SellerPhoneVerificationProvider } from "@/lib/seller-phone-verification/provider";

type RpcResult<T> = PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>;
export type SellerPhoneVerificationService = { rpc<T>(name: string, args: Record<string, unknown>): RpcResult<T> };
export type SellerPhoneVerificationFailure = { ok: false; status: number; code: string; retryAfterSeconds?: number };
type StartSuccess = { ok: true; challengeId: string; expiresAt: string; maskedPhone: string; status: "sent" };
type VerifySuccess = { ok: true; status: "verified" };

export function normalizeTurkeySellerPhone(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim().startsWith("+")) return null;
  const parsed = parseAuthPhoneNumber(value, "TR");
  return parsed.ok && parsed.country === "TR" && /^\+90[1-9][0-9]{9}$/.test(parsed.e164) ? parsed.e164 : null;
}

function serviceClient(): SellerPhoneVerificationService | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

function row<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }
function unavailable(): SellerPhoneVerificationFailure { return { ok: false, status: 503, code: "verification_unavailable" }; }

export async function startSellerPhoneVerification(input: { userId: string; phone: unknown; service?: SellerPhoneVerificationService | null; provider?: SellerPhoneVerificationProvider | null }): Promise<StartSuccess | SellerPhoneVerificationFailure> {
  const phone = normalizeTurkeySellerPhone(input.phone);
  if (!phone) return { ok: false, status: 422, code: "invalid_phone" };
  const service = input.service ?? serviceClient();
  const provider = input.provider ?? getSellerPhoneVerificationProvider();
  if (!service || !provider) return unavailable();
  const reserved = await service.rpc<{ challenge_id: string; outcome: string; retry_after_seconds: number | null }>("reserve_seller_phone_verification_challenge_service", { p_user_id: input.userId, p_phone_e164: phone });
  const challenge = row(reserved.data);
  if (reserved.error || !challenge) return unavailable();
  if (challenge.outcome === "rate_limited") return { ok: false, status: 429, code: "rate_limited", retryAfterSeconds: challenge.retry_after_seconds ?? undefined };
  if (challenge.outcome !== "reserved" || !challenge.challenge_id) return unavailable();
  const sent = await provider.start(phone);
  if (sent.kind !== "sent") return { ok: false, status: sent.kind === "rate_limited" ? 429 : 503, code: sent.kind === "rate_limited" ? "rate_limited" : "verification_unavailable" };
  const marked = await service.rpc<boolean>("mark_seller_phone_verification_challenge_sent_service", { p_challenge_id: challenge.challenge_id, p_provider_reference: sent.reference });
  if (marked.error || marked.data !== true) return unavailable();
  return { ok: true, challengeId: challenge.challenge_id, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), maskedPhone: maskE164Phone(phone), status: "sent" };
}

export async function verifySellerPhoneVerification(input: { userId: string; challengeId: unknown; code: unknown; service?: SellerPhoneVerificationService | null; provider?: SellerPhoneVerificationProvider | null }): Promise<VerifySuccess | SellerPhoneVerificationFailure> {
  if (typeof input.challengeId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(input.challengeId) || typeof input.code !== "string" || !/^\d{4,10}$/.test(input.code)) return { ok: false, status: 422, code: "invalid_input" };
  const service = input.service ?? serviceClient();
  const provider = input.provider ?? getSellerPhoneVerificationProvider();
  if (!service || !provider) return unavailable();
  const fetched = await service.rpc<{ phone_e164: string; purpose: string; provider: string; provider_reference: string | null; status: string; expires_at: string }>("get_seller_phone_verification_challenge_service", { p_user_id: input.userId, p_challenge_id: input.challengeId });
  const challenge = row(fetched.data);
  if (fetched.error) return unavailable();
  if (!challenge || challenge.purpose !== "turkey_seller_contact" || challenge.provider !== "twilio_verify" || challenge.status !== "sent" || !challenge.provider_reference || Date.parse(challenge.expires_at) <= Date.now()) return { ok: false, status: 409, code: "challenge_unavailable" };
  const checked = await provider.check(challenge.phone_e164, input.code);
  if (checked === "unavailable" || checked === "not_configured") return unavailable();
  if (checked !== "approved") return { ok: false, status: 422, code: "invalid_code" };
  const finalized = await service.rpc<{ phone_e164: string }>("finalize_seller_phone_verification_service", { p_user_id: input.userId, p_challenge_id: input.challengeId });
  if (finalized.error) return { ok: false, status: finalized.error.code === "23505" ? 409 : 503, code: finalized.error.code === "23505" ? "phone_already_verified" : "verification_unavailable" };
  if (!row(finalized.data)?.phone_e164) return { ok: false, status: 409, code: "challenge_unavailable" };
  return { ok: true, status: "verified" };
}
