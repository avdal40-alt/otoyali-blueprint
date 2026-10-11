import { isPlainObject, isSavedSearchRequest, parseSavedSearchId, rpcErrorStatus } from "@/lib/saved-search/contract";

export { isPlainObject, parseSavedSearchId as parseBuyerRequestId, rpcErrorStatus };

export const buyerRequestResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization"
};

export function isBuyerRequestCriteria(value: unknown) {
  return isSavedSearchRequest(value);
}

export function validBuyerRequestTitle(value: unknown) {
  return typeof value === "string" && Array.from(value.trim()).length <= 120;
}

export function buyerRequestErrorMessage(status: number) {
  if (status === 401) return "Oturum gerekli.";
  if (status === 422) return "Geçersiz alım talebi.";
  if (status === 404) return "Alım talebi kullanılamıyor.";
  return "Alım talebi şu anda kullanılamıyor.";
}
