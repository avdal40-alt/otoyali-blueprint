import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { BookingDomainError } from "../domain/types";

export type BookingSupabaseClient = SupabaseClient;

export function resolveBookingSupabaseClient(client?: BookingSupabaseClient) {
  if (client) return client;
  if (!hasSupabaseEnv()) {
    throw new BookingDomainError("missing_supabase_env", "Supabase environment variables are missing.");
  }
  return getSupabaseServerClient();
}

export function mapBookingDatabaseError(message?: string | null) {
  const text = message ?? "Booking database operation failed.";
  if (text.includes("not available") || text.includes("overlap") || text.includes("conflict")) {
    return new BookingDomainError("not_available", text);
  }
  if (text.includes("permission") || text.includes("requires") || text.includes("cannot manage")) {
    return new BookingDomainError("not_authorized", text);
  }
  if (text.includes("not found")) {
    return new BookingDomainError("not_found", text);
  }
  return new BookingDomainError("database_error", text);
}
