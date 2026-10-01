import "server-only";

export type ProviderStart = { kind: "sent"; reference: string } | { kind: "not_configured" | "rate_limited" | "unavailable" };
export type ProviderCheck = "approved" | "rejected" | "expired" | "unavailable" | "not_configured";
export interface SellerPhoneVerificationProvider { start(phone: string): Promise<ProviderStart>; check(phone: string, code: string): Promise<ProviderCheck>; }

function config() { return { accountSid: process.env.TWILIO_ACCOUNT_SID?.trim(), authToken: process.env.TWILIO_AUTH_TOKEN?.trim(), serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID?.trim() }; }
function basic(username: string, password: string) { return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`; }
export function createTwilioVerifyProvider(fetcher: typeof fetch = fetch): SellerPhoneVerificationProvider {
  return {
    async start(phone) { const c=config(); if (!c.accountSid || !c.authToken || !c.serviceSid) return { kind: "not_configured" }; try { const r=await fetcher(`https://verify.twilio.com/v2/Services/${encodeURIComponent(c.serviceSid)}/Verifications`,{method:"POST",headers:{Authorization:basic(c.accountSid,c.authToken),"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({To:phone,Channel:"sms"}),cache:"no-store"}); if (r.status===429) return {kind:"rate_limited"}; if(!r.ok)return {kind:"unavailable"}; const b=await r.json() as {sid?:unknown}; return typeof b.sid==="string"&&/^VE[0-9a-f]{32}$/i.test(b.sid)?{kind:"sent",reference:b.sid}:{kind:"unavailable"}; } catch { return {kind:"unavailable"}; } },
    async check(phone,code) { const c=config(); if (!c.accountSid || !c.authToken || !c.serviceSid) return "not_configured"; try { const r=await fetcher(`https://verify.twilio.com/v2/Services/${encodeURIComponent(c.serviceSid)}/VerificationCheck`,{method:"POST",headers:{Authorization:basic(c.accountSid,c.authToken),"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({To:phone,Code:code}),cache:"no-store"}); if(r.status===404)return "expired"; if(!r.ok)return r.status===429?"rejected":"unavailable"; const b=await r.json() as {status?:unknown}; return b.status==="approved"?"approved":"rejected"; } catch{return "unavailable";} }
  };
}
export function createDeterministicSellerPhoneVerificationProvider(code="123456"): SellerPhoneVerificationProvider { let n=0; return { async start(){return {kind:"sent",reference:`test-${++n}`};}, async check(_phone,input){return input===code?"approved":"rejected";} }; }
export function getSellerPhoneVerificationProvider(): SellerPhoneVerificationProvider | null { if(process.env.SELLER_PHONE_VERIFICATION_PROVIDER!=="twilio_verify") return null; return createTwilioVerifyProvider(); }
