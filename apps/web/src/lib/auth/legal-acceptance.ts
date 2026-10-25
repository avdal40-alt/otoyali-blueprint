import { JOLMOD_LEGAL_VERSION } from "@/i18n/jolmod-legal-documents";
import type { SupabaseClient } from "@supabase/supabase-js";

const REQUIRED_DOCUMENT_KEYS = ["terms", "privacy", "personal_data_consent"] as const;

export async function recordRequiredLegalAcceptance({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const rows = REQUIRED_DOCUMENT_KEYS.map((document_key) => ({ user_id: userId, document_key, document_version: JOLMOD_LEGAL_VERSION }));
  const { error } = await supabase.from("legal_document_acceptances").insert(rows);
  return error;
}
